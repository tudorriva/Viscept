/**
 * Viscept Professional Theme System
 * Enterprise-grade color palette and design tokens
 */

export const theme = {
  // ===== COLORS =====
  colors: {
    // Backgrounds
    bg: {
      primary: '#0a0e27',      // Deep navy (primary background)
      secondary: '#141b2e',    // Darker blue (elevated surfaces)
      tertiary: '#1a2340',     // Medium blue (cards, inputs)
      quaternary: '#232f45',   // Light blue (hover states)
      overlay: 'rgba(10, 14, 39, 0.8)',
    },
    // Text
    text: {
      primary: '#f0f4f8',      // Bright white (main text)
      secondary: '#cbd5e1',    // Light gray (secondary text)
      tertiary: '#94a3b8',     // Medium gray (tertiary text)
      muted: '#64748b',        // Dark gray (disabled, hints)
    },
    // Brand Accents
    accent: {
      primary: '#3b82f6',      // Blue (primary actions)
      primaryDark: '#1d4ed8',  // Dark blue (hover)
      secondary: '#8b5cf6',    // Purple (secondary actions)
      secondaryDark: '#6d28d9', // Dark purple (hover)
      tertiary: '#06b6d4',     // Cyan (info)
    },
    // Status
    status: {
      success: '#10b981',      // Green
      successLight: '#d1fae5',
      error: '#ef4444',        // Red
      errorLight: '#fee2e2',
      warning: '#f59e0b',      // Amber
      warningLight: '#fef3c7',
      info: '#06b6d4',         // Cyan
      infoLight: '#cffafe',
    },
    // Semantic
    semantic: {
      positive: '#10b981',
      negative: '#ef4444',
      neutral: '#6b7280',
      attention: '#f59e0b',
    },
    // Borders
    border: {
      light: 'rgba(203, 213, 225, 0.1)',
      medium: 'rgba(203, 213, 225, 0.2)',
      strong: 'rgba(203, 213, 225, 0.3)',
    },
  },

  // ===== ANIMATIONS =====
  animations: {
    'fade-in': 'fadeIn 0.3s ease-in-out',
    'slide-in-left': 'slideInLeft 0.4s ease-out',
    'slide-in-right': 'slideInRight 0.4s ease-out',
    'slide-in-up': 'slideInUp 0.4s ease-out',
    'slide-in-down': 'slideInDown 0.4s ease-out',
    'glow': 'glow 2s ease-in-out infinite',
    'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'bounce': 'bounce 0.5s ease-in-out',
  },

  // ===== SPACING (8px grid) =====
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },

  // ===== TYPOGRAPHY =====
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Monaco', monospace",
    },
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '28px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  // ===== SHADOWS =====
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
  },

  // ===== BREAKPOINTS =====
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '1024px',
    lg: '1280px',
    xl: '1536px',
  },

  // ===== Z-INDEX =====
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },

  // ===== TRANSITIONS =====
  transitions: {
    fast: '0.15s ease-in-out',
    base: '0.3s ease-in-out',
    slow: '0.5s ease-in-out',
  },
};

export type Theme = typeof theme;

// ===== UTILITY FUNCTIONS =====

/**
 * Get contrasting text color for background
 */
export const getContrastText = (backgroundColor: string): string => {
  if (backgroundColor.includes('primary') || backgroundColor.includes('secondary')) {
    return theme.colors.text.primary;
  }
  return theme.colors.text.secondary;
};

/**
 * Create gradient from two colors
 */
export const gradient = (color1: string, color2: string): string => {
  return `linear-gradient(135deg, ${color1}, ${color2})`;
};