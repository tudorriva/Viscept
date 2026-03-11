import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, MessageSquare, Trash2, Pencil, Check, X,
  Sparkles, LayoutGrid,
} from 'lucide-react';
import { GradientBorderCard } from '../ui/GradientBorderCard';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useUIStore } from '../../store/uiStore';
import { cn } from '../../lib/utils';
import type { ChatSessionMeta } from '../../types/chat';

interface LeftSidebarProps {
  chatList: ChatSessionMeta[];
  activeChatId: string | null;
  onCreateChat: () => void;
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onShowExamples: () => void;
}

/**
 * LeftSidebar — collapsible project/session navigator.
 * When collapsed (leftSidebarOpen = false), shows icon-only strip (w-12).
 */
export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  chatList,
  activeChatId,
  onCreateChat,
  onOpenChat,
  onDeleteChat,
  onRenameChat,
  onShowExamples,
}) => {
  const { leftSidebarOpen } = useUIStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const startRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };
  const commitRename = () => {
    if (renamingId && renameValue.trim()) onRenameChat(renamingId, renameValue.trim());
    setRenamingId(null);
  };
  const cancelRename = () => setRenamingId(null);

  const grouped = groupChats(chatList);

  return (
    <motion.aside
      animate={{ width: leftSidebarOpen ? 240 : 48 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="relative z-10 flex flex-col h-full overflow-hidden shrink-0 border-r"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* ── New Diagram Button ─────────────────────────────────────── */}
      <div className="p-2 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        {leftSidebarOpen ? (
          <GradientBorderCard glow className="rounded-xl" gradient="accent">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCreateChat}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-[calc(0.75rem-1px)] text-sm font-medium text-text-primary"
              style={{ backgroundColor: 'var(--bg-panel)' }}
            >
              <Plus size={15} />
              New Diagram
            </motion.button>
          </GradientBorderCard>
        ) : (
          <AnimatedButton
            variant="ghost"
            size="icon"
            onClick={onCreateChat}
            subtle
            title="New Diagram"
            className="w-8 h-8 mx-auto"
          >
            <Plus size={16} />
          </AnimatedButton>
        )}
      </div>

      {/* ── Chat list ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {chatList.length === 0 && leftSidebarOpen ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <MessageSquare size={22} className="mb-2 text-text-muted" />
            <p className="text-xs text-text-muted">No diagrams yet</p>
            <p className="text-[10px] text-text-disabled mt-1">
              Start a conversation to create one
            </p>
          </div>
        ) : (
          <div className="py-2">
            {grouped.map(({ label, items }) =>
              items.length > 0 ? (
                <div key={label} className="mb-2">
                  {leftSidebarOpen && (
                    <h3
                      className="px-4 py-1 text-[9px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {label}
                    </h3>
                  )}

                  {items.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    const isRenaming = renamingId === chat.id;

                    return (
                      <motion.div
                        key={chat.id}
                        layout
                        onClick={() => !isRenaming && onOpenChat(chat.id)}
                        className={cn(
                          'mx-1.5 rounded-lg cursor-pointer group relative',
                          'transition-colors duration-150',
                          leftSidebarOpen ? 'px-2.5 py-2' : 'px-0 py-2 flex justify-center',
                          isActive
                            ? 'bg-[var(--bg-active)]'
                            : 'hover:bg-[var(--bg-hover)]',
                        )}
                        style={{
                          borderLeft: leftSidebarOpen && isActive
                            ? '2px solid var(--accent-start)'
                            : leftSidebarOpen ? '2px solid transparent' : undefined,
                        }}
                        whileHover={{ x: leftSidebarOpen ? 1 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      >
                        {!leftSidebarOpen ? (
                          /* Collapsed: icon only */
                          <MessageSquare
                            size={16}
                            style={{
                              color: isActive ? 'var(--accent-start)' : 'var(--text-muted)',
                            }}
                          />
                        ) : isRenaming ? (
                          /* Rename mode */
                          <div className="flex items-center gap-1">
                            <input
                              ref={renameRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') cancelRename();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 px-1.5 py-0.5 rounded text-xs focus:outline-none"
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--accent-start)',
                              }}
                            />
                            <button onClick={(e) => { e.stopPropagation(); commitRename(); }}>
                              <Check size={12} color="var(--accent-start)" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); cancelRename(); }}>
                              <X size={12} color="var(--text-muted)" />
                            </button>
                          </div>
                        ) : (
                          /* Normal expanded row */
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageSquare
                              size={13}
                              className="shrink-0"
                              style={{
                                color: isActive ? 'var(--accent-start)' : 'var(--text-muted)',
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-xs font-medium truncate"
                                style={{
                                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                }}
                              >
                                {chat.title}
                              </p>
                              <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                                {chat.diagramType?.toUpperCase() ?? 'NEW'} · {formatRelativeTime(chat.updatedAt)}
                              </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); startRename(chat.id, chat.title); }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Pencil size={10} color="var(--text-muted)" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                                className="p-1 rounded hover:bg-white/10 transition-colors"
                              >
                                <Trash2 size={10} color="var(--error)" />
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      {/* ── Footer / Examples button ───────────────────────────────── */}
      <div className="p-2 border-t shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        {leftSidebarOpen ? (
          <button
            onClick={onShowExamples}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-[var(--bg-hover)] transition-colors"
          >
            <LayoutGrid size={13} />
            <span>Examples Gallery</span>
          </button>
        ) : (
          <AnimatedButton
            variant="ghost"
            size="icon"
            onClick={onShowExamples}
            subtle
            title="Examples Gallery"
            className="w-8 h-8 mx-auto"
          >
            <LayoutGrid size={14} />
          </AnimatedButton>
        )}

        {leftSidebarOpen && (
          <p className="text-center text-[9px] mt-2" style={{ color: 'var(--text-disabled)' }}>
            Viscept v2.0 · Open Source
          </p>
        )}
      </div>
    </motion.aside>
  );
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

interface GroupedChats { label: string; items: ChatSessionMeta[]; }

function groupChats(chats: ChatSessionMeta[]): GroupedChats[] {
  const now  = Date.now();
  const day  = 86_400_000;
  const week = 7 * day;

  const today: ChatSessionMeta[] = [];
  const wk:    ChatSessionMeta[] = [];
  const older: ChatSessionMeta[] = [];

  const sorted = [...chats].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  for (const c of sorted) {
    const age = now - new Date(c.updatedAt).getTime();
    if (age < day)  today.push(c);
    else if (age < week) wk.push(c);
    else            older.push(c);
  }

  return [
    { label: 'Today',             items: today },
    { label: 'Previous 7 days',   items: wk    },
    { label: 'Older',             items: older  },
  ];
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
