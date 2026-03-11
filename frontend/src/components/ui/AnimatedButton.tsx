import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/* ─── Variant definitions via CVA ─────────────────────────────────────── */
const buttonVariants = cva(
  // Base
  'relative inline-flex items-center justify-center gap-2 font-medium transition-colors select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-start)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]',
  {
    variants: {
      variant: {
        primary: [
          'text-white border-none',
          'bg-accent-gradient shadow-glow',
          'hover:shadow-[0_6px_28px_rgba(106,92,255,0.55)]',
        ],
        secondary: [
          'bg-elevated text-text-primary',
          'border border-border-medium',
          'hover:border-accent hover:bg-[var(--bg-active)]',
        ],
        ghost: [
          'bg-transparent text-text-secondary',
          'hover:bg-[var(--bg-hover)] hover:text-text-primary',
        ],
        icon: [
          'bg-transparent text-text-secondary p-0',
          'border border-transparent',
          'hover:bg-elevated hover:text-text-primary hover:border-border-subtle',
        ],
        danger: [
          'bg-[rgba(239,68,68,0.12)] text-status-error',
          'border border-[rgba(239,68,68,0.3)]',
          'hover:bg-[rgba(239,68,68,0.2)] hover:border-status-error',
        ],
      },
      size: {
        xs:   'h-6  px-2   text-[11px] rounded-md',
        sm:   'h-8  px-3   text-xs     rounded-lg',
        md:   'h-9  px-4   text-sm     rounded-lg',
        lg:   'h-10 px-5   text-sm     rounded-xl',
        xl:   'h-12 px-6   text-base   rounded-xl',
        icon: 'h-8  w-8               rounded-lg',
        'icon-sm': 'h-7 w-7           rounded-md',
        'icon-lg': 'h-10 w-10         rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

type MotionButtonProps = HTMLMotionProps<'button'>;

export interface AnimatedButtonProps
  extends Omit<MotionButtonProps, 'children'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  /** Reduces motion scale effect (e.g. for icon-only miniature buttons) */
  subtle?: boolean;
}

/**
 * AnimatedButton — Framer Motion–enhanced button with CVA variants.
 * Replaces all `<button>` elements that previously used inline `style` hover hacks.
 */
export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ variant, size, className, children, loading, subtle, disabled, ...props }, ref) => {
    const scale = subtle ? [1, 1.04, 1] : [1, 1.05, 1];

    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: subtle ? 1.03 : 1.04 } : {}}
        whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
            {children}
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  },
);

AnimatedButton.displayName = 'AnimatedButton';
