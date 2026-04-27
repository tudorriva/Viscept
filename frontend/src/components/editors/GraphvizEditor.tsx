import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Wand2 } from 'lucide-react';
import { theme } from '../../theme';

interface GraphvizEditorProps {
  code: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

export const GraphvizEditor: React.FC<GraphvizEditorProps> = ({
  code,
  onChange,
  onFormat,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
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
            <Wand2 size={16} color={theme.colors.accent.primary} />
          </div>
          <div>
            <h2
              className="text-sm font-bold uppercase tracking-wide"
              style={{ color: theme.colors.text.primary }}
            >
              Graphviz DOT Code
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
          className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
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
          <Wand2 size={14} />
          Format
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="dot"
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
            wordWrap: 'on',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'keep',
            formatOnPaste: true,
            'bracketPairColorization.enabled': true,
          }}
        />
      </div>

      {/* Helper Text */}
      <div
        className="px-6 py-3 border-t text-xs"
        style={{ borderColor: theme.colors.border.medium, color: theme.colors.text.tertiary }}
      >
        💡 Tip: Use 'digraph' for directed graphs or 'graph' for undirected graphs. Syntax: {'{'}  node1 -&gt; node2;  {'}'}
      </div>
    </div>
  );
};
