import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import * as Select from '@radix-ui/react-select';
import {
  X, Bot, Palette, Sliders, KeyRound,
  ChevronDown, ChevronRight, Check,
} from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useUIStore } from '../../store/uiStore';

const TABS = [
  { id: 'ai',          label: 'AI Models',     icon: Bot },
  { id: 'appearance',  label: 'Appearance',    icon: Palette },
  { id: 'editor',      label: 'Editor',        icon: Sliders },
  { id: 'shortcuts',   label: 'Shortcuts',     icon: KeyRound },
] as const;

type TabId = typeof TABS[number]['id'];

interface SettingsDialogProps {
  settings: Record<string, unknown>;
  onSettingsChange: (key: string, value: unknown) => void;
}

/**
 * SettingsDialog — Radix Dialog replacing SettingsModal.
 * Left nav tabs + Framer slide transitions.
 */
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  settings, onSettingsChange,
}) => {
  const open = useUIStore((s) => s.settingsOpen);
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen);
  const [activeTab, setActiveTab] = useState<TabId>('ai');

  const handleTabChange = (id: TabId) => setActiveTab(id);

  return (
    <Dialog.Root open={open} onOpenChange={setSettingsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(11,15,26,0.75)', backdropFilter: 'blur(8px)' }}
          />
        </Dialog.Overlay>

        <Dialog.Content asChild>
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 m-auto z-50 w-[680px] h-[520px] rounded-2xl flex overflow-hidden outline-none"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-medium)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(106,92,255,0.08)',
            }}
          >
            {/* ── Left nav ─────────────────────────────────────────── */}
            <div
              className="w-48 shrink-0 flex flex-col py-4 px-2 gap-1"
              style={{
                background: 'var(--bg-base)',
                borderRight: '1px solid var(--border-subtle)',
              }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                Settings
              </p>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left"
                    style={{
                      background: active ? 'var(--bg-elevated)' : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="settings-tab-bg"
                        className="absolute inset-0 rounded-lg"
                        style={{ background: 'var(--bg-elevated)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon size={14} className="relative z-10 shrink-0" />
                    <span className="relative z-10">{tab.label}</span>
                    {active && <ChevronRight size={12} className="relative z-10 ml-auto" style={{ color: 'var(--accent-start)' }} />}
                  </motion.button>
                );
              })}
            </div>

            {/* ── Content pane ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Title row */}
              <div
                className="shrink-0 flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Dialog.Title className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {TABS.find((t) => t.id === activeTab)?.label}
                </Dialog.Title>
                <Dialog.Close asChild>
                  <AnimatedButton variant="ghost" size="icon-sm">
                    <X size={15} />
                  </AnimatedButton>
                </Dialog.Close>
              </div>

              {/* Tab body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.18 }}
                  >
                    {activeTab === 'ai' && <AITab settings={settings} onChange={onSettingsChange} />}
                    {activeTab === 'appearance' && <AppearanceTab settings={settings} onChange={onSettingsChange} />}
                    {activeTab === 'editor' && <EditorTab settings={settings} onChange={onSettingsChange} />}
                    {activeTab === 'shortcuts' && <ShortcutsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/* ── Tab content components ─────────────────────────────────────────────────── */

const Row: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({
  label, description, children,
}) => (
  <div className="flex items-center justify-between py-3.5">
    <div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {description && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const SepRow = () => (
  <Separator.Root style={{ height: 1, background: 'var(--border-subtle)', margin: '2px 0' }} />
);

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({ value, onChange }) => (
  <motion.button
    onClick={() => onChange(!value)}
    className="w-10 h-5.5 rounded-full relative transition-colors"
    style={{
      background: value ? 'var(--accent-start)' : 'var(--bg-elevated)',
      border: '1px solid',
      borderColor: value ? 'var(--accent-start)' : 'var(--border-medium)',
      height: 22,
    }}
  >
    <motion.div
      animate={{ x: value ? 18 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="absolute top-0.5 w-4 h-4 rounded-full"
      style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
    />
  </motion.button>
);

const StyledSelect: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({
  value, options, onChange,
}) => (
  <Select.Root value={value} onValueChange={onChange}>
    <Select.Trigger
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer min-w-[140px]"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-primary)',
      }}
    >
      <Select.Value />
      <Select.Icon><ChevronDown size={13} style={{ color: 'var(--text-muted)' }} /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        className="rounded-xl shadow-2xl overflow-hidden z-[200] py-1"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-medium)',
          minWidth: 160,
        }}
        position="popper"
        sideOffset={4}
      >
        <Select.Viewport>
          {options.map((opt) => (
            <Select.Item
              key={opt}
              value={opt}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer outline-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-active)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <Select.ItemText>{opt}</Select.ItemText>
              <Select.ItemIndicator className="ml-auto">
                <Check size={13} style={{ color: 'var(--accent-start)' }} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

const AITab: React.FC<{ settings: Record<string, unknown>; onChange: (k: string, v: unknown) => void }> = ({
  settings, onChange,
}) => (
  <div className="space-y-0.5">
    <Row label="Generation Model" description="Primary model for diagram generation">
      <StyledSelect
        value={(settings.model as string) ?? 'viscept'}
        options={['viscept', 'openai/gpt-oss-120b', 'qwen/qwen3-32b', 'llama-3.3-70b-versatile', 'gemini-2.5-flash', 'qwen2.5-coder:7b', 'mistral:7b']}
        onChange={(v) => onChange('model', v)}
      />
    </Row>
    <SepRow />
    <Row label="Vision Model" description="Model for diagram validation">
      <StyledSelect
        value={(settings.visionModel as string) ?? 'viscept'}
        options={['viscept', 'meta-llama/llama-4-scout-17b-16e-instruct', 'gemini-2.5-flash', 'granite3.2-vision:2b']}
        onChange={(v) => onChange('visionModel', v)}
      />
    </Row>
    <SepRow />
    <Row label="Auto-validate" description="Validate diagram after each generation">
      <Toggle
        value={(settings.autoValidation as boolean) ?? true}
        onChange={(v) => onChange('autoValidation', v)}
      />
    </Row>
    <SepRow />
    <Row label="Auto-fix" description="Automatically attempt to fix validation errors">
      <Toggle
        value={(settings.autoFix as boolean) ?? false}
        onChange={(v) => onChange('autoFix', v)}
      />
    </Row>
    <SepRow />
    <Row label="Streaming" description="Stream output token-by-token">
      <Toggle
        value={(settings.streamOutput as boolean) ?? true}
        onChange={(v) => onChange('streamOutput', v)}
      />
    </Row>
  </div>
);

const AppearanceTab: React.FC<{ settings: Record<string, unknown>; onChange: (k: string, v: unknown) => void }> = ({
  settings, onChange,
}) => (
  <div className="space-y-0.5">
    <Row label="Layout density" description="Controls panel sizing and padding">
      <StyledSelect
        value={(settings.density as string) ?? 'default'}
        options={['compact', 'default', 'comfortable']}
        onChange={(v) => onChange('density', v)}
      />
    </Row>
    <SepRow />
    <Row label="Animated background" description="Ambient floating orbs">
      <Toggle
        value={(settings.animatedBg as boolean) ?? true}
        onChange={(v) => onChange('animatedBg', v)}
      />
    </Row>
    <SepRow />
    <Row label="Reduce motion" description="Disable non-essential animations">
      <Toggle
        value={(settings.reduceMotion as boolean) ?? false}
        onChange={(v) => onChange('reduceMotion', v)}
      />
    </Row>
  </div>
);

const EditorTab: React.FC<{ settings: Record<string, unknown>; onChange: (k: string, v: unknown) => void }> = ({
  settings, onChange,
}) => (
  <div className="space-y-0.5">
    <Row label="Font size" description="Monaco editor font size (px)">
      <StyledSelect
        value={String((settings.fontSize as number) ?? 13)}
        options={['11', '12', '13', '14', '15', '16']}
        onChange={(v) => onChange('fontSize', Number(v))}
      />
    </Row>
    <SepRow />
    <Row label="Tab size" description="Indentation spaces">
      <StyledSelect
        value={String((settings.tabSize as number) ?? 2)}
        options={['2', '4']}
        onChange={(v) => onChange('tabSize', Number(v))}
      />
    </Row>
    <SepRow />
    <Row label="Word wrap" description="Wrap long lines in editor">
      <Toggle
        value={(settings.wordWrap as boolean) ?? false}
        onChange={(v) => onChange('wordWrap', v)}
      />
    </Row>
    <SepRow />
    <Row label="Minimap" description="Show minimap in editor">
      <Toggle
        value={(settings.minimap as boolean) ?? false}
        onChange={(v) => onChange('minimap', v)}
      />
    </Row>
  </div>
);

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Open command palette' },
  { keys: ['⌘', 'Enter'], label: 'Send message / generate' },
  { keys: ['⌘', 'Shift', 'F'], label: 'Format code' },
  { keys: ['⌘', 'Shift', 'V'], label: 'Validate diagram' },
  { keys: ['⌘', 'Shift', 'E'], label: 'Export dialog' },
  { keys: ['⌘', 'B'], label: 'Toggle left sidebar' },
  { keys: ['⌘', 'Shift', 'A'], label: 'Toggle AI panel' },
  { keys: ['Esc'], label: 'Close dialogs/palettes' },
];

const ShortcutsTab: React.FC = () => (
  <div className="space-y-1">
    {SHORTCUTS.map(({ keys, label }) => (
      <div
        key={label}
        className="flex items-center justify-between py-2.5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="flex items-center gap-1">
          {keys.map((k) => (
            <kbd
              key={k}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
              }}
            >
              {k}
            </kbd>
          ))}
        </div>
      </div>
    ))}
  </div>
);
