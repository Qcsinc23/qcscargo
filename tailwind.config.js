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
					// Shopify-Inspired Sophisticated Color Scheme
					shopify: {
						rose: '#fdf2f8', // Light pink/rose background
						roseDark: '#fce7f3', // Gradient background end
						maroon: '#881337', // Dark maroon primary text
						roseGray: '#9f1239', // Muted rose-gray secondary text
						pink: '#be185d', // Dark pink/purple CTA buttons
						lavender: '#e879f9', // Light purple highlights
						silver: '#64748b', // Muted grey/silver elements
						white: '#ffffff', // Clean white backgrounds
						roseLight: '#fdf2f8', // Light rose section backgrounds
						success: '#10b981', // Adapted green for success
						warning: '#f59e0b', // Harmonious warning color
						error: '#dc2626', // Adapted error red
					},
					primary: {
						DEFAULT: 'hsl(var(--primary))',
						foreground: 'hsl(var(--primary-foreground))',
					},
					secondary: {
						DEFAULT: 'hsl(var(--secondary))',
						foreground: 'hsl(var(--secondary-foreground))',
					},
					accent: {
						DEFAULT: '#F5A623', // Yellow accent for emphasis
						foreground: 'hsl(var(--accent-foreground))',
					},
					destructive: {
						DEFAULT: '#dc2626', // Adapted error red
						foreground: '#ffffff',
					},
					muted: {
						DEFAULT: '#fdf2f8', // Light rose surface
						foreground: '#64748b',
					},
					success: {
						DEFAULT: '#10b981', // Adapted green
						foreground: '#ffffff',
					},
					warning: {
						DEFAULT: '#f59e0b', // Harmonious warning
						foreground: '#ffffff',
					},
					popover: {
						DEFAULT: 'hsl(var(--popover))',
						foreground: 'hsl(var(--popover-foreground))',
					},
					card: {
						DEFAULT: 'hsl(var(--card))',
						foreground: 'hsl(var(--card-foreground))',
					},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
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
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
