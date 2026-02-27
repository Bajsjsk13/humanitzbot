/* HumanitZ Panel — Tailwind CSS Configuration */
/* Post-outbreak field station: worn earth, dried blood, functional severity */
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Base surfaces — scorched dark with ashen warmth */
        surface: { 50: '#262220', 100: '#1f1c1a', 200: '#191614', 300: '#12100e' },
        border: { DEFAULT: '#302a25', light: '#3d3630' },
        /* Primary accent — warm amber/copper (field radio dial) */
        accent: { DEFAULT: '#d4915c', hover: '#e0a472', dim: 'rgba(212,145,92,0.12)' },
        /* Semantic — survival palette */
        calm: '#6dba82',    /* faded green — alive, safe */
        surge: '#d4a843',   /* ochre/gold — warning */
        horde: '#c45a4a',   /* brick red — danger, death */
        blood: '#8b3a3a',   /* dried blood — severity accent */
        rust: '#9c6844',    /* oxidised metal — wear, age */
        ash: '#3a3633',     /* burned residue */
        muted: '#7a746c',   /* warm gray */
        text: { DEFAULT: '#c8c2b8', bright: '#e8e3db', dim: '#5c574f' },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        heading: ['"Red Rose"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'worn': '0 1px 0 0 rgba(60,52,44,0.4)',
        'panel': '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(48,42,37,0.3)',
      },
    },
  },
};
