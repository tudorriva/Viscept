import React, { useEffect, useRef } from 'react';

interface ChatPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  diagramType: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz';
  onDiagramTypeChange: (type: 'mermaid' | 'plantuml' | 'dbml' | 'graphviz') => void;
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

  // Keyboard shortcut: Ctrl+Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && prompt.trim()) {
        onGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prompt, onGenerate]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 p-4 overflow-hidden">
      <h2 className="text-lg font-bold text-gray-900 mb-3">💬 Prompt</h2>

      {/* Diagram Type Selector */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">Diagram Type:</label>
        <select
          value={diagramType}
          onChange={(e) => onDiagramTypeChange(e.target.value as typeof diagramType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="mermaid">Mermaid (flowchart, sequence, class)</option>
          <option value="dbml">DBML (Entity-Relationship)</option>
          <option value="graphviz">Graphviz (DOT)</option>
        </select>
      </div>

      {/* Prompt Input */}
      <div className="flex-1 flex flex-col min-h-0">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Describe your ${diagramType} diagram in natural language...`}
          className="flex-1 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onGenerate}
          disabled={!prompt.trim() || isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
        >
          {isLoading ? '⏳ Generating...' : '✨ Generate'}
        </button>
        <button
          onClick={onLoadDemo}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-md transition"
          title="Load demo diagrams"
        >
          📁 Demo
        </button>
      </div>

      {/* Keyboard Hint */}
      <p className="text-xs text-gray-500 mt-2 text-center">Ctrl+Enter to send</p>
    </div>
  );
};
