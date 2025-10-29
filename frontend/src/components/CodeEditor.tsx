import React, { useEffect, useRef } from 'react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onChange,
  onFormat,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
            <span className="text-sm">📝</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {language.toUpperCase()} Code
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{code.split('\n').length} lines</p>
          </div>
        </div>
        <button
          onClick={onFormat}
          className="btn-secondary text-xs px-3 py-2"
        >
          ✨ Format
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden flex">
        {/* Line Numbers */}
        <div className="bg-slate-900/50 border-r border-slate-700/30 px-3 py-4 text-right text-slate-600 font-mono text-xs select-none overflow-y-auto">
          {code.split('\n').map((_, i) => (
            <div key={i} className="h-6 leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Input */}
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 p-4 bg-slate-800 font-mono text-sm text-slate-100 placeholder-slate-600 resize-none border-none focus:outline-none"
          spellCheck={false}
          placeholder={`// Enter or paste ${language.toUpperCase()} code here...`}
        />
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-2 bg-slate-900/50 border-t border-slate-700/50 flex justify-between items-center text-xs text-slate-500 font-mono">
        <span>Lines: {code.split('\n').length}</span>
        <span>Chars: {code.length}</span>
        <span>Words: {code.split(/\s+/).filter(w => w.length > 0).length}</span>
      </div>
    </div>
  );
};