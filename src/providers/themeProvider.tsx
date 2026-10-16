import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';
import { resolveColorMode, type ColorMode } from '@/utils/colorMode';

const STORAGE_KEY = 'app-theme';
const ColorModeContext = createContext<{ mode: ColorMode; toggleTheme: () => void }>({
	mode: 'light',
	toggleTheme: () => {},
});
export const useColorMode = () => useContext(ColorModeContext);

const ThemeProvider = ({ children, initialTheme }: { children: ReactNode; initialTheme?: ColorMode }) => {
	const [mode, setMode] = useState<ColorMode>(initialTheme ?? 'light');
	const [ready, setReady] = useState(initialTheme !== undefined);
	useEffect(() => {
		// Web receives its saved cookie from RootLayout. Native restores device storage
		// only when no initial theme was supplied by the caller.
		if (initialTheme !== undefined) return;
		let mounted = true;
		const restore = async () => {
			try {
				const value = await AsyncStorage.getItem(STORAGE_KEY);
				if (mounted) setMode(resolveColorMode(value ?? undefined));
			} catch {
				/* Keep the in-memory theme when storage is unavailable. */
			} finally {
				if (mounted) setReady(true);
			}
		};
		void restore();
		return () => {
			mounted = false;
		};
	}, [initialTheme]);
	useEffect(() => {
		if (!ready) return;
		Uniwind.setTheme(mode);
		void AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
	}, [mode, ready]);
	if (!ready) return null;
	return (
		<ColorModeContext
			value={{ mode, toggleTheme: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')) }}
		>
			<StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
			{children}
		</ColorModeContext>
	);
};

export default ThemeProvider;
