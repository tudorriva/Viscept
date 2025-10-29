import { useState, useCallback, useEffect } from 'react';

export type OnboardingStep = 'welcome' | 'tutorial' | 'template' | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  isCompleted: boolean;
  hasSeenBefore: boolean;
}

const STORAGE_KEY = 'viscept_onboarding';

/**
 * Onboarding flow management
 */
export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }

    return {
      currentStep: 'welcome' as const,
      isCompleted: false,
      hasSeenBefore: false,
    };
  });

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const steps: OnboardingStep[] = ['welcome', 'tutorial', 'template', 'complete'];
      const currentIndex = steps.indexOf(prev.currentStep);
      const nextIndex = Math.min(currentIndex + 1, steps.length - 1);

      return {
        ...prev,
        currentStep: steps[nextIndex],
        isCompleted: nextIndex === steps.length - 1,
        hasSeenBefore: true,
      };
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: 'complete' as const,
      isCompleted: true,
      hasSeenBefore: true,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState({
      currentStep: 'welcome' as const,
      isCompleted: false,
      hasSeenBefore: false,
    });
  }, []);

  return {
    ...state,
    nextStep,
    skipOnboarding,
    resetOnboarding,
  };
};