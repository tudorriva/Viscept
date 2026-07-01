import React, { useCallback, useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Eye, AlertCircle, Loader, Pencil, Monitor, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { theme } from '../theme';
import { DiagramEditor } from './DiagramEditor';
import { renderDiagram } from '../utils/api';
import { estimateGenerationTimeSeconds } from '../utils/generationTiming';

interface DiagramPreviewProps {
  code: string;
  language: string;
  /** Callback when the visual editor changes the diagram code */
  onCodeChange?: (newCode: string) => void;
  /** True while the AI is generating / correcting code */
  isGenerating?: boolean;
  /** Current prompt text (used to estimate generation time) */
  prompt?: string;
  /** Callback when a render error occurs */
  onRenderError?: (error: string) => void;
  /**
   * When true the Preview/Editor mode toggle is hidden and the component is
   * locked to preview mode.  Pass this when DiagramPreview is embedded inside
   * a parent that already provides its own tab/toggle (e.g. CenterWorkspace).
   */
  hideToggle?: boolean;
}

export const DiagramPreview: React.FC<DiagramPreviewProps> = ({ code, language, onCodeChange, isGenerating = false, prompt = '', hideToggle = false, onRenderError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'preview' | 'editor'>('preview');
  // When the parent hides the toggle (e.g. CenterWorkspace manages tabs itself)
  // always stay in preview mode so the internal editor pane never shows.
  const effectiveMode = hideToggle ? 'preview' : editorMode;
  const [renderKey, setRenderKey] = useState(0);

  // Zoom / Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const renderIdRef = useRef(0);
  const svgNaturalSize = useRef({ width: 0, height: 0 });
  const fitRetryTimerRef = useRef<number | null>(null);
  const renderAbortRef = useRef(0);

  // Generation timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const estimatedTime = estimateGenerationTimeSeconds(prompt, language);

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      return undefined;
    }
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  /** Measure SVG natural size, preserve viewBox, and auto-fit within the viewport. */
  const autoFitSvg = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl || !viewportRef.current) return;

    // Get natural dimensions from SVG attributes or computed style
    let w = parseFloat(svgEl.getAttribute('width') || '0');
    let h = parseFloat(svgEl.getAttribute('height') || '0');
    
    // Try getting from style if attributes are missing or use getBBox as fallback
    if (!w) {
      const styleWidth = svgEl.style?.width;
      if (styleWidth && styleWidth !== '100%') {
        w = parseFloat(styleWidth);
      }
    }
    if (!h) {
      const styleHeight = svgEl.style?.height;
      if (styleHeight && styleHeight !== '100%') {
        h = parseFloat(styleHeight);
      }
    }
    
    // Fallback: use getBBox to measure content
    if (!w || !h || isNaN(w) || isNaN(h)) {
      try {
        const bbox = svgEl.getBBox();
        w = bbox.width + bbox.x + 20;
        h = bbox.height + bbox.y + 20;
      } catch {
        w = 800; h = 600;
      }
    }
    
    // Ensure minimum dimensions
    w = Math.max(w || 800, 100);
    h = Math.max(h || 600, 100);

    svgNaturalSize.current = { width: w, height: h };

    // Ensure viewBox exists
    if (!svgEl.getAttribute('viewBox')) {
      svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    // Keep natural pixel dimensions
    svgEl.setAttribute('width', String(w));
    svgEl.setAttribute('height', String(h));
    svgEl.removeAttribute('style');
    svgEl.style.display = 'block';
    svgEl.style.overflow = 'visible';
    svgEl.style.maxWidth = 'none';
    svgEl.style.maxHeight = 'none';
    svgEl.style.width = String(w) + 'px';
    svgEl.style.height = String(h) + 'px';

    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const padding = 48;
    const fitScale = Math.max(
      0.25,
      Math.min(1, (vw - padding) / w, (vh - padding) / h)
    );

    setZoom(fitScale);
    setPan({
      x: (vw - w * fitScale) / 2,
      y: (vh - h * fitScale) / 2,
    });
  }, []);

  /** Schedule a delayed fit so fonts and layout can settle on first render. */
  const scheduleAutoFit = useCallback(() => {
    if (fitRetryTimerRef.current !== null) {
      window.clearTimeout(fitRetryTimerRef.current);
    }

    fitRetryTimerRef.current = window.setTimeout(() => {
      const run = async () => {
        try {
          if (typeof document !== 'undefined' && 'fonts' in document) {
            await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
          }
        } catch {
          // Ignore font-loading failures and fall back to DOM measurements.
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        autoFitSvg();

        // Retry once more after the browser has fully painted the SVG.
        window.setTimeout(() => autoFitSvg(), 80);
      };

      void run();
    }, 0);
  }, [autoFitSvg]);

  /** Normalize Mermaid SVG output so labels don't render with opaque white boxes. */
  const normalizeMermaidSvg = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;

    svgEl.querySelectorAll('g.edgeLabel rect, g.edgeLabel foreignObject, g.label rect, g.label foreignObject')
      .forEach((el) => {
        if (el instanceof SVGElement) {
          el.setAttribute('fill', 'transparent');
          el.setAttribute('stroke', 'none');
        }
        if (el instanceof HTMLElement) {
          el.style.background = 'transparent';
        }
      });

    svgEl.querySelectorAll('rect').forEach((rect) => {
      const cls = rect.getAttribute('class') || '';
      const fill = (rect.getAttribute('fill') || '').toLowerCase();
      if (/label|edge/i.test(cls) || fill === '#fff' || fill === '#ffffff' || fill === 'white') {
        rect.setAttribute('fill', 'transparent');
        rect.setAttribute('stroke', 'none');
      }
    });
  }, []);

  useEffect(() => {
    const abortId = ++renderAbortRef.current;

    if (!code.trim() || !containerRef.current) {
      setError(null);
      // Clear stale diagram when code becomes empty (e.g. diagram type switch)
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const render = async () => {
      setLoading(true);
      setError(null);

      try {
        if (typeof document !== 'undefined' && 'fonts' in document) {
          await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
        }

        if (renderAbortRef.current !== abortId) return;

        if (language === 'mermaid') {
          await renderMermaid();
        } else if (language === 'dbml') {
          await renderDBML();
        } else if (language === 'graphviz') {
          await renderGraphviz();
        } else if (language === 'plantuml') {
          await renderPlantUML();
        }
      } catch (err) {
        if (renderAbortRef.current !== abortId) return;
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        onRenderError?.(errorMsg);
      } finally {
        if (renderAbortRef.current !== abortId) return;
        setLoading(false);
      }
    };

    render();
  }, [code, language, renderKey]);

  const renderMermaid = async () => {
    if (!containerRef.current) return;

    mermaid.initialize({ 
      startOnLoad: false, 
      theme: 'dark',
      securityLevel: 'loose',
      flowchart: { useMaxWidth: false, htmlLabels: false },
      themeVariables: {
        edgeLabelBackground: 'transparent',
        background: 'transparent',
      },
    });

    try {
      const id = `mmd-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        normalizeMermaidSvg();
        scheduleAutoFit();
      }
    } catch (error) {
      throw new Error(`Mermaid render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderDBML = async () => {
    // Convert DBML to Mermaid ER diagram for rendering
    const mermaidCode = convertDBMLToMermaid(code);
    if (!containerRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        edgeLabelBackground: 'transparent',
        background: 'transparent',
      },
    });

    try {
      const id = `dbml-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        normalizeMermaidSvg();
        scheduleAutoFit();
      }
    } catch (error) {
      throw new Error(`DBML render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderGraphviz = async () => {
    // Convert Graphviz to Mermaid flowchart for rendering
    const mermaidCode = convertGraphvizToMermaid(code);
    if (!containerRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        edgeLabelBackground: 'transparent',
        background: 'transparent',
      },
    });

    try {
      const id = `gv-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        normalizeMermaidSvg();
        scheduleAutoFit();
      }
    } catch (error) {
      throw new Error(`Graphviz render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderPlantUML = async () => {
    if (!containerRef.current) return;

    try {
      const result = await renderDiagram({
        code,
        diagramType: 'plantuml',
        format: 'svg',
        themeMode: 'dark',
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = result.svg;
        scheduleAutoFit();
      }
    } catch (error) {
      throw new Error(`PlantUML render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      if (code.trim() && effectiveMode === 'preview') {
        scheduleAutoFit();
      }
    });

    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [code, effectiveMode, scheduleAutoFit]);

  useEffect(() => {
    return () => {
      if (fitRetryTimerRef.current !== null) {
        window.clearTimeout(fitRetryTimerRef.current);
      }
    };
  }, []);

  const convertDBMLToMermaid = (dbml: string): string => {
    const lines = ['erDiagram'];
    const tableNames: string[] = [];
    const tableFields = new Map<string, string[]>(); // tableName → field lines
    const refs: string[] = [];

    // ── 1. Parse all Table blocks ──────────────────────────────────────────

    const tables = dbml.match(/Table\s+(\w+)\s*\{([^}]*)\}/gi) || [];

    for (const table of tables) {
      const nameMatch = table.match(/Table\s+(\w+)/i);
      if (!nameMatch) continue;
      const tableName = nameMatch[1];
      tableNames.push(tableName);

      const bodyMatch = table.match(/\{([^}]*)\}/);
      if (!bodyMatch) continue;

      const fieldLines: string[] = [];
      const rawFields = bodyMatch[1]
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f && !f.startsWith('//') && !f.startsWith('indexes') && !f.startsWith('Note'));

      lines.push(`  ${tableName} {`);
      for (const field of rawFields) {
        // Skip index/constraint-only lines
        if (/^\(/.test(field) || /^primary\b/i.test(field) || /^unique\b/i.test(field)) continue;

        // Extract field attributes before cleaning
        const isPK = /\[.*pk.*\]/i.test(field) || /\[.*primary\s*key.*\]/i.test(field);
        const isFK = /\[.*ref.*\]/i.test(field);

        // Clean the field text
        const clean = field.replace(/\[.*?\]/g, '').trim();
        if (!clean) continue;
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
          const fName = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
          const fType = parts[1].replace(/[(),]/g, '_').replace(/_+/g, '_').replace(/_$/g, '').replace(/[^a-zA-Z0-9_]/g, '');
          if (fName && fType) {
            // Add PK/FK markers for Mermaid ER
            const marker = isPK ? ' PK' : isFK ? ' FK' : '';
            lines.push(`    ${fType} ${fName}${marker}`);
          }
        }

        fieldLines.push(field);

        // Inline refs: [ref: > users.id] or [ref: < orders.product_id]
        const refMatch = field.match(/\[ref:\s*([><-])\s*(\w+)\.(\w+)\]/i);
        if (refMatch) {
          const [, dir, refTable] = refMatch;
          if (dir === '>') {
            refs.push(`  ${tableName} }o--|| ${refTable} : "references"`);
          } else if (dir === '<') {
            refs.push(`  ${refTable} }o--|| ${tableName} : "references"`);
          } else {
            refs.push(`  ${tableName} ||--|| ${refTable} : "references"`);
          }
        }
      }
      lines.push('  }');
      tableFields.set(tableName.toLowerCase(), fieldLines);
    }

    // ── 2. Standalone Ref declarations ─────────────────────────────────────

    // Single-line: Ref: posts.user_id > users.id
    const standaloneRefs = dbml.match(/Ref[^{]*:\s*(\w+)\.(\w+)\s*[<>-]+\s*(\w+)\.(\w+)/gi) || [];
    for (const ref of standaloneRefs) {
      const m = ref.match(/(\w+)\.\w+\s*([<>-]+)\s*(\w+)\.\w+/i);
      if (m) {
        const [, left, dir, right] = m;
        if (dir.includes('>')) refs.push(`  ${left} }o--|| ${right} : "references"`);
        else if (dir.includes('<')) refs.push(`  ${right} }o--|| ${left} : "references"`);
        else refs.push(`  ${left} ||--|| ${right} : "references"`);
      }
    }

    // Multi-line Ref blocks: Ref { posts.user_id > users.id }
    const refBlocks = dbml.match(/Ref\s*(?:\w+\s*)?\{([^}]*)\}/gi) || [];
    for (const block of refBlocks) {
      const bodyMatch = block.match(/\{([^}]*)\}/);
      if (!bodyMatch) continue;
      const refLines = bodyMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
      for (const rl of refLines) {
        const m = rl.match(/(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)/);
        if (m) {
          const [, left, , dir, right] = m;
          if (dir.includes('>')) refs.push(`  ${left} }o--|| ${right} : "references"`);
          else if (dir.includes('<')) refs.push(`  ${right} }o--|| ${left} : "references"`);
          else refs.push(`  ${left} ||--|| ${right} : "references"`);
        }
      }
    }

    // ── 3. Infer relationships from _id / _fk naming convention ────────────

    const lowerTableNames = tableNames.map((t) => t.toLowerCase());
    for (const tableName of tableNames) {
      const fields = tableFields.get(tableName.toLowerCase()) || [];
      for (const field of fields) {
        const clean = field.replace(/\[.*?\]/g, '').trim();
        const parts = clean.split(/\s+/);
        if (parts.length < 2) continue;
        const fName = parts[0].toLowerCase();

        // Already has an explicit ref? skip
        if (/\[ref:/i.test(field)) continue;

        // Pattern: ends with _id or _fk, e.g. user_id → users / user
        const fkMatch = fName.match(/^(\w+?)_(?:id|fk)$/);
        if (fkMatch) {
          const baseName = fkMatch[1];
          // Try to find a matching table: "users" or "user"
          const targetIdx = lowerTableNames.findIndex(
            (t) => t === baseName || t === baseName + 's' || t + 's' === baseName
          );
          if (targetIdx !== -1) {
            const targetTable = tableNames[targetIdx];
            // Only add if this ref pair doesn't already exist
            const key = `${tableName}|${targetTable}`;
            const reverseKey = `${targetTable}|${tableName}`;
            const alreadyExists = refs.some(
              (r) => (r.includes(tableName) && r.includes(targetTable))
            );
            if (!alreadyExists) {
              refs.push(`  ${tableName} }o--|| ${targetTable} : "${fName}"`);
            }
          }
        }
      }
    }

    // ── 4. Deduplicate and add refs ────────────────────────────────────────

    for (const ref of [...new Set(refs)]) {
      lines.push(ref);
    }

    const result = lines.join('\n');
    return result.trim() || 'erDiagram\n  TABLE1 ||--o{ TABLE2 : "relationship"';
  };

  const convertGraphvizToMermaid = (dot: string): string => {
    const dotLines = dot.split('\n').map((l) => l.trim()).filter(Boolean);
    const nodeLabels = new Map<string, string>();
    const edgeList: { src: string; tgt: string; label?: string; direction?: string }[] = [];
    const nodeIds = new Set<string>();

    for (const dl of dotLines) {
      // Skip directives
      if (/^(strict\s+)?(di)?graph\b/i.test(dl)) continue;
      if (dl === '{' || dl === '}') continue;
      if (/^(rankdir|node|edge|graph|label|fontname|fontsize|size)\b/i.test(dl)) continue;
      if (/^\/\//.test(dl)) continue;

      // Edges: A -> B [label="text", dir=back]
      const edgeMatch = dl.match(/["']?(\w+)["']?\s*(-[->])\s*["']?(\w+)["']?\s*(?:\[([^\]]*)\])?/);
      if (edgeMatch) {
        const [, src, arrowOp, tgt, attrs] = edgeMatch;
        nodeIds.add(src);
        nodeIds.add(tgt);
        let edgeLabel: string | undefined;
        let direction = arrowOp === '--' ? 'none' : 'forward';
        
        if (attrs) {
          const lm = attrs.match(/label\s*=\s*"([^"]*)"/);
          if (lm) edgeLabel = lm[1];
          const dm = attrs.match(/dir\s*=\s*(forward|back|both|none)/);
          if (dm) direction = dm[1];
        }
        edgeList.push({ src, tgt, label: edgeLabel, direction });
        continue;
      }

      // Node: A [label="Start"]
      const nodeMatch = dl.match(/["']?(\w+)["']?\s*\[([^\]]*)\]/);
      if (nodeMatch) {
        const [, nId, attrs] = nodeMatch;
        nodeIds.add(nId);
        const lm = attrs.match(/label\s*=\s*"([^"]*)"/);
        if (lm) nodeLabels.set(nId, lm[1]);
      }
    }

    let mermaidCode = 'flowchart TB\n';

    for (const nId of nodeIds) {
      const label = nodeLabels.get(nId) || nId;
      mermaidCode += `  ${nId}["${label}"]\n`;
    }

    for (const { src, tgt, label, direction } of edgeList) {
      let arrow = '-->';
      let realSrc = src;
      let realTgt = tgt;

      if (direction === 'none') {
        arrow = '---';
      } else if (direction === 'both') {
        arrow = '<-->';
      } else if (direction === 'back') {
        // Swap source and target for reverse edge if Mermaid doesn't strictly support <--
        realSrc = tgt;
        realTgt = src;
        arrow = '-->';
      }

      if (label) {
        mermaidCode += `  ${realSrc} ${arrow}|${label}| ${realTgt}\n`;
      } else {
        mermaidCode += `  ${realSrc} ${arrow} ${realTgt}\n`;
      }
    }

    return mermaidCode.trim() || 'flowchart TB\n  A["Start"] --> B["End"]';
  };

  // ── Zoom / Pan handlers ────────────────────────────────────────────────

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(0.2, z + delta), 5));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with left-click (middle-click also ok)
    if (e.button !== 0 && e.button !== 1) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOffset.current = { ...pan };
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panOffset.current.x + dx, y: panOffset.current.y + dy });
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  }, []);

  const handleFitView = useCallback(() => {
    const { width: w, height: h } = svgNaturalSize.current;
    if (!w || !h || !viewportRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const padding = 48;
    const fitScale = Math.max(
      0.25,
      Math.min(1, (vw - padding) / w, (vh - padding) / h)
    );
    setZoom(fitScale);
    setPan({
      x: (vw - w * fitScale) / 2,
      y: (vh - h * fitScale) / 2,
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800/50 to-slate-900/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-cyan-600/20 flex items-center justify-center">
          {effectiveMode === 'preview' ? (
              <Eye size={16} color={theme.colors.accent.primary} />
            ) : (
              <Pencil size={16} color={theme.colors.accent.secondary} />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {effectiveMode === 'preview' ? 'Preview' : 'Visual Editor'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {effectiveMode === 'preview' ? 'Live Rendering' : 'Drag & Drop Editing'}
            </p>
          </div>
        </div>

        {/* Mode Toggle — hidden when the parent manages tab switching */}
        {!hideToggle && (
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
        >
          <button
            onClick={() => { setEditorMode('preview'); setRenderKey(k => k + 1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: editorMode === 'preview' ? theme.colors.accent.primary : 'transparent',
              color: editorMode === 'preview' ? '#fff' : theme.colors.text.secondary,
            }}
            title="Static preview"
          >
            <Monitor size={13} />
            Preview
          </button>
          <button
            onClick={() => setEditorMode('editor')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: editorMode === 'editor' ? theme.colors.accent.secondary : 'transparent',
              color: editorMode === 'editor' ? '#fff' : theme.colors.text.secondary,
            }}
            title="Interactive visual editor"
          >
            <Pencil size={13} />
            Editor
          </button>
        </div>
        )}
      </div>

      {/* Content — both panels stay mounted, visibility toggled */}
      <div className="overflow-hidden" style={{ display: effectiveMode === 'editor' ? 'flex' : 'none', flex: 1 }}>
        <DiagramEditor
          code={code}
          language={language}
          onCodeChange={onCodeChange || (() => {})}
        />
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden relative"
        style={{ cursor: 'grab', display: effectiveMode === 'preview' ? 'flex' : 'none', flex: 1 }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {/* AI Generating / Correcting overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5"
            style={{ backgroundColor: `${theme.colors.bg.primary}e6` }}>
            {/* Animated spinner — Tailwind animate-spin on wrapper div */}
            <div className="animate-spin" style={{ width: 64, height: 64 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke={theme.colors.border.medium} strokeWidth="4" opacity="0.2" />
                <circle
                  cx="32" cy="32" r="28" fill="none"
                  strokeWidth="4" strokeLinecap="round"
                  stroke={`url(#spinner-gradient)`}
                  strokeDasharray="90 90"
                />
                <defs>
                  <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={theme.colors.accent.primary} />
                    <stop offset="100%" stopColor={theme.colors.accent.secondary} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>Generating diagram...</p>
              <p className="text-xs mt-1.5" style={{ color: theme.colors.text.tertiary }}>
                {elapsedSeconds >= estimatedTime ? 'Taking longer than anticipated...' : 'Auto-correcting if needed'}
              </p>
              {/* Elapsed / estimated timer */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <div
                  className="text-xs font-mono px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.secondary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  {elapsedSeconds >= estimatedTime ? `${elapsedSeconds}s` : `${elapsedSeconds}s / ~${estimatedTime}s`}
                </div>
                {/* Progress bar */}
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ width: 80, backgroundColor: theme.colors.bg.tertiary }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${elapsedSeconds >= estimatedTime ? 100 : Math.min(95, (elapsedSeconds / estimatedTime) * 100)}%`,
                      background: `linear-gradient(90deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && !isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader size={28} className="animate-spin" color={theme.colors.text.secondary} />
            <p className="text-sm font-medium">Rendering diagram...</p>
          </div>
        )}

        {error && !isGenerating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30 max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} color="#ef4444" />
                <p className="text-sm font-semibold text-red-400">Render Error</p>
              </div>
              <p className="text-xs text-red-300 font-mono">{error}</p>
            </div>
          </div>
        )}

        {!code.trim() && !loading && !error && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Eye size={48} color={theme.colors.text.secondary} className="mb-4 opacity-50" />
              <p className="text-slate-400 text-sm">Generate or paste code to render</p>
            </div>
          </div>
        )}

        {/* Zoomable / Pannable diagram container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning.current ? 'none' : 'transform 0.15s ease-out',
            position: 'absolute',
            top: 0,
            left: 0,
            width: 'max-content',
            height: 'max-content',
            minWidth: '100%',
            minHeight: '100%',
          }}
        >
          <div 
            ref={containerRef} 
            data-diagram-language={language}
            style={{ 
              display: 'inline-block',
              whiteSpace: 'pre',
              minWidth: 'max-content',
              minHeight: 'max-content',
            }} 
          />
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
            className="p-2 rounded-md transition-all hover:scale-105"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              color: theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
            className="p-2 rounded-md transition-all hover:scale-105"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              color: theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={handleFitView}
            className="p-2 rounded-md transition-all hover:scale-105"
            style={{
              backgroundColor: theme.colors.bg.secondary,
              color: theme.colors.text.secondary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
            title="Fit to View"
          >
            <Maximize size={14} />
          </button>
        </div>

        {/* Zoom indicator */}
        <div
          className="absolute bottom-4 left-4 z-10 text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: `${theme.colors.bg.secondary}cc`,
            color: theme.colors.text.tertiary,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>

        </div>
    </div>
  );
};
