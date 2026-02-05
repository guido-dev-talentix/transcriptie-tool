/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Search X Brand Colors
        brand: {
          blue: '#193254',
          'blue-dark': '#0f1f38',
          'blue-light': '#253d66',
          'light-blue': '#94D4E9',
          yellow: '#FDD963',
          red: '#EC6278',
          white: '#FFFFFF',
        },
        // Semantic colors based on brand
        primary: {
          DEFAULT: '#193254',
          dark: '#0f1f38',
          light: '#253d66',
        },
        accent: {
          DEFAULT: '#94D4E9',
          hover: '#7bc8e0',
          glow: 'rgba(148, 212, 233, 0.2)',
        },
        cta: {
          yellow: '#FDD963',
          'yellow-hover': '#fcce3a',
          red: '#EC6278',
          'red-hover': '#e84862',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          card: '#FFFFFF',
        },
        slate: {
          DEFAULT: '#64748B',
          light: '#94A3B8',
        },
      },
      fontFamily: {
        // Fractul for headings - using a similar geometric sans-serif
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        // Roboto for body text
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Search X Typography Scale
        'heading-xl': ['4.1875rem', { lineHeight: '1.1', fontWeight: '700' }], // 67px
        'heading-l': ['2.375rem', { lineHeight: '1.2', fontWeight: '600' }],   // 38px
        'heading-s': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],    // 28px
        'body-l': ['1rem', { lineHeight: '1.6', fontWeight: '300' }],          // 16px
        'body': ['0.75rem', { lineHeight: '1.5', fontWeight: '300' }],         // 12px
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(25, 50, 84, 0.08), 0 1px 2px rgba(25, 50, 84, 0.04)',
        'card-hover': '0 10px 40px rgba(25, 50, 84, 0.12), 0 4px 12px rgba(25, 50, 84, 0.06)',
        'glow': '0 0 30px rgba(148, 212, 233, 0.4)',
        'glow-sm': '0 0 15px rgba(148, 212, 233, 0.25)',
        'glow-yellow': '0 0 30px rgba(253, 217, 99, 0.4)',
        'button': '0 4px 14px rgba(25, 50, 84, 0.25)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #193254 0%, #253d66 50%, #193254 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0f1f38 0%, #193254 100%)',
        'gradient-accent': 'linear-gradient(135deg, #94D4E9 0%, #7bc8e0 100%)',
        'gradient-yellow': 'linear-gradient(135deg, #FDD963 0%, #fcce3a 100%)',
        'gradient-hero': 'radial-gradient(ellipse at top, #253d66 0%, #193254 50%, #0f1f38 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}
