import React from 'react';
import { motion } from 'framer-motion';
import { Wand2, WrapText } from 'lucide-react';
import { CodeEditor } from '../CodeEditor';
import { AnimatedButton } from '../ui/AnimatedButton';

interface CodePanelProps {
  code: string;
  language: string;
  onChange: (code: string) => void;
  onFormat: () => void;
}

/**
 * CodePanel — styled wrapper around the existing Monaco CodeEditor.
 * Adds a top toolbar with action buttons.
 */
export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  language,
  onChange,
  onFormat,
}) => {
  return (
    <motion.div
      className="flex flex-col h-full w-full overflow-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            {language.toUpperCase()}
          </span>
          {code.trim() && (
            <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
              {code.split('\n').length} lines
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={onFormat}
            disabled={!code.trim()}
            subtle
            className="text-text-muted hover:text-text-primary"
          >
            <Wand2 size={13} />
            Format
          </AnimatedButton>
        </div>
      </div>

      {/* Editor — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          code={code}
          language={language}
          onChange={onChange}
          onFormat={onFormat}
        />
      </div>
    </motion.div>
  );
};
