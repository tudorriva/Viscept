import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export type AIStatus = 'idle' | 'thinking' | 'generating' | 'error' | 'success';

interface AIStatusIndicatorProps {
  status: AIStatus;
  label?: string;
  className?: string;
}

const statusConfig: Record<
  AIStatus,
  { color: string; pulseColor: string; label: string }
> = {
  idle:       { color: '#4b5675',   pulseColor: 'rgba(75,86,117,0.4)',    label: 'Ready' },
  thinking:   { color: '#6a5cff',   pulseColor: 'rgba(106,92,255,0.4)',   label: 'Thinking' },
  generating: { color: '#00d4ff',   pulseColor: 'rgba(0,212,255,0.35)',   label: 'Generating' },
  error:      { color: '#ef4444',   pulseColor: 'rgba(239,68,68,0.35)',   label: 'Error' },
  success:    { color: '#10b981',   pulseColor: 'rgba(16,185,129,0.35)',  label: 'Done' },
};

/**
 * AIStatusIndicator — animated pulse dot that reflects AI state.
 * Used in the TopBar and AIPanel header.
 */
export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  status,
  label,
  className,
}) => {
  const config = statusConfig[status];
  const isActive = status === 'thinking' || status === 'generating';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Dot with pulse ring */}
      <div className="relative flex items-center justify-center w-5 h-5">
        {/* Pulse ring — only shown when active */}
        <AnimatePresence>
          {isActive && (
            <motion.span
              key="pulse"
              className="absolute inset-0 rounded-full"
              style={{ background: config.pulseColor }}
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        {/* Core dot */}
        <motion.span
          className="relative z-10 rounded-full"
          style={{ background: config.color, width: 8, height: 8 }}
          animate={
            isActive
              ? { scale: [1, 1.25, 1], opacity: [1, 0.8, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={
            isActive
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      </div>

      {/* Label */}
      {(label !== undefined || true) && (
        <AnimatePresence mode="wait">
          <motion.span
            key={status}
            className="text-xs font-medium"
            style={{ color: config.color }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            {label ?? config.label}
          </motion.span>
        </AnimatePresence>
      )}
    </div>
  );
};
