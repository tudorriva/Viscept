import React from 'react';
import { cn } from '../../lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Slightly more opaque / elevated glass */
  elevated?: boolean;
  /** Remove the default border-radius */
  square?: boolean;
  children?: React.ReactNode;
}

/**
 * GlassPanel — base glassmorphism card used throughout the new UI.
 * Wraps content in a backdrop-blur, semi-transparent panel with a
 * hairline border that references the design-token CSS vars.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  elevated = false,
  square = false,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        elevated ? 'glass-elevated' : 'glass',
        !square && 'rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
