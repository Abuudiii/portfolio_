import type { Config } from 'tailwindcss';

// Two colours only. Keep in sync with PAPER / INK in src/lib/orbit.ts.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#0b0b0b',
        ink: '#f0efe9',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
