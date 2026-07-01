import { useState, useCallback, useEffect } from 'react';

export interface Settings {
  obliqueRelay: boolean;
  model: string;
  visionModel: string;
  remoteModel: string;
  remoteVisionModel: string;
  temperature: number;
  maxTokens: number;
  fontSize: number;
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveInterval: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  minimap: boolean;
  notifications: boolean;
  exportQuality: 'low' | 'medium' | 'high';
  defaultDiagramType: 'mermaid' | 'dbml' | 'graphviz' | 'plantuml';
  /** Enable automatic visual validation on generation */
  autoValidation: boolean;
  /** Maximum self-correction retries when validation is enabled */
  maxValidationRetries: number;
}

const DEFAULT_SETTINGS: Settings = {
  obliqueRelay: true,
  model: 'viscept',
  visionModel: 'viscept',
  remoteModel: 'openai/gpt-oss-120b',
  remoteVisionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  temperature: 0.3,
  maxTokens: 2048,
  fontSize: 13,
  theme: 'dark',
  autoSave: true,
  autoSaveInterval: 10000,
  showLineNumbers: true,
  wordWrap: true,
  minimap: false,
  notifications: true,
  exportQuality: 'high',
  defaultDiagramType: 'mermaid',
  autoValidation: false,
  maxValidationRetries: 2,
};

const STORAGE_KEY = 'viscept_settings';

/**
 * Settings management hook
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } as Settings;
        if (!parsed.model || parsed.model === 'qwen2.5-coder:7b' || parsed.model === 'llama3.2') {
          parsed.model = 'viscept';
        }
        if (!parsed.visionModel) {
          parsed.visionModel = 'viscept';
        }
        if (!parsed.remoteModel) {
          parsed.remoteModel = DEFAULT_SETTINGS.remoteModel;
        }
        if (!parsed.remoteVisionModel) {
          parsed.remoteVisionModel = DEFAULT_SETTINGS.remoteVisionModel;
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
  };
};
