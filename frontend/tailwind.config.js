/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-offwhite)',
        canvas: 'var(--color-offwhite)',
        surface: 'var(--color-white)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-green-primary)',
          dark: 'var(--color-green-dark)',
          light: 'var(--color-green-light)',
          border: 'var(--color-green-border)',
        },
        brand: {
          green: 'var(--color-green-primary)',
          'green-dark': 'var(--color-green-dark)',
          'green-light': 'var(--color-green-light)',
        },
        charcoal: {
          DEFAULT: 'var(--color-charcoal-dark)',
          dark: 'var(--color-black)',
          muted: 'var(--color-gray-muted)',
        },
        muted: {
          DEFAULT: 'var(--color-gray-light)',
          foreground: 'var(--color-gray-muted)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
          info: 'var(--color-status-info)',
        },
        category: {
          family: 'var(--cat-family)',
          school: 'var(--cat-school)',
          business: 'var(--cat-business)',
          food: 'var(--cat-food)',
          landmark: 'var(--cat-landmark)',
          community: 'var(--cat-community)',
          culture: 'var(--cat-culture)',
          event: 'var(--cat-event)',
          historical: 'var(--cat-historical)',
          personal: 'var(--cat-personal)',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        heading: [
          '"Fraunces"',
          'Georgia',
          'serif',
        ],
        body: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
    },
  },
  plugins: [],
};
