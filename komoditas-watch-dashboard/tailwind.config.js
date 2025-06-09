/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#2B5D3A',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: '#4A90E2',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				accent: {
					DEFAULT: '#F5A623',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				// Enhanced Color Coding System
				status: {
					danger: {
						DEFAULT: '#DC2626', // Red - High prices/inflation (>10%)
						light: '#FEE2E2',
						dark: '#991B1B',
					},
					warning: {
						DEFAULT: '#F59E0B', // Yellow - Volatility/caution (5-10%)
						light: '#FEF3C7',
						dark: '#D97706',
					},
					success: {
						DEFAULT: '#059669', // Green - Stable/abundant (<5%)
						light: '#D1FAE5',
						dark: '#047857',
					},
					info: {
						DEFAULT: '#2563EB', // Blue - Neutral/baseline
						light: '#DBEAFE',
						dark: '#1D4ED8',
					},
					critical: {
						DEFAULT: '#EA580C', // Orange - Critical alerts
						light: '#FED7AA',
						dark: '#C2410C',
					},
				},
				// Professional Bloomberg-style colors
				bloomberg: {
					dark: '#0D1117',
					darkSecondary: '#161B22',
					darkAccent: '#21262D',
					orange: '#FF6B35',
					blue: '#0066CC',
					green: '#00D26A',
					yellow: '#FFD23F',
				},
				// Enhanced chart colors
				chart: {
					1: '#2563EB', // Blue
					2: '#059669', // Green  
					3: '#DC2626', // Red
					4: '#F59E0B', // Yellow
					5: '#8B5CF6', // Purple
					6: '#EF4444', // Light Red
					7: '#10B981', // Emerald
					8: '#F97316', // Orange
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '1rem',
				'2xl': '1.5rem',
			},
			fontFamily: {
				'inter': ['Inter', 'sans-serif'],
				'roboto': ['Roboto', 'sans-serif'],
				'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
			},
			fontSize: {
				'2xs': ['0.625rem', { lineHeight: '0.75rem' }],
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
			},
			boxShadow: {
				'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
				'bloomberg': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				'depth': '0 8px 30px rgba(0, 0, 0, 0.12)',
			},
			backdropBlur: {
				'xs': '2px',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(10px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				'pulse-slow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' },
				},
				'bounce-gentle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-2px)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'bounce-gentle': 'bounce-gentle 2s infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}