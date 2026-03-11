import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useUIStore } from '../../store/uiStore';
import { PromptComposer } from './PromptComposer';
import { GenerationProgress } from './GenerationProgress';
import { ModelSelector } from './ModelSelector';
import { ValidationResults } from './ValidationResults';
import type { ChatMessage, DiagramType } from '../../types/chat';
import type { ValidationResult } from '../../utils/api';

interface AIPanelProps {
  /* Chat */
  messages: ChatMessage[];
  diagramType: DiagramType | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onRegenerate: () => void;
  onLoadDemo: () => void;
  onShowExamples: () => void;
  /* Model */
  currentModel: string;
  onModelChange: (model: string) => void;
  /* Validation */
  validation: ValidationResult | null;
  isValidating: boolean;
  hasCode: boolean;
  onValidate: () => void;
  onFix?: () => void;
}

/**
 * AIPanel — collapsible right panel (w-80 open / w-0 closed).
 * Contains: ModelSelector header · PromptComposer · GenerationProgress · ValidationResults
 */
export const AIPanel: React.FC<AIPanelProps> = (props) => {
  const {
    messages, diagramType, isLoading,
    onSendMessage, onRegenerate, onLoadDemo, onShowExamples,
    currentModel, onModelChange,
    validation, isValidating, hasCode, onValidate, onFix,
  } = props;

  const open = useUIStore((s) => s.rightPanelOpen);
  const generationPhase = useUIStore((s) => s.generationPhase);
  const generationMessage = useUIStore((s) => s.generationMessage);

  return (
    <motion.div
      animate={{ width: open ? 320 : 0, opacity: open ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 30 }}
      style={{
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="ai-panel-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex flex-col h-full"
            style={{ width: 320 }}
          >
            {/* ── Header ──────────────────────────────────────────── */}
            <div
              className="shrink-0 px-4 py-3 flex items-center justify-between"
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-panel)',
              }}
            >
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: 'var(--text-muted)' }}>
                AI Studio
              </span>
              <ModelSelector value={currentModel} onChange={onModelChange} />
            </div>

            {/* ── Generation progress (conditional) ───────────────── */}
            <AnimatePresence>
              {generationPhase && generationPhase !== 'done' && (
                <motion.div
                  key="gen-progress"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="shrink-0 px-3 py-2"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <GenerationProgress phase={generationPhase} message={generationMessage} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Scrollable body ──────────────────────────────────── */}
            <ScrollArea.Root className="flex-1 min-h-0">
              <ScrollArea.Viewport className="h-full w-full">
                <div className="flex flex-col h-full">
                  {/* PromptComposer fills remaining space */}
                  <div className="flex-1 min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
                    <PromptComposer
                      messages={messages}
                      diagramType={diagramType}
                      isLoading={isLoading}
                      onSendMessage={onSendMessage}
                      onRegenerate={onRegenerate}
                      onLoadDemo={onLoadDemo}
                      onShowExamples={onShowExamples}
                    />
                  </div>
                </div>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex select-none touch-none p-0.5 w-2 transition-colors"
                style={{ background: 'transparent' }}
              >
                <ScrollArea.Thumb
                  className="flex-1 rounded-full relative"
                  style={{ background: 'var(--border-medium)' }}
                />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>

            {/* ── Validation footer ────────────────────────────────── */}
            <div
              className="shrink-0 px-3 py-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <ValidationResults
                validation={validation}
                isValidating={isValidating}
                hasCode={hasCode}
                onValidate={onValidate}
                onFix={onFix}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
