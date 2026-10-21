/** @type {import('tailwindcss').Config} */

// hmsk.life "Letterpress" A1 Ink Blue. The colour names the components already use (slate, brand, emerald, red,
// amber, blue) are remapped onto the A1 palette, so every existing class resolves to an A1 colour.
// Text shades (slate-400 and darker, *-500 and darker) are >= 4.5:1 on paper, paper-2 and card.
const a1 = {
  paper: '#EFF1F2', 'paper-2': '#E2E6E9', card: '#F8F9FA',
  ink: '#151B24', 'ink-2': '#4A5562', rule: '#CBD2D9', 'rule-strong': '#7B8592',
  accent: '#1E4C8A', 'accent-hover': '#163A6B', 'accent-tint': '#DCE6F3', mark: '#A8C8F2',
}

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ...a1,
        sidebar: {
          DEFAULT: a1['paper-2'],
          hover: a1.paper,
          active: a1.card,
          border: a1.rule,
        },
        // neutrals: 50 paper, 100 paper-2, 200 rule (dividers), 300 rule-strong (borders, icons), 400+ text
        slate: {
          50: a1.paper, 100: a1['paper-2'], 200: a1.rule, 300: a1['rule-strong'],
          400: '#5A6572', 500: a1['ink-2'], 600: '#3D4752', 700: '#2C3440', 800: '#1F2630', 900: a1.ink,
        },
        brand: {
          50: a1['accent-tint'], 100: '#C5D5EA', 200: a1.mark, 300: a1.mark,
          400: '#4B78B4', 500: a1.accent, 600: a1['accent-hover'], 700: '#122F57',
        },
        blue: {
          50: a1['accent-tint'], 100: '#C5D5EA', 200: a1.mark,
          500: a1.accent, 600: a1['accent-hover'], 700: a1['accent-hover'],
        },
        // status: ok, danger, warn (A1 status hues and their tints)
        emerald: {
          50: '#E0ECE4', 100: '#CADDD0', 200: '#A9C7B3',
          500: '#2B6440', 600: '#245637', 700: '#245637', 800: '#1D452C',
        },
        red: {
          50: '#F6E3E2', 100: '#EDCDCB', 200: '#DDA9A6', 300: '#C46E70',
          400: '#A3262A', 500: '#A3262A', 600: '#8C1F23', 700: '#7A1B1F',
        },
        amber: {
          50: '#F4EAD6', 100: '#EAD9B8', 200: '#DDC594',
          400: '#9A6A10', 500: '#7A4E00', 600: '#6A4400', 700: '#7A4E00', 800: '#5E3C00',
        },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['Newsreader', '"Iowan Old Style"', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '4px',
        xl: '6px',
        '2xl': '6px',
        '3xl': '8px',
      },
      boxShadow: {
        soft: '0 30px 60px -40px rgba(21, 27, 36, .4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
