import React, { useCallback, useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Eye, AlertCircle, Loader, Pencil, Monitor, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { theme } from '../theme';
import { DiagramEditor } from './DiagramEditor';

interface DiagramPreviewProps {
  code: string;
  language: string;
  /** Callback when the visual editor changes the diagram code */
  onCodeChange?: (newCode: string) => void;
  /** True while the AI is generating / correcting code */
  isGenerating?: boolean;
}

export const DiagramPreview: React.FC<DiagramPreviewProps> = ({ code, language, onCodeChange, isGenerating = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorMode, setEditorMode] = useState<'preview' | 'editor'>('preview');
  const [renderKey, setRenderKey] = useState(0);

  // Zoom / Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });
  const renderIdRef = useRef(0);
  const svgNaturalSize = useRef({ width: 0, height: 0 });

  /** Measure SVG natural size, preserve viewBox, and auto-fit within the viewport. */
  const autoFitSvg = useCallback(() => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl || !viewportRef.current) return;

    // Get natural dimensions from SVG attributes
    let w = parseFloat(svgEl.getAttribute('width') || '0');
    let h = parseFloat(svgEl.getAttribute('height') || '0');
    if (!w) w = parseFloat(svgEl.style.width) || 0;
    if (!h) h = parseFloat(svgEl.style.height) || 0;
    if (!w || !h) {
      try {
        const bbox = svgEl.getBBox();
        w = bbox.x + bbox.width + 10;
        h = bbox.y + bbox.height + 10;
      } catch {
        w = 800; h = 600;
      }
    }

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

    // Calculate zoom to fit within viewport
    const vw = viewportRef.current.clientWidth;
    const vh = viewportRef.current.clientHeight;
    const PAD = 48;
    const fitZoom = Math.max(0.05, Math.min((vw - PAD) / w, (vh - PAD) / h, 1.5));
    const scaledW = w * fitZoom;
    const scaledH = h * fitZoom;

    setZoom(fitZoom);
    setPan({
      x: Math.max(0, (vw - scaledW) / 2),
      y: Math.max(0, (vh - scaledH) / 2),
    });
  }, []);

  useEffect(() => {
    if (!code.trim() || !containerRef.current) {
      setError(null);
      return;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const render = async () => {
      setLoading(true);
      setError(null);

      try {
        if (language === 'mermaid') {
          await renderMermaid();
        } else if (language === 'dbml') {
          await renderDBML();
        } else if (language === 'graphviz') {
          await renderGraphviz();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    render();
  }, [code, language, renderKey]);

  const renderMermaid = async () => {
    if (!containerRef.current) return;

    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    try {
      const id = `mmd-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        autoFitSvg();
      }
    } catch (error) {
      throw new Error(`Mermaid render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderDBML = async () => {
    // Convert DBML to Mermaid ER diagram for rendering
    const mermaidCode = convertDBMLToMermaid(code);
    if (!containerRef.current) return;

    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    try {
      const id = `dbml-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        autoFitSvg();
      }
    } catch (error) {
      throw new Error(`DBML render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderGraphviz = async () => {
    // Convert Graphviz to Mermaid flowchart for rendering
    const mermaidCode = convertGraphvizToMermaid(code);
    if (!containerRef.current) return;

    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    try {
      const id = `gv-${++renderIdRef.current}`;
      const { svg } = await mermaid.render(id, mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        autoFitSvg();
      }
    } catch (error) {
      throw new Error(`Graphviz render failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const convertDBMLToMermaid = (dbml: string): string => {
    // Simple DBML to Mermaid ER conversion
    const tables = dbml.match(/Table\s+(\w+)\s*{([^}]*)}/gi) || [];
    const relationships = dbml.match(/Ref:\s*(\w+)\.(\w+)\s*(<|>)\s*(\w+)\.(\w+)/gi) || [];

    let mermaidCode = 'erDiagram\n';

    tables.forEach((table) => {
      const match = table.match(/Table\s+(\w+)/i);
      if (match) {
        mermaidCode += `  ${match[1]} ||--o{ "Entity" : "contains"\n`;
      }
    });

    return mermaidCode.trim() || 'erDiagram\n  TABLE1 ||--o{ TABLE2 : "relationship"';
  };

  const convertGraphvizToMermaid = (dot: string): string => {
    // Simple Graphviz to Mermaid conversion
    const nodes = dot.match(/\w+\s*\[label="([^"]+)"/gi) || [];
    const edges = dot.match(/(\w+)\s*->\s*(\w+)/gi) || [];

    let mermaidCode = 'flowchart LR\n';

    nodes.forEach((node) => {
      const match = node.match(/(\w+)\s*\[label="([^"]+)"/);
      if (match) {
        mermaidCode += `  ${match[1]}["${match[2]}"]\n`;
      }
    });

    edges.forEach((edge) => {
      const match = edge.match(/(\w+)\s*->\s*(\w+)/);
      if (match) {
        mermaidCode += `  ${match[1]} --> ${match[2]}\n`;
      }
    });

    return mermaidCode.trim() || 'flowchart LR\n  A["Start"] --> B["End"]';
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
    const PAD = 48;
    const fitZoom = Math.max(0.05, Math.min((vw - PAD) / w, (vh - PAD) / h, 1.5));
    const scaledW = w * fitZoom;
    const scaledH = h * fitZoom;
    setZoom(fitZoom);
    setPan({
      x: Math.max(0, (vw - scaledW) / 2),
      y: Math.max(0, (vh - scaledH) / 2),
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800/50 to-slate-900/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-cyan-600/20 flex items-center justify-center">
            {editorMode === 'preview' ? (
              <Eye size={16} color={theme.colors.accent.primary} />
            ) : (
              <Pencil size={16} color={theme.colors.accent.secondary} />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {editorMode === 'preview' ? 'Preview' : 'Visual Editor'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editorMode === 'preview' ? 'Live Rendering' : 'Drag & Drop Editing'}
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
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
      </div>

      {/* Content — both panels stay mounted, visibility toggled */}
      <div className="overflow-hidden" style={{ display: editorMode === 'editor' ? 'flex' : 'none', flex: 1 }}>
        <DiagramEditor
          code={code}
          language={language}
          onCodeChange={onCodeChange || (() => {})}
        />
      </div>

      <div
        ref={viewportRef}
        className="overflow-hidden relative"
        style={{ cursor: 'grab', display: editorMode === 'preview' ? 'flex' : 'none', flex: 1 }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >

        {/* AI Generating / Correcting overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{ backgroundColor: `${theme.colors.bg.primary}e6` }}>
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-transparent animate-spin"
                style={{ borderTopColor: theme.colors.accent.primary, borderRightColor: theme.colors.accent.secondary }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>Generating diagram...</p>
              <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>Auto-correcting if needed</p>
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
          }}
        >
          <div ref={containerRef} style={{ display: 'inline-block' }} />
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