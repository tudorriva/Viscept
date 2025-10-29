import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, X, Zap, Folder, Edit3, Palette, GitBranch, Download, Sparkles } from 'lucide-react';
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
    title: 'Welcome to Viscept',
    description: 'AI-powered diagram generator using local Mistral AI. Create professional diagrams from natural language.',
    icon: Sparkles,
  },
  {
    step: 2,
    title: 'Create Projects',
    description: 'Organize your diagrams in projects. All your work is saved locally in your browser.',
    icon: Folder,
  },
  {
    step: 3,
    title: 'Describe Your Diagram',
    description: 'Write a description of what you want to create. Be specific about elements, relationships, and details.',
    icon: Edit3,
  },
  {
    step: 4,
    title: 'Choose Diagram Type',
    description: 'Select between Mermaid (flowcharts, sequences), DBML (databases), or Graphviz (architectures).',
    icon: Palette,
  },
  {
    step: 5,
    title: 'Generate',
    description: 'Click Generate or press Ctrl+Enter. Watch your diagram come to life in real-time!',
    icon: Zap,
  },
  {
    step: 6,
    title: 'Edit & Refine',
    description: 'Edit the generated code directly. See changes instantly in the preview panel.',
    icon: GitBranch,
  },
  {
    step: 7,
    title: 'Export & Share',
    description: 'Export as PNG, SVG, or PDF. Save projects locally or share with your team.',
    icon: Download,
  },
  {
    step: 8,
    title: "You're Ready!",
    description: 'Start creating amazing diagrams. Check the Examples Gallery for inspiration!',
    icon: Sparkles,
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose, onCreateProject }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [, setOnboardingDismissed] = useLocalStorage('viscept_onboarding_done', false);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setOnboardingDismissed(true);
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden"
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
          <div className="mb-6 flex justify-center">
            <div
              className="p-4 rounded-full"
              style={{ backgroundColor: `${theme.colors.accent.primary}20` }}
            >
              <Icon size={48} color={theme.colors.accent.primary} />
            </div>
          </div>
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
            className="text-xs mb-8"
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
                className="w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: '#fff',
                }}
              >
                <Sparkles size={16} />
                Create My First Diagram
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.colors.bg.tertiary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.medium}`,
                  opacity: currentStep === 0 ? 0.5 : 1,
                  cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
                  color: '#fff',
                }}
              >
                {currentStep === TOUR_STEPS.length - 1 ? 'Done' : 'Next'}
                <ChevronRight size={16} />
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
            >
              Skip Tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};