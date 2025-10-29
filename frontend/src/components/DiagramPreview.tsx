import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { dbmlToMermaid, dbmlToGraphviz } from '../utils/converters';

interface DiagramPreviewProps {
  code: string;
  language: string;
}

/**
 * Renders diagrams based on the language type.
 * Supports: Mermaid, PlantUML (via external server), DBML (converted), Graphviz (converted).
 */
export const DiagramPreview: React.FC<DiagramPreviewProps> = ({ code, language }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (!code.trim() || !containerRef.current) return;

    // Clear previous render
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    const render = async () => {
      setLoading(true);
      setError(null);

      try {
        if (language === 'mermaid') {
          await renderMermaid();
        } else if (language === 'plantuml') {
          await renderPlantUML();
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
  }, [code, language]); // Triggers on EVERY code or language change

  const renderMermaid = async () => {
    if (!containerRef.current) return;

    mermaid.initialize({ startOnLoad: false, theme: 'default' });

    try {
      const { svg } = await mermaid.render('mermaid-diagram', code);
      // Check containerRef again after async operation
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (error) {
      throw new Error(`Mermaid render error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const renderPlantUML = async () => {
    if (!containerRef.current) return;

    try {
      const encodedPlantUML = encodeURI(code);
      const svgUrl = `https://www.plantuml.com/plantuml/svg/${encodedPlantUML}`;

      const response = await fetch(svgUrl);
      const svg = await response.text();
      // Check containerRef again after async operation
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (error) {
      throw new Error(
        `PlantUML render error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const renderDBML = async () => {
    if (!containerRef.current) return;

    try {
      // Convert DBML to Mermaid and render
      const mermaidCode = dbmlToMermaid(code);
      mermaid.initialize({ startOnLoad: false, theme: 'default' });
      const { svg } = await mermaid.render('dbml-as-mermaid', mermaidCode);
      // Check containerRef again after async operation
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (error) {
      throw new Error(
        `DBML render error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const renderGraphviz = async () => {
    if (!containerRef.current) return;

    try {
      // Convert Graphviz to Mermaid or fetch via server
      const mermaidCode = code.startsWith('digraph') || code.startsWith('graph')
        ? convertGraphvizToMermaid(code)
        : code;

      mermaid.initialize({ startOnLoad: false, theme: 'default' });
      const { svg } = await mermaid.render('graphviz-diagram', mermaidCode);
      // Check containerRef again after async operation
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    } catch (error) {
      throw new Error(
        `Graphviz render error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const convertGraphvizToMermaid = (dotCode: string): string => {
    // Simple DOT to Mermaid conversion
    let mermaidCode = 'graph TD\n';
    const lines = dotCode.split('\n');

    for (const line of lines) {
      const edgeMatch = line.match(/(\w+)\s*-[->]\s*(\w+)/);
      if (edgeMatch) {
        const [, from, to] = edgeMatch;
        mermaidCode += `  ${from} --> ${to}\n`;
      }
    }

    return mermaidCode || 'graph TD\n  A --> B';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900">👁️ Preview</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">⏳ Rendering...</p>
        </div>
      )}

      {error && (
        <div className="p-4 m-4 bg-red-100 border border-red-400 rounded text-red-800 text-sm">
          <p className="font-semibold">❌ Render Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-4 bg-white flex items-center justify-center"
        >
          <div className="text-gray-400 text-center">
            <p>📊 Diagram will appear here</p>
            <p className="text-xs mt-1">Generate or paste code to render</p>
          </div>
        </div>
      )}
    </div>
  );
};
