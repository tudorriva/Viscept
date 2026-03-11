import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface GradientBorderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animate border glow on hover */
  glow?: boolean;
  /** p-px outer wrapper padding (1px border) */
  borderWidth?: 1 | 2;
  gradient?: 'accent' | 'pink' | 'cyan';
  children?: React.ReactNode;
}

const gradients: Record<string, string> = {
  accent: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
  pink:   'linear-gradient(135deg, var(--accent-start), var(--accent-pink))',
  cyan:   'linear-gradient(135deg, var(--accent-mid), var(--accent-end))',
};

/**
 * GradientBorderCard — A container whose border is a live gradient.
 * Implemented via a 1-2px gradient outer wrapper + filled inner div, so the
 * actual React content sits on a solid background with no gradient bleed.
 *
 * @example
 * <GradientBorderCard glow className="rounded-xl">
 *   <div className="bg-panel rounded-[calc(0.75rem-1px)] p-4">Content</div>
 * </GradientBorderCard>
 */
export const GradientBorderCard: React.FC<GradientBorderCardProps> = ({
  glow = false,
  borderWidth = 1,
  gradient = 'accent',
  className,
  children,
  ...props
}) => {
  return (
    <motion.div
      whileHover={glow ? { boxShadow: 'var(--shadow-glow)' } : {}}
      transition={{ duration: 0.3 }}
      className={cn('rounded-xl', className)}
      style={{
        background: gradients[gradient],
        padding: borderWidth,
      }}
      {...(props as HTMLMotionProps<'div'>)}
    >
      {children}
    </motion.div>
  );
};
