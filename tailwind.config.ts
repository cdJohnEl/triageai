import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          50: '#f3f9f1', 100: '#e3f2de', 200: '#c9e6c0', 300: '#a7d49b', 400: '#82bd75',
          500: '#5fa353', 600: '#4a8441', 700: '#3b6a35', 800: '#2c5230', 900: '#1f3d24',
        },
      },
    },
  },
  plugins: [],
};
export default config;
