import React, { useState } from 'react';
import { Sparkles, Code, Database, GitBranch, Zap, Eye, Save, Share2 } from 'lucide-react';
import { theme } from '../theme';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'features' | 'tutorial' | 'template'>('welcome');

  if (!isOpen) return null;

  const current = {
    welcome: {
      title: 'Welcome to Viscept',
      description: 'AI-powered diagram generator built for developers',
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {{
              icon: Code,
              label: 'Mermaid',
            },
            {
              icon: Database,
              label: 'DBML',
            },
            {
              icon: GitBranch,
              label: 'Graphviz',
            },
            {
              icon: Zap,
              label: 'Fast',
            }].map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg text-center" style={{ backgroundColor: theme.colors.bg.tertiary }}>
                <item.icon size={24} className="mx-auto mb-1" color={theme.colors.accent.primary} />
                <p className="text-xs font-medium" style={{ color: theme.colors.text.secondary }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    features: {
      title: 'Key Features',
      description: 'Everything you need to create professional diagrams',
      content: (
        <div className="space-y-3">
          {{
            icon: Eye,
            title: 'Live Preview',
            desc: 'See changes in real-time',
          },
          {
            icon: Save,
            title: 'Save Projects',
            desc: 'Store diagrams locally',
          },
          {
            icon: Share2,
            title: 'Export & Share',
            desc: 'PNG, SVG, PDF formats',
          },
          {
            icon: Zap,
            title: 'AI-Powered',
            desc: 'Natural language generation',
          }].map((feature, idx) => (
            <div key={idx} className="flex gap-3">
              <div
                className="p-2 rounded flex-shrink-0"
                style={{ backgroundColor: `${theme.colors.accent.primary}20` }}
              >
                <feature.icon size={16} color={theme.colors.accent.primary} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: theme.colors.text.primary }}>
                  {feature.title}
                </p>
                <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    tutorial: {
      title: 'Quick Tutorial',
      description: 'Learn the basics in 2 minutes',
      content: (
        <div className="space-y-4">
          {{
            num: 1,
            title: 'Write or Paste',
            desc: 'Describe your diagram in the chat panel',
          },
          {
            num: 2,
            title: 'Click Generate',
            desc: 'AI generates code automatically',
          },
          {
            num: 3,
            title: 'See Live Preview',
            desc: 'Diagram renders in real-time',
          },
          {
            num: 4,
            title: 'Export & Share',
            desc: 'Save as PNG, SVG, or PDF',
          }].map((step) => (
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
      title: 'Choose a Template',
      description: 'Start with a ready-made example',
      content: (
        <div className="space-y-3">
          {{
            icon: GitBranch,
            label: 'Authentication Flow',
            desc: 'User login and registration',
          },
          {
            icon: Database,
            label: 'Order Processing',
            desc: 'E-commerce workflow',
          },
          {
            icon: Database,
            label: 'Database Schema',
            desc: 'Social media platform',
          },
          {
            icon: GitBranch,
            label: 'Microservices',
            desc: 'System architecture',
          }].map((template, idx) => (
            <button
              key={idx}
              className="w-full p-3 rounded-lg text-left transition-all hover:opacity-80"
              style={{
                backgroundColor: theme.colors.bg.tertiary,
                border: `1px solid ${theme.colors.border.light}`,
              }}
            >
              <div className="flex items-center gap-3">
                <template.icon size={18} color={theme.colors.accent.primary} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: theme.colors.text.primary }}>
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
  }[currentStep];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: theme.colors.bg.secondary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b" style={{ borderColor: theme.colors.border.medium }}>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles size={24} color={theme.colors.accent.primary} />
            <h2 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
              {current.title}
            </h2>
          </div>
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            {current.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-8 border-b" style={{ borderColor: theme.colors.border.medium }}>
          {current.content}
        </div>

        {/* Buttons */}
        <div className="p-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              backgroundColor: theme.colors.bg.tertiary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.medium}`,
            }}
          >
            Skip
          </button>
          <button
            onClick={() => {
              const steps: typeof currentStep[] = ['welcome', 'features', 'tutorial', 'template'];
              const nextIdx = steps.indexOf(currentStep) + 1;
              if (nextIdx < steps.length) {
                setCurrentStep(steps[nextIdx]);
              } else {
                onClose();
              }
            }}
            className="flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.accent.primary}, ${theme.colors.accent.secondary})`,
              color: '#fff',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};