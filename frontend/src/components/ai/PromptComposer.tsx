import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, RotateCcw, Bot, User, Sparkles,
  FileCode2, ChevronDown, ChevronUp, Lightbulb,
} from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import type { ChatMessage, DiagramType } from '../../types/chat';

const QUICK_PROMPTS = [
  'A flowchart for user authentication',
  'Database ERD for an e-commerce app',
  'Microservices architecture diagram',
  'Sequence diagram for OAuth2 flow',
];

interface PromptComposerProps {
  messages: ChatMessage[];
  diagramType: DiagramType | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onRegenerate: () => void;
  onLoadDemo: () => void;
  onShowExamples: () => void;
}

/**
 * PromptComposer — full-featured AI chat interface:
 *  • Quick-prompt chips
 *  • Auto-expanding textarea
 *  • Scrollable message history
 *  • Typing indicator
 */
export const PromptComposer: React.FC<PromptComposerProps> = ({
  messages,
  diagramType,
  isLoading,
  onSendMessage,
  onRegenerate,
  onLoadDemo,
  onShowExamples,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = messages.length === 0;

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /* Auto-expand textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || isLoading) return;
    onSendMessage(t);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (p: string) => {
    setInput(p);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Message list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {isEmpty ? (
          <EmptyState onDemo={onLoadDemo} onExamples={onShowExamples} />
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={msg.id} message={msg} index={i} />
            ))}
            {isLoading && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick prompts (shown when empty) ──────────────────────── */}
      {isEmpty && (
        <div className="px-3 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Quick prompts
          </p>
          <div className="space-y-1">
            {QUICK_PROMPTS.map((p) => (
              <motion.button
                key={p}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: QUICK_PROMPTS.indexOf(p) * 0.06 }}
                whileHover={{ x: 3 }}
                onClick={() => handleQuickPrompt(p)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-start)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }}
              >
                <Lightbulb size={11} className="inline mr-1.5 opacity-70" />
                {p}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input area ────────────────────────────────────────────── */}
      <div
        className="px-3 pt-2 pb-3 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        {/* Diagram type chip + regenerate */}
        {diagramType && messages.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: 'var(--bg-active)',
                color: 'var(--accent-start)',
                border: '1px solid var(--border-accent)',
              }}
            >
              <FileCode2 size={9} />
              {diagramType}
            </span>
            {messages.length >= 2 && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="text-[10px] flex items-center gap-1 transition-colors"
                style={{ color: isLoading ? 'var(--text-disabled)' : 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  if (!isLoading) (e.currentTarget as HTMLElement).style.color = 'var(--accent-start)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = isLoading ? 'var(--text-disabled)' : 'var(--text-muted)';
                }}
              >
                <RotateCcw size={10} />
                Regenerate
              </button>
            )}
          </div>
        )}

        {/* Textarea + Send button */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isEmpty ? 'Describe the diagram you want…' : 'Describe changes…'}
            rows={1}
            className="flex-1 py-2.5 px-3 rounded-xl text-sm leading-relaxed focus:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              maxHeight: 160,
              minHeight: 40,
              fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-start)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(106,92,255,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />

          <AnimatedButton
            variant="primary"
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            title="Send (Enter)"
            className="shrink-0 w-10 h-10"
          >
            <motion.span
              animate={{ rotate: input.trim() ? -30 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="inline-flex"
            >
              <Send size={16} />
            </motion.span>
          </AnimatedButton>
        </div>

        <p className="text-[9px] text-center mt-1.5 select-none" style={{ color: 'var(--text-disabled)' }}>
          <kbd className="px-1 py-px rounded font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>Enter</kbd>
          {' send · '}
          <kbd className="px-1 py-px rounded font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>Shift+Enter</kbd>
          {' newline'}
        </p>
      </div>
    </div>
  );
};

/* ── Sub-components ────────────────────────────────────────────────────────── */

const EmptyState: React.FC<{ onDemo: () => void; onExamples: () => void }> = ({
  onDemo, onExamples,
}) => (
  <div className="flex flex-col items-center justify-center h-28 text-center px-3 gap-3">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-10 h-10 rounded-2xl flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }}
    >
      <Sparkles size={18} color="white" />
    </motion.div>
    <p className="text-xs text-text-muted max-w-[200px] leading-relaxed">
      Describe any diagram and I'll generate it instantly.
    </p>
    <div className="flex gap-2">
      <AnimatedButton variant="ghost" size="xs" onClick={onDemo} subtle>
        Load demo
      </AnimatedButton>
      <AnimatedButton variant="ghost" size="xs" onClick={onExamples} subtle>
        Examples
      </AnimatedButton>
    </div>
  </div>
);

const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-2 animate-message-in">
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
      style={{ background: 'linear-gradient(135deg, var(--accent-start), var(--accent-pink))' }}
    >
      <Sparkles size={11} color="#fff" />
    </div>
    <div
      className="px-3 py-2.5 rounded-xl rounded-tl-sm flex items-center gap-1.5"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
      }}
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

const COLLAPSE_THRESHOLD = 320;

const MessageBubble: React.FC<{ message: ChatMessage; index: number }> = ({ message, index }) => {
  const isUser = message.role === 'user';
  const isLong = message.content.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.2 }}
      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isUser
            ? 'var(--bg-elevated)'
            : 'linear-gradient(135deg, var(--accent-start), var(--accent-pink))',
          border: isUser ? '1px solid var(--border-medium)' : undefined,
        }}
      >
        {isUser
          ? <User size={11} color="var(--text-muted)" />
          : <Bot  size={11} color="#fff" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-3 py-2.5 text-[12.5px] leading-relaxed ${
          isUser ? 'rounded-xl rounded-tr-sm' : 'rounded-xl rounded-tl-sm'
        }`}
        style={{
          background: isUser ? 'var(--bg-active)' : 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          border: `1px solid ${isUser ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
        }}
      >
        <div className="relative">
          <p
            className="whitespace-pre-wrap break-words"
            style={{ maxHeight: isLong && !expanded ? '108px' : 'none', overflow: 'hidden' }}
          >
            {message.content}
          </p>
          {isLong && !expanded && (
            <div
              className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent, ${
                  isUser ? 'rgba(106,92,255,0.12)' : 'var(--bg-elevated)'
                })`,
              }}
            />
          )}
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-[11px] font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--accent-start)' }}
          >
            {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
          </button>
        )}

        <p className="text-[9px] mt-1.5 opacity-50" style={{ color: 'var(--text-muted)' }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};
