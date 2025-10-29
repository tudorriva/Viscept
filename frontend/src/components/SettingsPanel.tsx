import React, { useState } from 'react';
import { theme } from '../theme';
import { useSettings } from '../hooks/useSettings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'editor' | 'generation' | 'export'>('editor');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-6 border-b"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            className="text-2xl transition-all"
            style={{ color: theme.colors.text.secondary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = theme.colors.text.secondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b px-8"
          style={{ borderColor: theme.colors.border.medium }}
        >
          {['editor', 'generation', 'export'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className="px-4 py-3 font-medium text-sm border-b-2 transition-all capitalize"
              style={{
                color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.secondary,
                borderColor: activeTab === tab ? theme.colors.accent.primary : 'transparent',
              }}
            >
              {tab === 'editor' && '📝 Editor'}
              {tab === 'generation' && '✨ Generation'}
              {tab === 'export' && '💾 Export'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {activeTab === 'editor' && (
            <>
              {/* Font Size */}
              <SettingItem label="Font Size" icon="🔤">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="18"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span
                    className="text-sm font-mono px-3 py-1 rounded"
                    style={{ backgroundColor: theme.colors.bg.tertiary, color: theme.colors.accent.primary }}
                  >
                    {settings.fontSize}px
                  </span>
                </div>
              </SettingItem>

              {/* Word Wrap */}
              <SettingItem label="Word Wrap" icon="↩️">
                <Toggle
                  checked={settings.wordWrap}
                  onChange={(checked) => updateSetting('wordWrap', checked)}
                />
              </SettingItem>

              {/* Line Numbers */}
              <SettingItem label="Show Line Numbers" icon="🔢">
                <Toggle
                  checked={settings.showLineNumbers}
                  onChange={(checked) => updateSetting('showLineNumbers', checked)}
                />
              </SettingItem>

              {/* Minimap */}
              <SettingItem label="Show Minimap" icon="🗺️">
                <Toggle
                  checked={settings.minimap}
                  onChange={(checked) => updateSetting('minimap', checked)}
                />
              </SettingItem>
            </>
          )}

          {activeTab === 'generation' && (
            <>
              {/* Model */}
              <SettingItem label="AI Model" icon="🤖">
                <select
                  value={settings.model}
                  onChange={(e) => updateSetting('model', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="mistral">Mistral 7B</option>
                  <option value="neural-chat">Neural Chat</option>
                  <option value="codellama">CodeLlama</option>
                </select>
              </SettingItem>

              {/* Temperature */}
              <SettingItem label="Temperature (Creativity)" icon="🔥">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span
                    className="text-sm font-mono px-3 py-1 rounded"
                    style={{ backgroundColor: theme.colors.bg.tertiary, color: theme.colors.accent.primary }}
                  >
                    {settings.temperature.toFixed(1)}
                  </span>
                </div>
              </SettingItem>

              {/* Max Tokens */}
              <SettingItem label="Max Tokens" icon="📏">
                <input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                />
              </SettingItem>

              {/* Auto Save */}
              <SettingItem label="Auto Save" icon="💾">
                <Toggle
                  checked={settings.autoSave}
                  onChange={(checked) => updateSetting('autoSave', checked)}
                />
              </SettingItem>
            </>
          )}

          {activeTab === 'export' && (
            <>
              {/* Export Quality */}
              <SettingItem label="Export Quality" icon="✨">
                <select
                  value={settings.exportQuality}
                  onChange={(e) => updateSetting('exportQuality', e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="low">Low (Fast)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Best Quality)</option>
                </select>
              </SettingItem>

              {/* Default Diagram Type */}
              <SettingItem label="Default Diagram Type" icon="📊">
                <select
                  value={settings.defaultDiagramType}
                  onChange={(e) => updateSetting('defaultDiagramType', e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="mermaid">Mermaid</option>
                  <option value="dbml">DBML</option>
                  <option value="graphviz">Graphviz</option>
                </select>
              </SettingItem>

              {/* Notifications */}
              <SettingItem label="Notifications" icon="🔔">
                <Toggle
                  checked={settings.notifications}
                  onChange={(checked) => updateSetting('notifications', checked)}
                />
              </SettingItem>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-8 py-4 border-t"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <button
            onClick={resetSettings}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'transparent',
              color: theme.colors.status.warning,
              border: `1px solid ${theme.colors.status.warning}20`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.colors.status.warning}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            🔄 Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Setting Item Component
 */
interface SettingItemProps {
  label: string;
  icon: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, icon, children }) => {
  return (
    <div>
      <label
        className="flex items-center gap-2 text-sm font-semibold mb-3"
        style={{ color: theme.colors.text.primary }}
      >
        <span>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
};

/**
 * Toggle Switch Component
 */
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-all"
      style={{
        backgroundColor: checked ? theme.colors.accent.primary : theme.colors.bg.tertiary,
      }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
        style={{
          transform: checked ? 'translateX(20px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
};