import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search, Sparkles, LayoutGrid, FileCode2, Settings,
  Download, RotateCcw, CheckCircle2, Zap,
  BookOpen, PlusCircle, Keyboard,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import type { ChatSessionMeta } from '../../types/chat';

interface CommandPaletteProps {
  chatList: ChatSessionMeta[];
  onNewDiagram: () => void;
  onLoadSession: (id: string) => void;
  onGenerateDemo: () => void;
  onValidate: () => void;
  onFormatCode: () => void;
  onShowExamples: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
}

/**
 * CommandPalette — cmdk-powered ⌘K overlay.
 * Groups: Actions · Diagrams (recent sessions) · Navigation
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  chatList, onNewDiagram, onLoadSession,
  onGenerateDemo, onValidate, onFormatCode, onShowExamples,
}) => {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const setExportPanelOpen = useUIStore((s) => s.setExportPanelOpen);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);

  /* ⌘K / Ctrl+K handler */
  const handleKeyGlobal = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(!open);
    }
  }, [open, setCommandPaletteOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyGlobal);
    return () => document.removeEventListener('keydown', handleKeyGlobal);
  }, [handleKeyGlobal]);

  const close = () => setCommandPaletteOpen(false);

  const run = (fn: () => void) => {
    fn();
    close();
  };

  const ACTIONS: CommandItem[] = [
    {
      id: 'new',
      label: 'New Diagram',
      description: 'Start a fresh conversation',
      icon: PlusCircle,
      action: () => run(onNewDiagram),
      keywords: ['create', 'start', 'fresh'],
    },
    {
      id: 'demo',
      label: 'Load demo diagram',
      description: 'Load a sample diagram',
      icon: Sparkles,
      action: () => run(onGenerateDemo),
      keywords: ['sample', 'example'],
    },
    {
      id: 'examples',
      label: 'Browse examples',
      description: 'View example gallery',
      icon: BookOpen,
      action: () => run(onShowExamples),
      keywords: ['gallery'],
    },
    {
      id: 'validate',
      label: 'Validate diagram',
      description: 'Run visual validation',
      icon: CheckCircle2,
      action: () => run(onValidate),
      keywords: ['check', 'lint'],
    },
    {
      id: 'format',
      label: 'Format code',
      description: 'Prettify editor content',
      icon: Zap,
      action: () => run(onFormatCode),
      keywords: ['prettify', 'clean'],
    },
    {
      id: 'export',
      label: 'Export diagram',
      description: 'PNG, SVG, PDF or copy code',
      icon: Download,
      action: () => run(() => setExportPanelOpen(true)),
      keywords: ['download', 'save', 'png', 'svg', 'pdf'],
    },
    {
      id: 'settings',
      label: 'Open settings',
      description: 'AI models, appearance, editor',
      icon: Settings,
      action: () => run(() => setSettingsOpen(true)),
      keywords: ['preferences', 'config'],
    },
  ];

  const NAV_ITEMS: CommandItem[] = [
    {
      id: 'tab-preview',
      label: 'Switch to Preview',
      icon: LayoutGrid,
      action: () => run(() => setActiveTab('preview')),
    },
    {
      id: 'tab-code',
      label: 'Switch to Code Editor',
      icon: FileCode2,
      action: () => run(() => setActiveTab('code')),
    },
    {
      id: 'toggle-sidebar',
      label: 'Toggle left sidebar',
      icon: Keyboard,
      action: () => run(toggleLeftSidebar),
    },
    {
      id: 'toggle-ai',
      label: 'Toggle AI panel',
      icon: RotateCcw,
      action: () => run(toggleRightPanel),
    },
  ];

  const recentSessions = chatList.slice(0, 5);

  return (
    <Dialog.Root open={open} onOpenChange={setCommandPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(11,15,26,0.65)', backdropFilter: 'blur(12px)' }}
          />
        </Dialog.Overlay>

        <Dialog.Content asChild>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className="fixed top-[18%] left-0 right-0 mx-auto z-[100] w-[560px] rounded-2xl overflow-hidden outline-none"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(106,92,255,0.12)',
            }}
          >
            <Dialog.Title className="sr-only">Command Palette</Dialog.Title>

            <Command label="Command Menu" className="w-full">
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <Command.Input
                  placeholder="Type a command or search…"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'Inter, sans-serif',
                  }}
                />
                <kbd
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Esc
                </kbd>
              </div>

              {/* Items list */}
              <Command.List
                style={{
                  maxHeight: 380,
                  overflowY: 'auto',
                  padding: '8px 0',
                }}
              >
                <Command.Empty
                  className="py-8 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  No results found.
                </Command.Empty>

                <CMDKGroup heading="Actions" items={ACTIONS} />

                {recentSessions.length > 0 && (
                  <CMDKGroup
                    heading="Recent Diagrams"
                    items={recentSessions.map((s: ChatSessionMeta) => ({
                      id: `session-${s.id}`,
                      label: s.title ?? 'Untitled diagram',
                      description: s.diagramType ?? '',
                      icon: FileCode2,
                      action: () => run(() => onLoadSession(s.id)),
                    }))}
                  />
                )}

                <CMDKGroup heading="Navigation" items={NAV_ITEMS} />
              </Command.List>
            </Command>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/* ── CMDKGroup ───────────────────────────────────────────────────────────────── */

const CMDKGroup: React.FC<{ heading: string; items: CommandItem[] }> = ({ heading, items }) => (
  <Command.Group
    heading={heading}
    className="px-2"
    style={{ '--cmdk-group-heading-color': 'var(--text-muted)' } as React.CSSProperties}
  >
    {items.map((item) => {
      const Icon = item.icon;
      return (
        <Command.Item
          key={item.id}
          value={`${item.label} ${item.keywords?.join(' ') ?? ''}`}
          onSelect={item.action}
          className="cmdk-item flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 outline-none transition-colors"
          style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <Icon size={14} style={{ color: 'var(--accent-start)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
              {item.label}
            </p>
            {item.description && (
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                {item.description}
              </p>
            )}
          </div>
        </Command.Item>
      );
    })}
  </Command.Group>
);
