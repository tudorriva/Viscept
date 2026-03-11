/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        base:     'var(--bg-base)',
        panel:    'var(--bg-panel)',
        elevated: 'var(--bg-elevated)',
        overlay:  'var(--bg-overlay)',
        accent: {
          DEFAULT: 'var(--accent-start)',
          start:   'var(--accent-start)',
          end:     'var(--accent-end)',
          mid:     'var(--accent-mid)',
          pink:    'var(--accent-pink)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          medium: 'var(--border-medium)',
          strong: 'var(--border-strong)',
          accent: 'var(--border-accent)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          disabled:  'var(--text-disabled)',
        },
        status: {
          success: 'var(--success)',
          error:   'var(--error)',
          warning: 'var(--warning)',
          info:    'var(--info)',
        },
        slate: {
          750: '#1e293b',
          850: '#0f1629',
          900: '#0f172a',
          950: '#03071e',
        },
        primary: {
          50:  '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
      },
      backgroundImage: {
        'accent-gradient':   'linear-gradient(135deg, var(--accent-start), var(--accent-end))',
        'accent-gradient-v': 'linear-gradient(180deg, var(--accent-start), var(--accent-end))',
        'pink-gradient':     'linear-gradient(135deg, var(--accent-start), var(--accent-pink))',
        'panel-gradient':    'linear-gradient(135deg, var(--bg-panel), var(--bg-elevated))',
      },
      boxShadow: {
        'glow':       'var(--shadow-glow)',
        'glow-cyan':  'var(--shadow-glow-cyan)',
        'glow-pink':  '0 0 24px rgba(255,122,217,0.25)',
        'panel':      'var(--shadow-md)',
        'panel-lg':   'var(--shadow-lg)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.07)',
      },
      animation: {
        'fade-in':        'fadeIn 0.3s ease-in-out',
        'fade-in-up':     'fadeInUp 0.35s ease-out',
        'slide-in-left':  'slideInLeft 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'slide-in-up':    'slideInUp 0.4s ease-out',
        'slide-in-down':  'slideInDown 0.4s ease-out',
        'glow':           'glow 2.5s ease-in-out infinite',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'message-in':     'messageIn 0.25s ease-out',
        'gradient-shift': 'gradientShift 18s ease infinite',
        'orb-1':          'orb-drift-1 25s ease-in-out infinite',
        'orb-2':          'orb-drift-2 30s ease-in-out infinite',
        'bounce-gentle':  'bounce 2s infinite',
      },
      keyframes: {
        fadeIn:          { from:{opacity:'0'}, to:{opacity:'1'} },
        fadeInUp:        { from:{opacity:'0',transform:'translateY(12px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        slideInLeft:     { from:{transform:'translateX(-30px)',opacity:'0'}, to:{transform:'translateX(0)',opacity:'1'} },
        slideInRight:    { from:{transform:'translateX(30px)',opacity:'0'},  to:{transform:'translateX(0)',opacity:'1'} },
        slideInUp:       { from:{transform:'translateY(20px)',opacity:'0'},  to:{transform:'translateY(0)',opacity:'1'} },
        slideInDown:     { from:{transform:'translateY(-20px)',opacity:'0'}, to:{transform:'translateY(0)',opacity:'1'} },
        glow:            { '0%,100%':{boxShadow:'var(--shadow-glow)'}, '50%':{boxShadow:'0 0 36px rgba(106,92,255,0.55)'} },
        messageIn:       { from:{opacity:'0',transform:'translateY(8px)'}, to:{opacity:'1',transform:'translateY(0)'} },
        gradientShift:   { '0%,100%':{backgroundPosition:'0% 50%'}, '50%':{backgroundPosition:'100% 50%'} },
        'orb-drift-1':   { '0%':{transform:'translate(0,0) scale(1)'}, '50%':{transform:'translate(80px,-60px) scale(1.15)'}, '100%':{transform:'translate(0,0) scale(1)'} },
        'orb-drift-2':   { '0%':{transform:'translate(0,0) scale(1)'}, '50%':{transform:'translate(-60px,80px) scale(1.1)'},  '100%':{transform:'translate(0,0) scale(1)'} },
      },
      spacing: {
        '18':  '4.5rem',
        '22':  '5.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

