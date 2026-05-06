import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PanelLeftOpen, PanelLeftClose,
  PanelRightOpen, PanelRightClose,
  Settings, BookOpen,
  Search,
  Download,
} from 'lucide-react';
import { IconLogo } from '../../assets/logos';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AIStatusIndicator, type AIStatus } from '../ui/AIStatusIndicator';
import { useUIStore } from '../../store/uiStore';

interface TopBarProps {
  isOllamaOnline: boolean;
  currentModel: string;
  aiStatus: AIStatus;
}

/**
 * TopBar — the permanent application header.
 * Height: 48px (h-12).
 * Left:   sidebar toggle + logo + wordmark.
 * Center: AI status indicator.
 * Right:  right-panel toggle + ⌘K + settings.
 */
export const TopBar: React.FC<TopBarProps> = ({
  isOllamaOnline,
  currentModel,
  aiStatus,
}) => {
  const {
    leftSidebarOpen, toggleLeftSidebar,
    rightPanelOpen,  toggleRightPanel,
    setCommandPaletteOpen,
    setSettingsOpen,
    setExportPanelOpen,
  } = useUIStore();

  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative z-20 flex items-center justify-between h-12 px-3 border-b shrink-0"
      style={{
        backgroundColor: 'var(--bg-panel)',
        borderColor: 'var(--border-subtle)',
        boxShadow: '0 1px 0 var(--border-subtle)',
      }}
    >
      {/* ── Left ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <AnimatedButton
          variant="ghost"
          size="icon"
          onClick={toggleLeftSidebar}
          subtle
          title={leftSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="text-text-muted hover:text-text-primary"
        >
          {leftSidebarOpen
            ? <PanelLeftClose size={16} />
            : <PanelLeftOpen  size={16} />}
        </AnimatedButton>

        <div className="flex items-center gap-2.5">
          <IconLogo size={24} />
          <div>
            <span className="text-sm font-bold tracking-tight text-text-primary">Viscept</span>
            <span className="text-[10px] text-text-muted ml-1.5 hidden sm:inline">
              AI Diagram Studio
            </span>
          </div>
        </div>
      </div>

      {/* ── Centre ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <AIStatusIndicator
          status={aiStatus}
          label={
            !isOllamaOnline
              ? 'Ollama Offline'
              : undefined
          }
        />

        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium"
          style={{
            background: 'var(--bg-active)',
            color: 'var(--accent-start)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-end inline-block" />
          {currentModel}
        </div>

        <span className="text-[11px] text-text-muted tabular-nums hidden lg:block">
          {time}
        </span>
      </div>

      {/* ── Right ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        {/* ⌘K */}
        <AnimatedButton
          variant="ghost"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          subtle
          className="gap-1.5 text-text-muted hover:text-text-primary"
          title="Command palette (Ctrl+K)"
        >
          <Search size={14} />
          <span className="hidden md:inline text-xs">Search</span>
          <kbd
            className="hidden md:inline text-[10px] px-1 py-0.5 rounded font-mono ml-0.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            ⌘K
          </kbd>
        </AnimatedButton>

        {/* Examples */}
        <AnimatedButton
          variant="ghost"
          size="icon"
          onClick={() => useUIStore.getState().setExamplesOpen(true)}
          subtle
          title="Examples gallery"
          className="text-text-muted hover:text-text-primary"
        >
          <BookOpen size={16} />
        </AnimatedButton>

        {/* Export */}
        <AnimatedButton
          variant="ghost"
          size="icon"
          onClick={() => setExportPanelOpen(true)}
          subtle
          title="Export diagram"
          className="text-text-muted hover:text-text-primary"
        >
          <Download size={16} />
        </AnimatedButton>

        {/* Settings */}
        <AnimatedButton
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          subtle
          title="Settings (Ctrl+,)"
          className="text-text-muted hover:text-text-primary"
        >
          <Settings size={16} />
        </AnimatedButton>

        {/* Right-panel toggle */}
        <AnimatedButton
          variant="ghost"
          size="icon"
          onClick={toggleRightPanel}
          subtle
          title={rightPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
          className="text-text-muted hover:text-text-primary"
        >
          {rightPanelOpen
            ? <PanelRightClose size={16} />
            : <PanelRightOpen  size={16} />}
        </AnimatedButton>
      </div>
    </motion.header>
  );
};
