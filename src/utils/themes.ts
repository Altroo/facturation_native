import type { DataGridTheme } from 'expo-flash-datagrid';
export const dataGridThemes: Record<'light' | 'dark', DataGridTheme> = {
	light: {
		headerBackground: '#eef4fa',
		headerTextColor: '#334155',
		rowBackground: '#ffffff',
		rowAltBackground: '#f8fafc',
		rowTextColor: '#0f172a',
		borderColor: '#cbd5e1',
		dividerColor: '#e2e8f0',
		toolbarBackground: '#f8fafc',
		toolbarTextColor: '#334155',
		footerBackground: '#ffffff',
		selectionBackground: '#dbeafe',
		borderRadius: 12,
	},
	dark: {
		headerBackground: '#1e293b',
		headerTextColor: '#e2e8f0',
		rowBackground: '#162236',
		rowAltBackground: '#1e293b',
		rowTextColor: '#f1f5f9',
		borderColor: '#475569',
		dividerColor: '#334155',
		toolbarBackground: '#0f172a',
		toolbarTextColor: '#e2e8f0',
		footerBackground: '#1e293b',
		selectionBackground: '#1e40af',
		borderRadius: 12,
	},
};

// Native colors used by navigator headers and icons; Tailwind tokens live in styles/globals.css.
export const colors = {
	brand: '#0274d7',
	ink: '#0d070b',
	night: '#121722',
	panel: '#222c3d',
	white: '#fff',
	lightText: '#f1f5f9',
	lightBackground: '#f8fafc',
};
