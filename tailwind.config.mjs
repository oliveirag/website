/** @type {import('tailwindcss').Config} */
// Colors, radii and motion come from oliveirag/design-system via the CSS variables in src/styles/tokens.css.
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	// dark: classes follow the Night theme on <html data-theme>, not the OS.
	darkMode: ['selector', '[data-theme="night"]'],
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
		// `prose-thoughts`: a Thoughts post's colours from the design tokens, so the text follows Night and Day
		// and reaches 4.5:1 on the sky. Tertiary grey is left out: in Day it can't reach that on the sky.
		typography: {
		  thoughts: {
			css: {
			  '--tw-prose-body': 'var(--text-primary)',
			  '--tw-prose-headings': 'var(--text-primary)',
			  '--tw-prose-lead': 'var(--text-secondary)',
			  '--tw-prose-links': 'var(--text-action)',
			  '--tw-prose-bold': 'var(--text-primary)',
			  '--tw-prose-counters': 'var(--text-secondary)',
			  '--tw-prose-bullets': 'var(--text-secondary)',
			  '--tw-prose-hr': 'var(--border-strong)',
			  '--tw-prose-quotes': 'var(--text-secondary)',
			  '--tw-prose-quote-borders': 'var(--border-strong)',
			  '--tw-prose-captions': 'var(--text-secondary)',
			  '--tw-prose-kbd': 'var(--text-primary)',
			  '--tw-prose-code': 'var(--text-primary)',
			  '--tw-prose-pre-code': 'var(--text-primary)',
			  '--tw-prose-pre-bg': 'var(--surface-raised)',
			  '--tw-prose-th-borders': 'var(--border-strong)',
			  '--tw-prose-td-borders': 'var(--border-default)',
			  a: { textUnderlineOffset: '3px' },
			  pre: { border: '1px solid var(--border-default)' },
			},
		  },
		},
	  },
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('tailwindcss-motion')
	],
  }
