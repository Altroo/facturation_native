import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ThemeProvider from '@/providers/themeProvider';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import ThemeToggle, { AuthThemeToggle } from './themeToggle';
import { usePathname } from 'expo-router';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

jest.mock('expo-router', () => ({
	...jest.requireActual<typeof import('expo-router')>('expo-router'),
	usePathname: jest.fn(),
}));

beforeEach(() => {
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});

describe('ThemeToggle', () => {
	it('announces and performs the next theme action in the selected language', async () => {
		await render(
			<LanguageContext.Provider value={{ language: 'en', t: translations.en, setLanguage: jest.fn() }}>
				<ThemeProvider>
					<ThemeToggle />
				</ThemeProvider>
			</LanguageContext.Provider>,
		);
		await fireEvent.press(await screen.findByRole('button', { name: 'Switch to dark mode' }));
		expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeOnTheScreen();
	});

	it('only renders the auth toggle on login and recovery routes', async () => {
		jest.mocked(usePathname).mockReturnValue('/login');
		const view = await render(<AuthThemeToggle />);
		expect(screen.getByRole('button', { name: 'Activer le mode sombre' })).toBeOnTheScreen();
		jest.mocked(usePathname).mockReturnValue('/reset-password/enter-code');
		await view.rerender(<AuthThemeToggle />);
		expect(screen.getByRole('button')).toBeOnTheScreen();
		jest.mocked(usePathname).mockReturnValue('/users');
		await view.rerender(<AuthThemeToggle />);
		expect(screen.queryByRole('button')).toBeNull();
	});
});
