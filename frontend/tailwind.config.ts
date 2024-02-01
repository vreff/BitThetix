import type { Config } from 'tailwindcss'

const config: Config = {
  mode: "jit",
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './app/*.{js,ts,jsx,tsx,mdx}',
    './lib/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [],
  corePlugins: {
    preflight: false,
  },
  theme: {
    animation: {
      'gradient': 'gradient 8s linear infinite',
    },
    keyframes: {
      'gradient': {
        to: { 'background-position': '200% center' },
      }
    }
  }
}
export default config
