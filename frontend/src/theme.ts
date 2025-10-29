/**
 * Theme configuration and constants for Viscept
 */

export const theme = {
  colors: {
    bg: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#cbd5e1',
    },
    accent: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
    },
    status: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
    },
  },
  animations: {
    'fade-in': 'fadeIn 0.3s ease-in-out',
    'slide-in-left': 'slideInLeft 0.4s ease-out',
    'slide-in-right': 'slideInRight 0.4s ease-out',
    'slide-in-up': 'slideInUp 0.4s ease-out',
    'glow': 'glow 2s ease-in-out infinite',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};

export type Theme = typeof theme;