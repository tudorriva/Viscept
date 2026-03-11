import React, { useState } from 'react';
import { Settings, Code, Zap, Download, X, Brain, Eye } from 'lucide-react';
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
  // AI Model settings
  generativeModel: string;
  visionModel: string;
  temperature: number;
  // Visual Validation settings
  autoValidation: boolean;
  maxValidationRetries: number;
}

const DEFAULT_SETTINGS: Settings = {
  editorFontSize: 13,
  autoFormat: false,
  showLineNumbers: true,
  tabSize: 2,
  theme: 'dark',
  notifications: true,
  generativeModel: 'qwen2.5-coder:7b',
  visionModel: 'qwen2.5vl:3b',
  temperature: 0.3,
  autoValidation: false,
  maxValidationRetries: 2,
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useLocalStorage<Settings>('viscept_settings', DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'general' | 'performance'>('editor');

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
          <div className="flex items-center gap-2">
            <Settings size={20} color={theme.colors.accent.primary} />
            <h2
              className="text-xl font-bold"
              style={{ color: theme.colors.text.primary }}
            >
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-opacity-10 rounded transition-all"
            style={{ color: theme.colors.text.tertiary }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b px-6"
          style={{ borderColor: theme.colors.border.medium }}
        >
          {(['editor', 'ai', 'general', 'performance'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-all border-b-2 capitalize flex items-center gap-1.5"
              style={{
                color: activeTab === tab ? theme.colors.accent.primary : theme.colors.text.tertiary,
                borderColor: activeTab === tab ? theme.colors.accent.primary : 'transparent',
              }}
            >
              {tab === 'editor' && <Code size={14} />}
              {tab === 'ai' && <Brain size={14} />}
              {tab === 'general' && <Settings size={14} />}
              {tab === 'performance' && <Zap size={14} />}
              {tab === 'ai' ? 'AI Models' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {activeTab === 'editor' && (
            <>
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

              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Font Size: {tempSettings.editorFontSize}px
                </label>
                <input
                  type="range"
                  min="10"
                  max="18"
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
                className="p-3 rounded-lg text-xs"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.tertiary,
                }}
              >
                <strong>Tip:</strong> Use Ctrl+Enter to quickly generate diagrams
              </div>
            </>
          )}

          {activeTab === 'ai' && (
            <>
              {/* Generative Model */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Generative Model (Code Generation)
                </label>
                <select
                  value={tempSettings.generativeModel}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      generativeModel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="qwen2.5-coder:7b">Qwen2.5-Coder 7B (Recommended)</option>
                  <option value="qwen2.5-coder:3b">Qwen2.5-Coder 3B (Faster)</option>
                  <option value="mistral">Mistral 7B (Legacy)</option>
                  <option value="llama3.1:8b">Llama 3.1 8B (Generalist)</option>
                  <option value="codellama:7b">CodeLlama 7B</option>
                </select>
                <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
                  Qwen2.5-Coder-7B offers best diagram syntax accuracy (~88% HumanEval)
                </p>
              </div>

              {/* Vision Model */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Vision Model (Visual Validation)
                </label>
                <select
                  value={tempSettings.visionModel}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      visionModel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: theme.colors.bg.tertiary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.medium}`,
                  }}
                >
                  <option value="qwen2.5vl:3b">Qwen2.5-VL 3B (Recommended)</option>
                  <option value="moondream:latest">Moondream2 1.9B (Faster)</option>
                </select>
                <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
                  VLM inspects rendered diagrams for visual errors (OCR + spatial reasoning)
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: theme.colors.text.secondary }}
                >
                  Temperature: {tempSettings.temperature}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.1"
                  value={tempSettings.temperature}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
                  Lower = more deterministic code. 0.3 recommended for diagrams.
                </p>
              </div>

              {/* Visual Validation Toggle */}
              <div className="pt-2 border-t" style={{ borderColor: theme.colors.border.medium }}>
                <label
                  className="flex items-center gap-3 cursor-pointer"
                  style={{ color: theme.colors.text.secondary }}
                >
                  <input
                    type="checkbox"
                    checked={tempSettings.autoValidation}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        autoValidation: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Eye size={14} />
                      Auto Visual Validation
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: theme.colors.text.tertiary }}>
                      Automatically validate diagrams after generation using the VLM judge
                    </p>
                  </div>
                </label>
              </div>

              {/* Max Retries */}
              {tempSettings.autoValidation && (
                <div>
                  <label
                    className="text-sm font-medium mb-2 block"
                    style={{ color: theme.colors.text.secondary }}
                  >
                    Max Auto-Correction Retries: {tempSettings.maxValidationRetries}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={tempSettings.maxValidationRetries}
                    onChange={(e) =>
                      setTempSettings({
                        ...tempSettings,
                        maxValidationRetries: parseInt(e.target.value),
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs mt-1" style={{ color: theme.colors.text.tertiary }}>
                    How many times the VLM can request corrections before accepting the result
                  </p>
                </div>
              )}

              {/* Info box */}
              <div
                className="p-3 rounded-lg text-xs space-y-1"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.tertiary,
                }}
              >
                <p><strong>Pipeline:</strong> Generate → Render → Inspect → Auto-Correct</p>
                <p><strong>Privacy:</strong> All models run locally via Ollama — no cloud APIs</p>
                <p><strong>VRAM:</strong> Sequential loading swaps models to fit 4GB VRAM</p>
              </div>
            </>
          )}

          {activeTab === 'performance' && (
            <>
              <div
                className="p-3 rounded-lg space-y-2 text-xs"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.secondary,
                }}
              >
                <p>
                  <strong>Tab Size:</strong> {tempSettings.tabSize} spaces
                </p>
                <p>
                  <strong>Theme:</strong> {tempSettings.theme}
                </p>
              </div>
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
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};