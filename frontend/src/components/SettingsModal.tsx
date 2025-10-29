import React, { useState } from 'react';
import { theme } from '../theme';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Settings {
  editorFontSize: number;
  autoFormat: boolean;
  showLineNumbers: boolean;
  tabSize: number;
  theme: 'dark' | 'light';
  notifications: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  editorFontSize: 13,
  autoFormat: false,
  showLineNumbers: true,
  tabSize: 2,
  theme: 'dark',
  notifications: true,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('viscept_settings', DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'editor' | 'general' | 'performance'>('editor');

  const handleSave = () => {
    setSettings(tempSettings);
    onClose();
  };

  const handleReset = () => {
    setTempSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg w-full max-w-2xl max-h-96 overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <h2
            className="text-xl font-bold"
            style={{ color: theme.colors.text.primary }}
          >
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none"
            style={{ color: theme.colors.text.tertiary }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-0 border-b px-6 pt-4"
          style={{ borderColor: theme.colors.border.medium }}
        >
          {(['editor', 'general', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize"
              style={{
                color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.tertiary,
                borderColor: activeTab === tab ? theme.colors.accent.primary : 'transparent',
              }}
            >
              {tab === 'editor' ? '📝 Editor' : tab === 'general' ? '⚡ General' : '🚀 Performance'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {activeTab === 'editor' && (
            <>
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Font Size: {tempSettings.editorFontSize}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={tempSettings.editorFontSize}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      editorFontSize: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Tab Size: {tempSettings.tabSize} spaces
                </label>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="2"
                  value={tempSettings.tabSize}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      tabSize: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <label
                className="flex items-center gap-3 cursor-pointer"
                style={{ color: theme.colors.text.secondary }}
              >
                <input
                  type="checkbox"
                  checked={tempSettings.showLineNumbers}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      showLineNumbers: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Show Line Numbers</span>
              </label>

              <label
                className="flex items-center gap-3 cursor-pointer"
                style={{ color: theme.colors.text.secondary }}
              >
                <input
                  type="checkbox"
                  checked={tempSettings.autoFormat}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      autoFormat: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Auto Format on Save</span>
              </label>
            </>
          )}

          {activeTab === 'general' && (
            <>
              <label
                className="flex items-center gap-3 cursor-pointer"
                style={{ color: theme.colors.text.secondary }}
              >
                <input
                  type="checkbox"
                  checked={tempSettings.notifications}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      notifications: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Enable Notifications</span>
              </label>

              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: theme.colors.text.tertiary }}
                >
                  💡 <strong>Tip:</strong> Use Ctrl+Enter to quickly generate diagrams
                </p>
              </div>
            </>
          )}

          {activeTab === 'performance' && (
            <>
              <div
                className="p-4 rounded-lg space-y-3"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    Storage Used
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: theme.colors.accent.primary }}
                  >
                    {(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    Projects Count
                  </span>
                  <span
                    className="text-sm font-mono"
                    style={{ color: theme.colors.accent.primary }}
                  >
                    {JSON.parse(localStorage.getItem('viscept_projects') || '[]').length}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.clear();
                  alert('All data cleared');
                  window.location.reload();
                }}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: `${theme.colors.status.error}20`,
                  color: theme.colors.status.error,
                  border: `1px solid ${theme.colors.status.error}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${theme.colors.status.error}30`;
                }}
              >
                🗑️ Clear All Data
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex gap-3 justify-end"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};