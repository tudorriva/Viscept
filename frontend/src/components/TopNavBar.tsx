import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

interface TopNavBarProps {
  isOllamaOnline: boolean;
  currentModel: string;
  onSettingsClick: () => void;
  onHelpClick?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  isOllamaOnline,
  currentModel,
  onSettingsClick,
  onHelpClick,
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        backgroundColor: theme.colors.bg.secondary,
        borderColor: theme.colors.border.medium,
      }}
    >
      {/* Left Section - Logo & Branding */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
          }}
        >
          ✨
        </div>
        <div>
          <h1
            className="text-lg font-bold tracking-tight"
            style={{ color: theme.colors.text.primary }}
          >
            Viscept
          </h1>
          <p
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            AI Diagram Studio
          </p>
        </div>
      </div>

      {/* Middle Section - Status Indicators */}
      <div className="flex items-center gap-6">
        {/* Ollama Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isOllamaOnline ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: isOllamaOnline
                ? theme.colors.status.success
                : theme.colors.status.error,
            }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: theme.colors.text.secondary }}
          >
            Ollama: <span style={{ color: isOllamaOnline ? theme.colors.status.success : theme.colors.status.error }}>
              {isOllamaOnline ? 'Online' : 'Offline'}
            </span>
          </span>
        </div>

        {/* Model Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: theme.colors.bg.tertiary }}>
          <span
            className="text-xs"
            style={{ color: theme.colors.text.tertiary }}
          >
            Model:
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: theme.colors.accent.primary }}
          >
            {currentModel}
          </span>
        </div>

        {/* Time */}
        <span
          className="text-xs font-mono"
          style={{ color: theme.colors.text.tertiary }}
        >
          {time}
        </span>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onHelpClick}
          className="p-2 rounded-lg transition-all"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            border: `1px solid ${theme.colors.border.light}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            e.currentTarget.style.color = theme.colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.text.secondary;
          }}
          title="Help & Documentation"
        >
          <span className="text-lg">❓</span>
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2 rounded-lg transition-all"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            border: `1px solid ${theme.colors.border.light}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            e.currentTarget.style.color = theme.colors.accent.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = theme.colors.text.secondary;
          }}
          title="Settings"
        >
          <span className="text-lg">⚙️</span>
        </button>
      </div>
    </nav>
  );
};