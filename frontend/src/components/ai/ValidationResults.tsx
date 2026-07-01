import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Eye, ChevronDown, AlertTriangle, CheckCircle, XCircle, Loader, Wrench } from 'lucide-react';
import { ValidationBadge } from '../ui/ValidationBadge';
import { AnimatedButton } from '../ui/AnimatedButton';
import type { ValidationResult } from '../../utils/api';

interface ValidationResultsProps {
  validation: ValidationResult | null;
  isValidating: boolean;
  hasCode: boolean;
  onValidate: () => void;
  onFix?: () => void;
}

/**
 * ValidationResults — collapsible VLM result panel in the AI sidebar.
 */
export const ValidationResults: React.FC<ValidationResultsProps> = ({
  validation,
  isValidating,
  hasCode,
  onValidate,
  onFix,
}) => {
  const [open, setOpen] = React.useState(false);

  const status = isValidating ? 'RUNNING' : validation?.status ?? 'PENDING';
  const confidence = validation?.confidence;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <Collapsible.Trigger asChild>
            <button
              className="flex items-center gap-2 outline-none group"
              disabled={!validation}
            >
              <ValidationBadge
                status={status as any}
                confidence={confidence}
              />
              {validation && (
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronDown size={14} />
                </motion.span>
              )}
            </button>
          </Collapsible.Trigger>

          <AnimatedButton
            variant="secondary"
            size="xs"
            onClick={onValidate}
            disabled={!hasCode || isValidating}
            subtle
            loading={isValidating}
          >
            {!isValidating && <Eye size={12} />}
            {isValidating ? 'Checking…' : 'Check'}
          </AnimatedButton>
        </div>

        {/* Expanded details */}
        <Collapsible.Content asChild>
          <AnimatePresence>
            {open && validation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="px-3 pb-3 space-y-2.5 pt-1"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  {/* Reason */}
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {validation.reason}
                  </p>

                  {typeof validation.attempts === 'number' && validation.attempts > 1 && (
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      Stabilized after {validation.attempts} passes
                    </p>
                  )}

                  {/* Suggestions */}
                  {validation.suggestions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Suggestions
                      </p>
                      <ul className="space-y-1">
                        {validation.suggestions.map((s, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-1.5 text-xs"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <span style={{ color: 'var(--accent-start)', marginTop: 2 }}>•</span>
                            {s}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fix button */}
                  {validation.status === 'FAIL' && onFix && (
                    <AnimatedButton
                      variant="primary"
                      size="sm"
                      onClick={onFix}
                      className="w-full mt-1"
                    >
                      <Wrench size={13} />
                      Auto-Fix Issues
                    </AnimatedButton>
                  )}

                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                    Validated {new Date(validation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
};
