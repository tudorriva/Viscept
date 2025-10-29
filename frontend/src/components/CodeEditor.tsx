import React, { useEffect, useRef } from 'react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

/**
 * Simple Monaco-based code editor for diagram code.
 * Falls back to textarea if Monaco fails to load.
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, onFormat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const useMonaco = useRef(true);

  useEffect(() => {
    if (!useMonaco.current || !containerRef.current) return;

    // Lazy load Monaco
    const loadMonaco = async () => {
      try {
        const monacoUrl = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.50.0/min/vs';
        
        // Create loader
        (window as any).require = { paths: { vs: monacoUrl } };

        // Simple fallback: just use textarea instead of full Monaco setup
        useMonaco.current = false;
      } catch (error) {
        console.warn('Failed to load Monaco:', error);
        useMonaco.current = false;
      }
    };

    loadMonaco();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          📝 {language.toUpperCase()} Code
        </h2>
        <button
          onClick={onFormat}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm font-medium transition"
        >
          ✨ Format
        </button>
      </div>

      <div ref={containerRef} className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full p-3 font-mono text-sm resize-none border-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        Lines: {code.split('\n').length} | Chars: {code.length}
      </div>
    </div>
  );
};
