import React from 'react';
import { theme } from '../theme';
import { useOnboarding } from '../hooks/useOnboarding';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { currentStep, nextStep, skipOnboarding } = useOnboarding();

  if (currentStep === 'complete') {
    return null;
  }

  const steps = {
    welcome: {
      title: '✨ Welcome to Viscept',
      description: 'AI-powered diagram generation at your fingertips',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <p className="text-lg font-semibold mb-2">Create Stunning Diagrams with AI</p>
            <p className="text-sm text-slate-400">
              Transform natural language descriptions into professional diagrams instantly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '📊', label: 'Mermaid' },
              { icon: '🗄️', label: 'DBML' },
              { icon: '🔗', label: 'Graphviz' },
              { icon: '⚡', label: 'Fast' },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg text-center" style={{ backgroundColor: theme.colors.bg.tertiary }}>
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    tutorial: {
      title: '🎓 Quick Tutorial',
      description: 'Learn the basics in 2 minutes',
      content: (
        <div className="space-y-4">
          {[
            { num: 1, title: 'Write or Paste', desc: 'Describe your diagram in the chat panel' },
            { num: 2, title: 'Click Generate', desc: 'AI generates code automatically' },
            { num: 3, title: 'See Live Preview', desc: 'Diagram renders in real-time' },
            { num: 4, title: 'Export & Share', desc: 'Save as PNG, SVG, or PDF' },
          ].map((step) => (
            <div key={step.num} className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                style={{
                  backgroundColor: theme.colors.accent.primary,
                  color: '#fff',
                }}
              >
                {step.num}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
                  {step.title}
                </p>
                <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    template: {
      title: '📚 Choose a Template',
      description: 'Start with a ready-made example',
      content: (
        <div className="space-y-3">
          {[
            { icon: '🔐', label: 'Authentication Flow', desc: 'User login and registration' },
            { icon: '📦', label: 'Order Processing', desc: 'E-commerce workflow' },
            { icon: '🗄️', label: 'Database Schema', desc: 'Social media platform' },
            { icon: '🚀', label: 'Microservices', desc: 'System architecture' },
          ].map((template) => (
            <button
              key={template.label}
              className="w-full p-3 rounded-lg text-left transition-all hover:opacity-80"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.light}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                    {template.label}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    {template.desc}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ),
    },
  };

  const current = steps[currentStep as keyof typeof steps];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="rounded-2xl p-8 w-full max-w-md shadow-2xl"
        style={{ backgroundColor: theme.colors.bg.secondary }}
      >
        {/* Header */}
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.colors.text.primary }}>
          {current.title}
        </h2>
        <p className="text-sm mb-6" style={{ color: theme.colors.text.secondary }}>
          {current.description}
        </p>

        {/* Content */}
        <div className="mb-8">{current.content}</div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={skipOnboarding}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.quaternary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.colors.bg.tertiary;
            }}
          >
            Skip
          </button>
          <button
            onClick={() => {
              if (currentStep === 'template') {
                skipOnboarding();
                onComplete();
              } else {
                nextStep();
              }
            }}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 25px rgba(59, 130, 246, 0.5)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {currentStep === 'template' ? 'Get Started' : 'Next'}
          </button>
        </div>

        {/* Progress */}
        <div className="mt-6 flex gap-2 justify-center">
          {['welcome', 'tutorial', 'template'].map((step) => (
            <div
              key={step}
              className="h-1 rounded-full transition-all"
              style={{
                width: step === currentStep ? '24px' : '8px',
                backgroundColor:
                  ['welcome', 'tutorial', 'template'].indexOf(step) <=
                  ['welcome', 'tutorial', 'template'].indexOf(currentStep)
                    ? theme.colors.accent.primary
                    : theme.colors.border.medium,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};