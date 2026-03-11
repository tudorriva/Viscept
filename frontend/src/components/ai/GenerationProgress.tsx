import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader, Circle, Zap, Image, Eye, Wrench } from 'lucide-react';
import { type GenerationPhase } from '../../store/uiStore';
import { GradientBorderCard } from '../ui/GradientBorderCard';

interface Step {
  id: GenerationPhase;
  label: string;
  sub: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  { id: 'classifying', label: 'Classifying',        sub: 'Detecting diagram type…',   icon: <Zap   size={14} /> },
  { id: 'generating',  label: 'Generating code',    sub: 'LLM is writing DSL code…',  icon: <Loader size={14} className="animate-spin" /> },
  { id: 'rendering',   label: 'Rendering image',    sub: 'Building the visual graph…', icon: <Image  size={14} /> },
  { id: 'validating',  label: 'Visual validation',  sub: 'VLM inspecting output…',    icon: <Eye    size={14} /> },
  { id: 'fixing',      label: 'Auto-fixing',         sub: 'Correcting syntax errors…', icon: <Wrench size={14} /> },
];

function phaseIndex(phase: GenerationPhase): number {
  return STEPS.findIndex((s) => s.id === phase);
}

interface GenerationProgressProps {
  phase: GenerationPhase;
  message?: string;
}

/**
 * GenerationProgress — animated multi-step progress indicator shown
 * while the LLM pipeline is running.
 */
export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  phase,
  message,
}) => {
  if (!phase || phase === 'done' || phase === 'error') return null;

  const current = phaseIndex(phase);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <GradientBorderCard glow gradient="accent" className="rounded-xl">
          <div
            className="rounded-[calc(0.75rem-1px)] p-4 space-y-3"
            style={{ backgroundColor: 'var(--bg-panel)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--accent-start)' }}
                />
                AI Pipeline
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: 'var(--bg-active)',
                  color: 'var(--accent-start)',
                  border: '1px solid var(--border-accent)',
                }}
              >
                Step {current + 1} / {STEPS.length}
              </span>
            </div>

            {/* Steps */}
            {STEPS.map((step, idx) => {
              const isDone    = idx < current;
              const isCurrent = idx === current;
              const isPending = idx > current;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.25 }}
                  className="flex items-center gap-3"
                >
                  {/* Status icon */}
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isDone
                        ? 'rgba(16,185,129,0.15)'
                        : isCurrent
                        ? 'var(--bg-active)'
                        : 'var(--bg-elevated)',
                      border: isDone
                        ? '1px solid rgba(16,185,129,0.4)'
                        : isCurrent
                        ? '1px solid var(--accent-start)'
                        : '1px solid var(--border-subtle)',
                    }}
                  >
                    {isDone ? (
                      <Check size={12} color="var(--success)" />
                    ) : isCurrent ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="inline-flex"
                        style={{ color: 'var(--accent-start)' }}
                      >
                        <Loader size={11} />
                      </motion.span>
                    ) : (
                      <Circle size={8} color="var(--text-disabled)" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: isDone
                          ? 'var(--success)'
                          : isCurrent
                          ? 'var(--text-primary)'
                          : 'var(--text-disabled)',
                      }}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[10px] mt-0.5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {message || step.sub}
                      </motion.p>
                    )}
                  </div>

                  {/* Left-side accent bar for current step */}
                  {isCurrent && (
                    <motion.div
                      layoutId="step-accent"
                      className="w-0.5 h-5 rounded-full shrink-0"
                      style={{ background: 'linear-gradient(to bottom, var(--accent-start), var(--accent-end))' }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </GradientBorderCard>
      </motion.div>
    </AnimatePresence>
  );
};
