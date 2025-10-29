import React, { useState } from 'react';
import { theme } from '../theme';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string) => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: '👋 Welcome to Viscept',
    description: 'AI-powered diagram generator using local Mistral AI. Create professional diagrams from natural language.',
    icon: '✨',
  },
  {
    step: 2,
    title: '📁 Create Projects',
    description: 'Organize your diagrams in projects. All your work is saved locally in your browser.',
    icon: '📁',
  },
  {
    step: 3,
    title: '✍️ Describe Your Diagram',
    description: 'Write a description of what you want to create. Be specific about elements, relationships, and details.',
    icon: '✍️',
  },
  {
    step: 4,
    title: '🎨 Choose Diagram Type',
    description: 'Select between Mermaid (flowcharts, sequences), DBML (databases), or Graphviz (architectures).',
    icon: '🎨',
  },
  {
    step: 5,
    title: '⚡ Generate',
    description: 'Click Generate or press Ctrl+Enter. Watch your diagram come to life in real-time!',
    icon: '⚡',
  },
  {
    step: 6,
    title: '📝 Edit & Refine',
    description: 'Edit the generated code directly. See changes instantly in the preview panel.',
    icon: '📝',
  },
  {
    step: 7,
    title: '💾 Export & Share',
    description: 'Export as PNG, SVG, or PDF. Save projects locally or share with your team.',
    icon: '💾',
  },
  {
    step: 8,
    title: '🚀 You\'re Ready!',
    description: 'Start creating amazing diagrams. Check the Examples Gallery for inspiration!',
    icon: '🚀',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onCreateProject }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTourAgain, setShowTourAgain] = useLocalStorage('viscept_show_tour', true);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setShowTourAgain(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-lg w-full max-w-md shadow-2xl overflow-hidden"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div
          className="h-1"
          style={{ backgroundColor: theme.colors.bg.tertiary }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%`,
              background: `linear-gradient(90deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <div className="text-6xl mb-4">{step.icon}</div>
          <h2
            className="text-2xl font-bold mb-3"
            style={{ color: theme.colors.text.primary }}
          >
            {step.title}
          </h2>
          <p
            className="text-sm leading-relaxed mb-8"
            style={{ color: theme.colors.text.secondary }}
          >
            {step.description}
          </p>

          {/* Step Counter */}
          <div
            className="text-xs mb-6"
            style={{ color: theme.colors.text.tertiary }}
          >
            Step {step.step} of {TOUR_STEPS.length}
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {currentStep === TOUR_STEPS.length - 1 && (
              <button
                onClick={() => {
                  handleClose();
                  onCreateProject('My First Diagram');
                }}
                className="w-full py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: '#fff',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
              >
                🎉 Create My First Diagram
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  opacity: currentStep === 0 ? 0.5 : 1,
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: '#fff',
                }}
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Done' : 'Next →'}
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2 text-sm transition-all"
              style={{
                backgroundColor: 'transparent',
                color: theme.colors.text.tertiary,
                border: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.text.secondary;
              }}
            >
              Skip Tour
            </button>
          </div>
        </div>

        {/* Checkbox */}
        <div
          className="px-8 py-4 border-t flex items-center gap-2"
          style={{ borderColor: theme.colors.border.medium }}
        >
          <input
            type="checkbox"
            id="show-again"
            checked={showTourAgain}
            onChange={(e) => setShowTourAgain(e.target.checked)}
            className="w-4 h-4"
          />
          <label
            htmlFor="show-again"
            className="text-xs flex-1"
            style={{ color: theme.colors.text.tertiary }}
          >
            Show on next visit
          </label>
        </div>
      </div>
    </div>
  );
};