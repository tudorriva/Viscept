import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { theme } from '../theme';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language = 'mermaid', // ← Add default
  onChange,
  onFormat,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  const getLanguageMode = (lang: string): string => {
    switch (lang) {
      case 'mermaid':
        return 'markdown';
      case 'dbml':
        return 'text';
      case 'graphviz':
        return 'text';
      default:
        return 'text';
    }
  };

  const getEditorLanguage = (): string => {
    const langMap: Record<string, string> = {
      mermaid: 'markdown',
      dbml: 'text',
      graphviz: 'text',
    };
    return langMap[language] || 'text';
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.colors.bg.secondary }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: theme.colors.border.medium }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: `${theme.colors.accent.primary}20` }}
          >
            <span className="text-sm">📝</span>
          </div>
          <div>
            <h2
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: theme.colors.text.primary }}
            >
              {(language || 'text').toUpperCase()} Code
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: theme.colors.text.tertiary }}
            >
              {code.split('\n').length} lines • {code.length} chars
            </p>
          </div>
        </div>
        <button
          onClick={onFormat}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: theme.colors.bg.tertiary,
            color: theme.colors.accent.primary,
            border: `1px solid ${theme.colors.border.medium}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.colors.accent.primary}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
          }}
        >
          ✨ Format
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={getEditorLanguage()}
          value={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 24,
            padding: { top: 16, bottom: 16 },
            renderWhitespace: 'selection',
            wordWrap: 'on',
            bracketPairColorization: {
              enabled: true,
            },
          }}
        />
      </div>

      {/* Footer Stats */}
      <div
        className="px-6 py-3 border-t flex justify-between items-center text-xs font-mono"
        style={{
          borderColor: theme.colors.border.medium,
          backgroundColor: theme.colors.bg.tertiary,
          color: theme.colors.text.tertiary,
        }}
      >
        <span>Lines: {code.split('\n').length}</span>
        <span>Chars: {code.length}</span>
        <span>Words: {code.split(/\s+/).filter((w) => w.length > 0).length}</span>
      </div>
    </div>
  );
};