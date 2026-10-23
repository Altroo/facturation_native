import type { DataGridTheme } from 'expo-flash-datagrid';

// Native props and styles use these values. Tailwind class tokens live in styles/globals.css.
export const colors = {
	brand: '#0274d7',
	brandDisabled: '#93c5fd',
	ink: '#0d070b',
	night: '#121722',
	panel: '#222c3d',
	white: '#ffffff',
	screenBackground: '#f5f5f5',
	danger: '#dc2626',
	dangerBorder: '#ef4444',
	dangerStrong: '#b91c1c',
	dangerBackground: '#fef2f2',
	dangerDarkForeground: '#fca5a5',
	dangerDarkBorder: '#7f4b52',
	dangerDarkBackground: '#39272f',
	success: '#059669',
	conversion: '#2e7d32',
	warning: '#d97706',
	info: '#0284c7',
	maintenance: '#c2410c',
	// Shade numbers match the slate classes used in the app.
	slate: {
		50: '#f8fafc',
		100: '#f1f5f9',
		200: '#e2e8f0',
		300: '#cbd5e1',
		400: '#94a3b8',
		500: '#64748b',
		600: '#475569',
		700: '#334155',
		800: '#1e293b',
		900: '#0f172a',
	},
} as const;

// Lists share one surface outline and corner radius in both color modes.
export const listSpacing = 16;

export const surfaceStyles = {
	light: { borderWidth: 1, borderRadius: 16, borderColor: colors.slate[200], backgroundColor: colors.white },
	dark: { borderWidth: 1, borderRadius: 16, borderColor: colors.slate[600], backgroundColor: colors.panel },
} as const;

export const cardShadows = {
	light: { boxShadow: '0px 3px 12px rgba(13, 7, 11, 0.09)' },
	dark: { boxShadow: '0px 3px 12px rgba(0, 0, 0, 0.28)' },
} as const;

export const navigationShadows = {
	light: { boxShadow: '0px -3px 18px rgba(13, 7, 11, 0.09)' },
	dark: { boxShadow: '0px -3px 18px rgba(0, 0, 0, 0.3)' },
	addLight: { boxShadow: `0px 6px 14px ${colors.brand}55` },
	addDark: { boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.5)' },
} as const;

// Use the same names when loading fonts and setting native fontFamily props.
export const fonts = {
	regular: 'Poppins',
	medium: 'PoppinsMedium',
	semibold: 'PoppinsSemiBold',
} as const;

// Text fields and both kinds of picker share their value/placeholder typography.
export const inputTextStyle = { fontFamily: fonts.regular, fontSize: 16 } as const;

export const dataGridThemes: Record<'light' | 'dark', DataGridTheme> = {
	light: {
		headerBackground: '#eef4fa',
		headerTextColor: colors.slate[700],
		rowBackground: colors.white,
		rowAltBackground: colors.slate[50],
		rowTextColor: colors.slate[900],
		borderColor: colors.slate[300],
		dividerColor: colors.slate[200],
		toolbarBackground: colors.slate[50],
		toolbarTextColor: colors.slate[700],
		footerBackground: colors.white,
		selectionBackground: '#dbeafe',
		borderRadius: 12,
	},
	dark: {
		headerBackground: colors.slate[800],
		headerTextColor: colors.slate[200],
		rowBackground: '#162236',
		rowAltBackground: colors.slate[800],
		rowTextColor: colors.slate[100],
		borderColor: colors.slate[600],
		dividerColor: colors.slate[700],
		toolbarBackground: colors.slate[900],
		toolbarTextColor: colors.slate[200],
		footerBackground: colors.slate[800],
		selectionBackground: '#1e40af',
		borderRadius: 12,
	},
};
