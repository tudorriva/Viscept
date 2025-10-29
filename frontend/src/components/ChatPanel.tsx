import React, { useEffect, useRef } from 'react';

interface ChatPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  diagramType: 'mermaid' | 'dbml' | 'graphviz';
  onDiagramTypeChange: (type: 'mermaid' | 'dbml' | 'graphviz') => void;
  isLoading: boolean;
  onGenerate: () => void;
  onLoadDemo: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  prompt,
  onPromptChange,
  diagramType,
  onDiagramTypeChange,
  isLoading,
  onGenerate,
  onLoadDemo,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 240) + 'px';
    }
  }, [prompt]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 to-slate-800 p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Viscept</h1>
            <p className="text-xs text-slate-400 mt-1">AI Diagram Generator</p>
          </div>
        </div>
      </div>

      {/* Diagram Type Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-widest">
          📊 Diagram Type
        </label>
        <select
          value={diagramType}
          onChange={(e) => onDiagramTypeChange(e.target.value as typeof diagramType)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-600/50 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium text-slate-100 transition-all hover:border-slate-500"
        >
          <option value="mermaid">📈 Mermaid (Flowchart, Sequence, Class)</option>
          <option value="dbml">🗄️ DBML (Entity-Relationship)</option>
          <option value="graphviz">🔗 Graphviz (Architecture)</option>
        </select>
      </div>

      {/* Prompt Input */}
      <div className="flex-1 flex flex-col min-h-0 mb-4">
        <label className="text-xs font-semibold text-slate-300 mb-2.5 uppercase tracking-widest">
          ✍️ Describe Your Diagram
        </label>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Describe your ${diagramType} diagram in natural language...`}
          className="flex-1 p-4 bg-slate-800 border border-slate-600/50 rounded-lg resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-mono text-slate-100 placeholder-slate-500 transition-all hover:border-slate-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 mb-4">
        <button
          onClick={onGenerate}
          disabled={!prompt.trim() || isLoading}
          className="btn-primary w-full text-sm"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <span>✨</span>
              Generate Diagram
            </>
          )}
        </button>

        <button
          onClick={onLoadDemo}
          className="btn-secondary w-full text-sm"
        >
          <span>📁</span>
          Load Demo
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <p className="text-xs text-slate-400 text-center">
          <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 font-mono text-xs mr-1">Ctrl</kbd>
          <span className="mx-0.5">+</span>
          <kbd className="px-2 py-1 rounded bg-slate-700 text-slate-200 font-mono text-xs">Enter</kbd>
          <span className="ml-2">to generate</span>
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        <p>v1.0.0 • Open Source</p>
      </div>
    </div>
  );
};