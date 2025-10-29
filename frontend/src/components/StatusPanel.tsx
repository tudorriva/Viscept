import React from 'react';
import { Badge } from './Badge';
import { StatusIndicator } from './StatusIndicator';
import { Icon } from './Icon';
import { theme } from '../theme';

interface StatusPanelProps {
  isOllamaOnline: boolean;
  currentModel: string;
  generationTime?: number;
  diagramType: string;
  isLoading?: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  isOllamaOnline,
  currentModel,
  generationTime,
  diagramType,
  isLoading,
}) => {
  return (
    <div
      className="flex flex-wrap items-center gap-4 p-4 rounded-lg"
      style={{
        backgroundColor: theme.colors.bg.tertiary,
        border: `1px solid ${theme.colors.border.medium}`,
      }}
    >
      {/* Ollama Status */}
      <div className="flex items-center gap-2">
        <StatusIndicator
          status={isOllamaOnline ? 'online' : 'offline'}
          label={isOllamaOnline ? 'Ollama Online' : 'Ollama Offline'}
          size="sm"
        />
      </div>

      {/* Model Badge */}
      <Badge variant="info" size="md" icon={<Icon name="code" size={14} />}>
        {currentModel}
      </Badge>

      {/* Diagram Type */}
      <Badge variant="secondary" size="md">
        {diagramType.toUpperCase()}
      </Badge>

      {/* Generation Status */}
      {isLoading && (
        <Badge variant="warning" size="md" icon={<Icon name="loading" size={14} />}>
          Generating...
        </Badge>
      )}

      {/* Generation Time */}
      {generationTime && !isLoading && (
        <Badge variant="success" size="sm" icon={<Icon name="check" size={12} />}>
          {generationTime}ms
        </Badge>
      )}
    </div>
  );
};

export default StatusPanel;