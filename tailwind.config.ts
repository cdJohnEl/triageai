import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        mute: 'var(--mute)',
        brand: { DEFAULT: 'var(--brand)', dark: 'var(--brand-dark)', soft: 'var(--brand-soft)' },
        tri: {
          red: 'var(--tri-red)',
          redSoft: 'var(--tri-red-soft)',
          redInk: 'var(--tri-red-ink)',
          amber: 'var(--tri-amber)',
          amberSoft: 'var(--tri-amber-soft)',
          amberInk: 'var(--tri-amber-ink)',
          ok: 'var(--tri-ok)',
          okSoft: 'var(--tri-ok-soft)',
          okInk: 'var(--tri-ok-ink)',
        },
      },
      fontFamily: {
        sans: ['"Figtree Variable"', '"Noto Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;