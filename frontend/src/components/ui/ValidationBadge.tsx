import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Minus, Loader } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ValidationStatus = 'PASS' | 'FAIL' | 'ERROR' | 'PENDING' | 'RUNNING';

interface ValidationBadgeProps {
  status: ValidationStatus;
  confidence?: number;
  className?: string;
  animate?: boolean;
}

const config: Record<
  ValidationStatus,
  { icon: React.ReactNode; label: string; bg: string; color: string; border: string }
> = {
  PASS:    { icon: <CheckCircle  size={12} />, label: 'Passed',    bg: 'rgba(16,185,129,0.12)',  color: '#10b981', border: 'rgba(16,185,129,0.3)'  },
  FAIL:    { icon: <XCircle      size={12} />, label: 'Issues',    bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'    },
  ERROR:   { icon: <AlertTriangle size={12}/>, label: 'Error',     bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)'   },
  PENDING: { icon: <Minus        size={12} />, label: 'Not run',   bg: 'rgba(75,86,117,0.15)',   color: '#4b5675', border: 'rgba(75,86,117,0.3)'    },
  RUNNING: { icon: <Loader       size={12} className="animate-spin" />, label: 'Running', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
};

/**
 * ValidationBadge — Pill badge for VLM validation result.
 */
export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  confidence,
  className,
  animate = true,
}) => {
  const c = config[status];

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={animate ? { opacity: 0, scale: 0.85 } : undefined}
        animate={animate ? { opacity: 1, scale: 1 }  : undefined}
        exit={animate   ? { opacity: 0, scale: 0.85 } : undefined}
        transition={{ duration: 0.2 }}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
          className,
        )}
        style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
      >
        {c.icon}
        {c.label}
        {confidence !== undefined && status !== 'PENDING' && status !== 'RUNNING' && (
          <span className="opacity-70 ml-0.5">{Math.round(confidence * 100)}%</span>
        )}
      </motion.span>
    </AnimatePresence>
  );
};
