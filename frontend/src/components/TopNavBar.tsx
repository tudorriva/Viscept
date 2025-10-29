import React, { useState, useEffect } from 'react';
import { Badge } from './Badge';
import { StatusIndicator } from './StatusIndicator';
import { Icon } from './Icon';
import { IconLogo } from '../assets/logos';
import { theme } from '../theme';

interface TopNavBarProps {
  isOllamaOnline: boolean;
  currentModel: string;
  onSettingsClick: () => void;
  onHelpClick: () => void;
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
      <div className="flex items-center gap-4">
        <IconLogo size={40} />
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
      <div className="flex items-center gap-4">
        {/* Ollama Status */}
        <StatusIndicator
          status={isOllamaOnline ? 'online' : 'offline'}
          label={isOllamaOnline ? 'Ollama Online' : 'Ollama Offline'}
          size="md"
        />

        {/* Model Badge */}
        <Badge variant="info" size="md" icon={<Icon name="code" size={14} />}>
          {currentModel}
        </Badge>

        {/* Time */}
        <Badge variant="secondary" size="sm">
          {time}
        </Badge>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onHelpClick}
          className="p-2.5 rounded-lg transition-all"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            border: `1px solid transparent`,
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
          <Icon name="help" size={18} />
        </button>

        <button
          onClick={onSettingsClick}
          className="p-2.5 rounded-lg transition-all"
          style={{
            backgroundColor: 'transparent',
            color: theme.colors.text.secondary,
            border: `1px solid transparent`,
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
          <Icon name="settings" size={18} />
        </button>
      </div>
    </nav>
  );
};

export default TopNavBar;