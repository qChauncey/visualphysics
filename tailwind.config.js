/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontFamily: {
      display: ['var(--font-display)', 'Georgia', 'serif'],
      sans:    ['var(--font-body)',    'system-ui', 'sans-serif'],
      mono:    ['var(--font-mono)',    'monospace'],
    },
    extend: {
      colors: {
        warm:   '#f0ede8',
        accent: '#c8955a',
        canvas: '#080808',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
