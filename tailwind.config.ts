import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#347B23',
        secondary: '#3B9326',
        accent: '#3B9326',
        highlight: '#007A33',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        border: '#C9D4DF',
        text: {
          DEFAULT: '#44474B',
          secondary: '#585D61',
          inverse: '#FFFFFF',
          link: '#3B9326',
        },
        status: {
          success: '#347B23',
          warning: '#8C6516',
          error: '#C0392B',
          info: '#3B7DBF',
        },
        navDark: '#347B23',
        lime: '#C3D600',
        avocado: '#007A33',
        mint: '#EFF8EA',
        sectionGray: '#F4F7F9',
        iconTint: '#EFF8EA',
        infoPanel: '#F4F7F9',
        hazteBg: 'rgba(59, 146, 38, 0.12)',
        alertBg: '#FFF4DF',
        alertText: '#8C6516',
        footerBg: '#262729',
        footerMuted: '#C9D4DF',
        wordmark: '#585D61',
        cmr: {
          gold: '#B08D3E',
          green: '#347B23',
          black: '#1A1A1A',
        },
      },
      fontFamily: {
        heading: ['Figtree', 'Arial', 'sans-serif'],
        body: ['Figtree', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        h1: ['2.5rem', { lineHeight: '3.5rem', letterSpacing: '-0.02em', fontWeight: '500' }],
        h2: ['2rem', { lineHeight: '2.8rem', letterSpacing: '-0.02em', fontWeight: '450' }],
        h3: ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        h4: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        h5: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        body: ['1rem', { lineHeight: '1.5rem', fontWeight: '450' }],
        small: ['0.875rem', { lineHeight: '1.25rem' }],
        nav: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 1px rgba(0, 51, 102, 0.05), 0 3px 6px rgba(0, 51, 102, 0.05)',
        md: '0 1px 1px rgba(0, 0, 0, 0.05), 0 9px 18px rgba(0, 0, 0, 0.05)',
        lg: '0 12px 32px rgba(23, 23, 23, 0.12)',
      },
      maxWidth: {
        page: '1248px',
      },
      spacing: {
        section: '4rem',
      },
    },
  },
  plugins: [],
} satisfies Config
