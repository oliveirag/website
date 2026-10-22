/** @type {import('tailwindcss').Config} */
// Colors, radii and motion come from oliveirag/design-system via the CSS variables in src/styles/tokens.css.
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
	  extend: {
		fontFamily: {
		  sans: ['JetBrains Mono', 'monospace', 'sans-serif'],
		},
		textColor: {
		  primary: 'var(--text-primary)',
		  secondary: 'var(--text-secondary)',
		  tertiary: 'var(--text-tertiary)',
		  disabled: 'var(--text-disabled)',
		  action: 'var(--text-action)',
		  'action-hover': 'var(--text-action-hover)',
		  'on-action': 'var(--text-on-action)',
		  error: 'var(--text-error)',
		  'icon-primary': 'var(--icon-primary)',
		  'icon-secondary': 'var(--icon-secondary)',
		  'icon-disabled': 'var(--icon-disabled)',
		},
		backgroundColor: {
		  page: 'var(--surface-page)',
		  surface: 'var(--surface-default)',
		  raised: 'var(--surface-raised)',
		  field: 'var(--surface-field)',
		  hover: 'var(--surface-hover)',
		  selected: 'var(--surface-selected)',
		  action: 'var(--surface-action)',
		  'action-hover': 'var(--surface-action-hover)',
		  disabled: 'var(--surface-disabled)',
		},
		borderColor: {
		  DEFAULT: 'var(--border-default)',
		  strong: 'var(--border-strong)',
		  control: 'var(--border-control)',
		  'control-hover': 'var(--border-control-hover)',
		  focus: 'var(--border-focus)',
		  error: 'var(--border-error)',
		},
		gradientColorStops: {
		  surface: 'var(--surface-default)',
		},
		borderRadius: {
		  sm: '4px',
		  DEFAULT: '4px',
		  md: '8px',
		  lg: '12px',
		  xl: '16px',
		},
		transitionTimingFunction: {
		  out: 'cubic-bezier(0.23, 1, 0.32, 1)',
		  'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
		},
		transitionDuration: {
		  press: '160ms',
		  fast: '150ms',
		  base: '200ms',
		},
	  },
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('tailwindcss-motion')
	],
  }
