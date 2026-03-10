/**
 * ChatPanel v2.0 — Full conversation interface for chat-based diagram generation.
 *
 * Displays the message history (user + assistant), a message input, and action
 * buttons.  The diagram type is auto-detected on the first message and locked
 * for the duration of the chat.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Send, RotateCcw, BookOpen, Loader, Bot, User } from 'lucide-react';
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
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
      style={{
        background: `linear-gradient(to bottom, ${theme.colors.bg.primary}, ${theme.colors.bg.secondary})`,
      }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-6">
            <div className="mb-2">
              <Wordmark size={20} />
            </div>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              Describe the diagram you want to create. I'll generate it and you can refine it
              through conversation.
            </p>

            {/* Diagram type badge */}
            {diagramType && (
              <div
                className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: `${theme.colors.accent.primary}20`,
                  color: theme.colors.accent.primary,
                  border: `1px solid ${theme.colors.accent.primary}40`,
                }}
              >
                {diagramType}
              </div>
            )}

            {/* Quick actions */}
            <div className="space-y-2 w-full max-w-xs mt-2">
              <button
                onClick={onLoadDemo}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 border"
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
                <Icon name="docs" size={14} />
                Load Demo
              </button>

              <button
                onClick={onShowExamples}
                className="w-full py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 border"
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
                <BookOpen size={14} />
                Examples Gallery
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 px-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              }}
            >
              <Bot size={14} color="#fff" />
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm flex items-center gap-2"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                color: theme.colors.text.secondary,
                border: `1px solid ${theme.colors.border.medium}`,
              }}
            >
              <Loader size={14} className="animate-spin" />
              Generating diagram...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: theme.colors.border.medium }}
      >
        {/* Diagram type indicator */}
        {diagramType && messages.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <div
              className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${theme.colors.accent.primary}15`,
                color: theme.colors.accent.primary,
              }}
            >
              {diagramType}
            </div>
            {messages.length >= 2 && (
              <button
                onClick={onRegenerate}
                disabled={isLoading}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-all"
                style={{
                  color: theme.colors.text.tertiary,
                  opacity: isLoading ? 0.5 : 1,
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
                ? 'Describe a diagram to create...'
                : 'Ask me to modify the diagram...'
            }
            rows={1}
            className="flex-1 p-3 rounded-xl resize-none focus:outline-none text-sm"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
              maxHeight: 160,
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
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl transition-all flex-shrink-0"
            style={{
              background:
                !input.trim() || isLoading
                  ? theme.colors.bg.tertiary
                  : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: !input.trim() || isLoading ? theme.colors.text.muted : '#fff',
              cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isLoading ? 0.6 : 1,
            }}
            title="Send message (Enter)"
          >
            {isLoading ? (
              <Loader size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        <p
          className="text-[10px] text-center mt-2"
          style={{ color: theme.colors.text.muted }}
        >
          <kbd
            className="px-1.5 py-0.5 rounded font-mono text-[10px]"
            style={{
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.tertiary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Enter
          </kbd>
          {' '}to send &nbsp;·&nbsp;{' '}
          <kbd
            className="px-1.5 py-0.5 rounded font-mono text-[10px]"
            style={{
              backgroundColor: theme.colors.bg.primary,
              color: theme.colors.text.tertiary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Shift+Enter
          </kbd>
          {' '}for new line
        </p>
      </div>
    </div>
  );
};

// ── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser
            ? theme.colors.bg.tertiary
            : `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
          border: isUser ? `1px solid ${theme.colors.border.medium}` : undefined,
        }}
      >
        {isUser ? (
          <User size={14} color={theme.colors.text.secondary} />
        ) : (
          <Bot size={14} color="#fff" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'
        }`}
        style={{
          backgroundColor: isUser
            ? `${theme.colors.accent.primary}15`
            : theme.colors.bg.tertiary,
          color: theme.colors.text.primary,
          border: `1px solid ${
            isUser ? `${theme.colors.accent.primary}30` : theme.colors.border.medium
          }`,
        }}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Timestamp */}
        <p
          className="text-[10px] mt-1.5"
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