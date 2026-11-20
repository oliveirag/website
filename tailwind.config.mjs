// Colors, radii and motion come from oliveirag/design-system via the CSS variables in src/styles/tokens.css.
const mono = ['JetBrains Mono', 'monospace', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	// dark: classes follow the Night theme on <html data-theme>, not the OS.
	darkMode: ['selector', '[data-theme="night"]'],
	theme: {
	  extend: {
		fontFamily: {
		  sans: mono,
		  // Thoughts posts and the Thoughts list (ADR-0001). The faces are in src/styles/thoughts.css.
		  reading: ['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'],
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
		// and reaches 4.5:1 on the Sky. Body text is the secondary grey and headings the primary, a little like
		// antwi.dev's posts, whose own grey is too light for the Sky in Day. Tertiary grey is left out: in Day it
		// can't reach 4.5:1 on the Sky. Sizes and gaps are in px, measured from antwi.dev's posts, so they don't
		// drift with prose's em-based defaults.
		typography: {
		  thoughts: {
			css: {
			  '--tw-prose-body': 'var(--text-secondary)',
			  '--tw-prose-headings': 'var(--text-primary)',
			  '--tw-prose-lead': 'var(--text-secondary)',
			  '--tw-prose-links': 'var(--text-action)',
			  '--tw-prose-bold': 'var(--text-primary)',
			  '--tw-prose-counters': 'var(--text-secondary)',
			  '--tw-prose-bullets': 'var(--text-secondary)',
			  '--tw-prose-hr': 'var(--reading-rule)',
			  '--tw-prose-quotes': 'var(--text-secondary)',
			  '--tw-prose-quote-borders': 'var(--reading-rule)',
			  '--tw-prose-captions': 'var(--text-secondary)',
			  '--tw-prose-kbd': 'var(--text-primary)',
			  '--tw-prose-code': 'var(--text-primary)',
			  '--tw-prose-pre-code': 'var(--text-primary)',
			  '--tw-prose-pre-bg': 'var(--surface-raised)',
			  '--tw-prose-th-borders': 'var(--border-strong)',
			  '--tw-prose-td-borders': 'var(--border-default)',
			  fontSize: '17px',
			  lineHeight: '28px',
			  'p, blockquote, ul, ol, pre, figure, table': { marginTop: '16px', marginBottom: '16px' },
			  hr: { marginTop: '32px', marginBottom: '32px' },
			  // Headings stay at the regular weight, like the page title, and stand out by size and colour.
			  h2: { marginTop: '32px', marginBottom: '16px', fontSize: '24px', lineHeight: '32px', fontWeight: '400' },
			  h3: { marginTop: '32px', marginBottom: '16px', fontSize: '20px', lineHeight: '28px', fontWeight: '400' },
			  // Only regular, italic and semibold are loaded, so nothing asks for a medium the font doesn't have.
			  'a, blockquote': { fontWeight: '400' },
			  a: { textUnderlineOffset: '3px' },
			  pre: { border: '1px solid var(--border-default)' },
			  // The post reads in Source Serif 4, but code stays in the site's mono, not the browser's default one.
			  'code, pre': { fontFamily: mono.join(', ') },
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
