import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { usePathname } from 'expo-router';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

const ThemeToggle = () => {
	const { mode, toggleTheme } = useColorMode();
	const { language } = useLanguage();
	const dark = mode === 'dark';
	const label = dark
		? language === 'fr'
			? 'Activer le mode clair'
			: 'Switch to light mode'
		: language === 'fr'
			? 'Activer le mode sombre'
			: 'Switch to dark mode';
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={toggleTheme}
			className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-700"
		>
			<MaterialIcons
				name={dark ? 'light-mode' : 'dark-mode'}
				size={21}
				color={mode === 'dark' ? colors.lightText : '#334155'}
			/>
		</Pressable>
	);
};
// Native auth layouts reserve the same compact row instead of a browser fixed overlay.
export const AuthThemeToggle = () => {
	const pathname = usePathname();
	if (pathname !== '/login' && !pathname?.startsWith('/reset-password')) return null;
	return <ThemeToggle />;
};
export default ThemeToggle;
