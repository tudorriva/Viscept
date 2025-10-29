import React from 'react';
import { theme } from '../theme';

type Status = 'online' | 'offline' | 'loading' | 'warning' | 'error';

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  online: {
    color: theme.colors.status.success,
    bgColor: 'rgba(16, 185, 129, 0.2)',
    label: 'Online',
    pulse: true,
  },
  offline: {
    color: theme.colors.status.error,
    bgColor: 'rgba(239, 68, 68, 0.2)',
    label: 'Offline',
    pulse: false,
  },
  loading: {
    color: theme.colors.accent.primary,
    bgColor: 'rgba(59, 130, 246, 0.2)',
    label: 'Loading',
    pulse: true,
  },
  warning: {
    color: theme.colors.status.warning,
    bgColor: 'rgba(245, 158, 11, 0.2)',
    label: 'Warning',
    pulse: false,
  },
  error: {
    color: theme.colors.status.error,
    bgColor: 'rgba(239, 68, 68, 0.2)',
    label: 'Error',
    pulse: false,
  },
};

const sizeConfig = {
  sm: { dot: '6px', container: '24px' },
  md: { dot: '8px', container: '28px' },
  lg: { dot: '10px', container: '32px' },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'md',
}) => {
  const config = statusConfig[status];
  const sizeStyle = sizeConfig[size];

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
        style={{
          width: sizeStyle.container,
          height: sizeStyle.container,
          backgroundColor: config.bgColor,
        }}
      >
        <div
          style={{
            width: sizeStyle.dot,
            height: sizeStyle.dot,
            backgroundColor: config.color,
            borderRadius: '50%',
          }}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: size === 'sm' ? '11px' : size === 'md' ? '12px' : '13px',
            color: config.color,
            fontWeight: '500',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};

export default StatusIndicator;