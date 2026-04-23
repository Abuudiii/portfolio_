import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF7F0',
        'bg-soft': '#F3EFE5',
        ink: '#1A1A19',
        'ink-soft': '#4A4A47',
        'ink-faint': '#8A857A',
        rule: '#D9D3C4',
        ember: '#B8462B',
        'ember-soft': '#C9684F',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        serif: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'system-ui',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(4rem, 10vw, 7.5rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(3rem, 6vw, 5rem)', { lineHeight: '1', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
      },
      maxWidth: {
        prose: '680px',
        page: '640px',
        grid: '1040px',
      },
      spacing: {
        section: 'clamp(4rem, 10vw, 8rem)',
      },
    },
  },
  plugins: [],
} satisfies Config;
