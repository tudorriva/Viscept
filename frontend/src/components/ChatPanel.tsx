/**
 * ChatPanel v2.0 — Professional conversation interface for iterative diagram editing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, BookOpen, Bot, User, Sparkles, FileCode2, ChevronDown, ChevronUp } from 'lucide-react';
import { Icon } from './Icon';
import { Wordmark } from '../assets/logos';
import { theme } from '../theme';
import type { ChatMessage, DiagramType } from '../types/chat';

interface ChatPanelProps {
  messages: ChatMessage[];
  diagramType: DiagramType | null;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onRegenerate: () => void;
  onLoadDemo: () => void;
  onShowExamples: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: theme.colors.bg.primary }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isEmpty ? (
          <EmptyState
            diagramType={diagramType}
            onLoadDemo={onLoadDemo}
            onShowExamples={onShowExamples}
          />
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && <TypingIndicator />}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-3 pt-2 pb-3"
        style={{
          borderTop: `1px solid ${theme.colors.border.medium}`,
          backgroundColor: theme.colors.bg.secondary,
        }}
      >
        {/* Status row */}
        {diagramType && messages.length > 0 && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${theme.colors.accent.primary}10`,
                color: theme.colors.accent.primary,
              }}
            >
              <FileCode2 size={10} />
              {diagramType}
            </div>
            {messages.length >= 2 && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors"
                style={{
                  color: theme.colors.text.muted,
                  opacity: isLoading ? 0.4 : 0.7,
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.color = theme.colors.accent.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.text.muted;
                }}
                title="Regenerate last response"
              >
                <RotateCcw size={10} />
                Regenerate
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty
                ? 'Describe the diagram you want...'
                : 'Describe changes to the diagram...'
            }
            rows={1}
            className="flex-1 py-2.5 px-3 rounded-lg resize-none focus:outline-none text-sm leading-relaxed"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
              maxHeight: 140,
              fontFamily: 'Inter, -apple-system, sans-serif',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.accent.primary;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent.primary}15`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border.medium;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-lg transition-all flex-shrink-0"
            style={{
              background:
                !input.trim() || isLoading
                  ? theme.colors.bg.tertiary
                  : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: !input.trim() || isLoading ? theme.colors.text.muted : '#fff',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isLoading ? 0.5 : 1,
            }}
            title="Send message (Enter)"
          >
            <Send size={16} />
          </button>
        </div>

        <p
          className="text-[9px] text-center mt-1.5 select-none"
          style={{ color: theme.colors.text.muted }}
        >
          <kbd className="px-1 py-px rounded font-mono" style={{ backgroundColor: `${theme.colors.bg.tertiary}80`, border: `1px solid ${theme.colors.border.medium}` }}>
            Enter
          </kbd>
          {' send · '}
          <kbd className="px-1 py-px rounded font-mono" style={{ backgroundColor: `${theme.colors.bg.tertiary}80`, border: `1px solid ${theme.colors.border.medium}` }}>
            Shift+Enter
          </kbd>
          {' new line'}
        </p>
      </div>
    </div>
  );
};

// ── Empty State ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{
  diagramType: DiagramType | null;
  onLoadDemo: () => void;
  onShowExamples: () => void;
}> = ({ diagramType, onLoadDemo, onShowExamples }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-5">
    <div className="mb-1">
      <Wordmark size={18} />
    </div>

    <p className="text-xs leading-relaxed max-w-[240px]" style={{ color: theme.colors.text.tertiary }}>
      Describe the diagram you need and I'll generate it. Then refine it through conversation.
    </p>

    {diagramType && (
      <span
        className="px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider"
        style={{
          backgroundColor: `${theme.colors.accent.primary}10`,
          color: theme.colors.accent.primary,
          border: `1px solid ${theme.colors.accent.primary}25`,
        }}
      >
        {diagramType}
      </span>
    )}

    <div className="flex gap-2 w-full max-w-[240px]">
      <button
        onClick={onLoadDemo}
        className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5"
        style={{
          backgroundColor: theme.colors.bg.tertiary,
          color: theme.colors.text.secondary,
          border: `1px solid ${theme.colors.border.medium}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.accent.secondary;
          e.currentTarget.style.color = theme.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border.medium;
          e.currentTarget.style.color = theme.colors.text.secondary;
        }}
      >
        <Icon name="docs" size={12} />
        Demo
      </button>
      <button
        onClick={onShowExamples}
        className="flex-1 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5"
        style={{
          backgroundColor: theme.colors.bg.tertiary,
          color: theme.colors.text.secondary,
          border: `1px solid ${theme.colors.border.medium}`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.colors.accent.primary;
          e.currentTarget.style.color = theme.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border.medium;
          e.currentTarget.style.color = theme.colors.text.secondary;
        }}
      >
        <BookOpen size={12} />
        Examples
      </button>
    </div>
  </div>
);

// ── Typing Indicator ──────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-2.5 px-1 animate-message-in">
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
      }}
    >
      <Sparkles size={11} color="#fff" />
    </div>
    <div
      className="px-3.5 py-2.5 rounded-xl rounded-tl-sm flex items-center gap-1.5"
      style={{
        backgroundColor: theme.colors.bg.tertiary,
        border: `1px solid ${theme.colors.border.medium}`,
        color: theme.colors.text.muted,
      }}
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  </div>
);

// ── Message Bubble ────────────────────────────────────────────────────────────

const COLLAPSE_THRESHOLD = 300; // chars before we truncate

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isLong = message.content.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);

  const bubbleBg = isUser ? `${theme.colors.accent.primary}12` : theme.colors.bg.tertiary;
  const bubbleBorder = isUser ? `${theme.colors.accent.primary}20` : theme.colors.border.medium;

  return (
    <div className={`flex items-start gap-2.5 px-1 animate-message-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? theme.colors.bg.tertiary
            : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
          border: isUser ? `1px solid ${theme.colors.border.medium}` : undefined,
        }}
      >
        {isUser ? (
          <User size={11} color={theme.colors.text.tertiary} />
        ) : (
          <Bot size={11} color="#fff" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
          isUser ? 'rounded-xl rounded-tr-sm' : 'rounded-xl rounded-tl-sm'
        }`}
        style={{
          backgroundColor: bubbleBg,
          color: theme.colors.text.primary,
          border: `1px solid ${bubbleBorder}`,
        }}
      >
        {/* Collapsible content */}
        <div style={{ position: 'relative' }}>
          <p
            className="whitespace-pre-wrap"
            style={{
              maxHeight: isLong && !expanded ? '108px' : 'none',
              overflow: 'hidden',
            }}
          >
            {message.content}
          </p>
          {/* Fade gradient when collapsed */}
          {isLong && !expanded && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: `linear-gradient(to bottom, transparent, ${bubbleBg})`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Expand / collapse toggle */}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 mt-1.5 text-[11px] font-medium opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: theme.colors.accent.primary }}
          >
            {expanded ? (
              <><ChevronUp size={12} /> Show less</>
            ) : (
              <><ChevronDown size={12} /> Show more</>
            )}
          </button>
        )}

        <p
          className="text-[9px] mt-1 opacity-60"
          style={{ color: theme.colors.text.muted }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
};