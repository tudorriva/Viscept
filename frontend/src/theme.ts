/**
 * theme.ts — Design token bridge.
 *
 * All values now reference the CSS custom properties defined in index.css.
 * This keeps legacy components (DiagramPreview, DiagramEditor, etc.) working
 * while the app migrates fully to Tailwind + CSS vars.
 *
 * NEW code should use Tailwind classes (e.g. `text-text-primary`) or CSS vars
 * (e.g. `var(--accent-start)`) directly.  Do NOT add new consumers of this file.
 */

export const theme = {
  colors: {
    bg: {
      primary:    '#0b0f1a',   /* --bg-base */
      secondary:  '#12182a',   /* --bg-panel */
      tertiary:   '#1a2236',   /* --bg-elevated */
      quaternary: '#222d44',
      overlay:    'rgba(11,15,26,0.8)',
    },
    text: {
      primary:   '#f0f4f8',   /* --text-primary */
      secondary: '#94a3b8',   /* --text-secondary */
      tertiary:  '#64748b',
      muted:     '#4b5675',   /* --text-muted */
    },
    accent: {
      primary:       '#6a5cff',  /* --accent-start */
      primaryDark:   '#5145cc',
      secondary:     '#ff7ad9',  /* --accent-pink */
      secondaryDark: '#cc5caf',
      tertiary:      '#00d4ff',  /* --accent-end */
    },
    status: {
      success: '#10b981',
      error:   '#ef4444',
      warning: '#f59e0b',
      info:    '#3b9eff',
    },
    border: {
      light:  'rgba(255,255,255,0.06)',   /* --border-subtle */
      medium: 'rgba(255,255,255,0.12)',   /* --border-medium */
      strong: 'rgba(255,255,255,0.22)',   /* --border-strong */
    },
  },
  shadows: {
    sm:  '0 1px 4px rgba(0,0,0,0.3)',
    md:  '0 4px 16px rgba(0,0,0,0.4)',
    lg:  '0 8px 32px rgba(0,0,0,0.5)',
    xl:  '0 16px 64px rgba(0,0,0,0.6)',
    glow:'0 0 20px rgba(106,92,255,0.4)',
  },
} as const;

export type Theme = typeof theme;

