import React, { useEffect, useRef } from 'react';
import { Send, Zap, BookOpen } from 'lucide-react';
import { Icon } from './Icon';
import { theme } from '../theme';

interface ChatPanelProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  diagramType: 'mermaid' | 'dbml' | 'graphviz';
  onDiagramTypeChange: (type: 'mermaid' | 'dbml' | 'graphviz') => void;
  isLoading: boolean;
  onGenerate: () => void;
  onLoadDemo: () => void;
  onShowExamples: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  prompt,
  onPromptChange,
  diagramType,
  onDiagramTypeChange,
  isLoading,
  onGenerate,
  onLoadDemo,
  onShowExamples,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 240) + 'px';
    }
  }, [prompt]);

  return (
    <div
      className="flex flex-col h-full p-6 overflow-y-auto"
      style={{
        background: `linear-gradient(to bottom, ${theme.colors.bg.primary}, ${theme.colors.bg.secondary})`,
      }}
    >
      {/* Header */}
      <div className="mb-8 pb-6 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
            }}
          >
            <span className="text-xl font-bold">V</span>
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: theme.colors.text.primary }}
            >
              Viscept
            </h1>
            <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
              AI Diagram Studio
            </p>
          </div>
        </div>
      </div>

      {/* Diagram Type Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold mb-2.5 uppercase tracking-widest" style={{ color: theme.colors.text.secondary }}>
          Diagram Type
        </label>
        <select
          value={diagramType}
          onChange={(e) => onDiagramTypeChange(e.target.value as typeof diagramType)}
          className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all focus:outline-none"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            borderColor: theme.colors.border.medium,
            color: theme.colors.text.primary,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent.primary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border.medium;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="mermaid">Mermaid (Flowchart, Sequence, Class)</option>
          <option value="dbml">DBML (Entity-Relationship)</option>
          <option value="graphviz">Graphviz (Architecture)</option>
        </select>
      </div>

      {/* Prompt Input */}
      <div className="flex-1 flex flex-col min-h-0 mb-4">
        <label className="text-xs font-semibold mb-2.5 uppercase tracking-widest" style={{ color: theme.colors.text.secondary }}>
          Describe Your Diagram
        </label>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={`Describe your ${diagramType} diagram in natural language...`}
          className="flex-1 p-4 rounded-lg resize-none focus:outline-none transition-all font-mono text-sm"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.medium,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent.primary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = theme.colors.border.medium;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 mb-4">
        <button
          onClick={onGenerate}
          disabled={!prompt.trim() || isLoading}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: !prompt.trim() || isLoading 
              ? theme.colors.bg.tertiary 
              : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
            color: !prompt.trim() || isLoading ? theme.colors.text.secondary : '#fff',
            cursor: !prompt.trim() || isLoading ? 'not-allowed' : 'pointer',
            opacity: !prompt.trim() || isLoading ? 0.6 : 1,
          }}
        >
          {isLoading ? (
            <>
              <Icon name="loading" size={16} color="currentColor" />
              Generating...
            </>
          ) : (
            <>
              <Zap size={16} />
              Generate Diagram
            </>
          )}
        </button>

        <button
          onClick={onLoadDemo}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.medium,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.colors.accent.secondary}20`;
            e.currentTarget.style.borderColor = theme.colors.accent.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            e.currentTarget.style.borderColor = theme.colors.border.medium;
          }}
        >
          <Icon name="docs" size={16} />
          Load Demo
        </button>

        <button
          onClick={onShowExamples}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.text.primary,
            borderColor: theme.colors.border.medium,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
            e.currentTarget.style.borderColor = theme.colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            e.currentTarget.style.borderColor = theme.colors.border.medium;
          }}
        >
          <BookOpen size={16} />
          Examples Gallery
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="p-3 rounded-lg border" style={{ 
        backgroundColor: theme.colors.bg.tertiary,
        borderColor: theme.colors.border.medium 
      }}>
        <p className="text-xs text-center" style={{ color: theme.colors.text.tertiary }}>
          <kbd
            className="px-2 py-1 rounded font-mono text-xs mr-1"
            style={{
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Ctrl
          </kbd>
          <span className="mx-0.5">+</span>
          <kbd
            className="px-2 py-1 rounded font-mono text-xs"
            style={{
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Enter
          </kbd>
          <span className="ml-2">to generate</span>
        </p>
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t text-xs text-center" style={{ 
        borderColor: theme.colors.border.medium,
        color: theme.colors.text.tertiary 
      }}>
        <p>v1.0.0 • Open Source</p>
      </div>
    </div>
  );
};