import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface DiagramPreviewProps {
  code: string;
  language: string;
}

export const DiagramPreview: React.FC<DiagramPreviewProps> = ({ code, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, [code, language]);

  const renderMermaid = async () => {
    if (!containerRef.current) return;

    mermaid.initialize({ startOnLoad: false, theme: 'dark' });

    try {
      const { svg } = await mermaid.render('mermaid-diagram', code);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
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
      const { svg } = await mermaid.render('dbml-diagram', mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
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
      const { svg } = await mermaid.render('graphviz-diagram', mermaidCode);
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800/50 to-slate-900/50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-green-500/20 to-cyan-600/20 flex items-center justify-center">
            <span className="text-sm">👁️</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Preview</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live Rendering</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-6">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="animate-spin text-3xl">⏳</div>
            <p className="text-sm font-medium">Rendering diagram...</p>
          </div>
        )}

        {error && (
          <div className="p-6 rounded-lg bg-red-900/20 border border-red-500/30 max-w-md">
            <p className="text-sm font-semibold text-red-400 mb-2">❌ Render Error</p>
            <p className="text-xs text-red-300 font-mono">{error}</p>
          </div>
        )}

        {!code.trim() && !loading && !error && (
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-50">📊</div>
            <p className="text-slate-400 text-sm">Generate or paste code to render</p>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
        />
      </div>
    </div>
  );
};