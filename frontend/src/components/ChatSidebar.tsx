/**
 * ChatSidebar v2.0 — Lists all chat sessions with create / rename / delete
 * actions.  Replaces the old ProjectSidebar.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import { Wordmark } from '../assets/logos';
import { theme } from '../theme';
import type { ChatSessionMeta } from '../types/chat';

interface ChatSidebarProps {
  chatList: ChatSessionMeta[];
  activeChatId: string | null;
  onCreateChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chatList,
  activeChatId,
  onCreateChat,
  onOpenChat,
  onDeleteChat,
  onRenameChat,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameChat(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  // Group chats: today / last 7 days / older
  const grouped = groupChats(chatList);

  return (
    <div
      className="w-64 border-r flex flex-col"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: theme.colors.border.medium }}>
        <div className="mb-3">
          <Wordmark size={18} />
        </div>
        <button
          onClick={onCreateChat}
          className="w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border"
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
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chatList.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare
              size={32}
              className="mx-auto mb-3"
              style={{ color: theme.colors.text.muted }}
            />
            <p className="text-sm" style={{ color: theme.colors.text.tertiary }}>
              No chats yet
            </p>
            <p className="text-xs mt-1" style={{ color: theme.colors.text.muted }}>
              Start a new conversation to create a diagram
            </p>
          </div>
        ) : (
          <div className="py-2">
            {grouped.map(({ label, items }) =>
              items.length > 0 ? (
                <div key={label} className="mb-2">
                  <h3
                    className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: theme.colors.text.muted }}
                  >
                    {label}
                  </h3>

                  {items.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    const isRenaming = renamingId === chat.id;

                    return (
                      <div
                        key={chat.id}
                        onClick={() => !isRenaming && onOpenChat(chat.id)}
                        className="mx-2 px-3 py-2 rounded-lg cursor-pointer transition-all group flex items-center gap-2"
                        style={{
                          backgroundColor: isActive
                            ? `${theme.colors.accent.primary}15`
                            : 'transparent',
                          borderLeft: isActive
                            ? `3px solid ${theme.colors.accent.primary}`
                            : '3px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <MessageSquare
                          size={14}
                          className="flex-shrink-0"
                          style={{
                            color: isActive
                              ? theme.colors.accent.primary
                              : theme.colors.text.tertiary,
                          }}
                        />

                        {isRenaming ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              ref={renameRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') cancelRename();
                              }}
                              className="flex-1 px-1 py-0.5 rounded text-xs focus:outline-none"
                              style={{
                                backgroundColor: theme.colors.bg.primary,
                                color: theme.colors.text.primary,
                                border: `1px solid ${theme.colors.accent.primary}`,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                commitRename();
                              }}
                              className="p-0.5 rounded"
                            >
                              <Check size={12} color={theme.colors.accent.primary} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelRename();
                              }}
                              className="p-0.5 rounded"
                            >
                              <X size={12} color={theme.colors.text.tertiary} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs font-medium truncate"
                                style={{
                                  color: isActive
                                    ? theme.colors.text.primary
                                    : theme.colors.text.secondary,
                                }}
                              >
                                {chat.title}
                              </p>
                              <p
                                className="text-[10px] mt-0.5"
                                style={{ color: theme.colors.text.muted }}
                              >
                                {chat.diagramType?.toUpperCase() ?? 'NEW'} ·{' '}
                                {formatRelativeTime(chat.updatedAt)}
                              </p>
                            </div>

                            {/* Action buttons (visible on hover) */}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(chat.id, chat.title);
                                }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title="Rename"
                              >
                                <Pencil size={12} color={theme.colors.text.tertiary} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteChat(chat.id);
                                }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} color={theme.colors.status.error} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="p-3 border-t text-center"
        style={{ borderColor: theme.colors.border.medium }}
      >
        <p className="text-[10px]" style={{ color: theme.colors.text.muted }}>
          v2.0.0 · Open Source
        </p>
      </div>
    </div>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────────

interface GroupedChats {
  label: string;
  items: ChatSessionMeta[];
}

function groupChats(chats: ChatSessionMeta[]): GroupedChats[] {
  const now = Date.now();
  const oneDay = 86_400_000;
  const sevenDays = 7 * oneDay;

  const today: ChatSessionMeta[] = [];
  const week: ChatSessionMeta[] = [];
  const older: ChatSessionMeta[] = [];

  // Sort newest first
  const sorted = [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  for (const chat of sorted) {
    const age = now - new Date(chat.updatedAt).getTime();
    if (age < oneDay) today.push(chat);
    else if (age < sevenDays) week.push(chat);
    else older.push(chat);
  }

  return [
    { label: 'Today', items: today },
    { label: 'Previous 7 days', items: week },
    { label: 'Older', items: older },
  ];
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
