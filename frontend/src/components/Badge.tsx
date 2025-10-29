import React from 'react';
import { theme } from '../theme';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'secondary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  default: {
    bg: 'rgba(59, 130, 246, 0.1)',
    text: '#3b82f6',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#ef4444',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#f59e0b',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  info: {
    bg: 'rgba(139, 92, 246, 0.1)',
    text: '#8b5cf6',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  secondary: {
    bg: 'rgba(148, 163, 184, 0.1)',
    text: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.3)',
  },
};

const sizeStyles = {
  sm: { px: '6px', py: '3px', fontSize: '11px' },
  md: { px: '10px', py: '5px', fontSize: '12px' },
  lg: { px: '14px', py: '7px', fontSize: '13px' },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
}) => {
  const style = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide transition-all ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
        padding: `${sizeStyle.py} ${sizeStyle.px}`,
        fontSize: sizeStyle.fontSize,
        borderWidth: '1px',
      }}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};

export default Badge;