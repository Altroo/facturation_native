import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Button, Text, TextInput } from 'react-native';
import { StrictMode, useState } from 'react';
import { Uniwind } from 'uniwind';
import ThemeProvider, { useColorMode } from './themeProvider';
import { LanguageContextProvider } from '@/contexts/languageContext';
import { useLanguage } from '@/utils/hooks';
import { resolveColorMode } from '@/utils/colorMode';
import { useTheme } from 'expo-router';

const Example = () => {
	const [value, setValue] = useState('');
	const { language, setLanguage } = useLanguage();
	const { mode, toggleTheme } = useColorMode();
	const navigationTheme = useTheme();
	return (
		<>
			<Text>
				{language}/{mode}
			</Text>
			<Text>Navigation theme: {navigationTheme.dark ? 'dark' : 'light'}</Text>
			<Button title="Language" onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')} />
			<Button title="Theme" onPress={toggleTheme} />
			<TextInput accessibilityLabel="Unfinished work" value={value} onChangeText={setValue} />
		</>
	);
};
const setup = async () =>
	await render(
		<ThemeProvider>
			<LanguageContextProvider>
				<Example />
			</LanguageContextProvider>
		</ThemeProvider>,
	);
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
});
it('restores both original independent preference keys before exposing the application', async () => {
	jest
		.mocked(AsyncStorage.getItem)
		.mockImplementation(async (key) => ({ 'app-language': 'en', 'app-theme': 'dark' })[key] ?? null);
	await setup();
	await screen.findByText('en/dark');
	expect(screen.getByText('Navigation theme: dark')).toBeOnTheScreen();
	expect(Uniwind.setTheme).toHaveBeenLastCalledWith('dark');
	expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
	expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('app-language', expect.anything());
	expect(
		jest
			.mocked(AsyncStorage.getItem)
			.mock.calls.map(([key]) => key)
			.sort(),
	).toEqual(['app-language', 'app-theme']);
});
it('uses defaults for unsupported saved language and theme values', async () => {
	jest
		.mocked(AsyncStorage.getItem)
		.mockImplementation(async (key) => ({ 'app-language': 'xx', 'app-theme': 'sepia' })[key] ?? null);
	await setup();
	await screen.findByText('fr/light');
});
it('keeps language and theme interactive when storage is unavailable', async () => {
	jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('Unavailable'));
	jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('Full'));
	await setup();
	await screen.findByText('fr/light');
	await fireEvent.press(screen.getByText('Language'));
	await fireEvent.press(screen.getByText('Theme'));
	await screen.findByText('en/dark');
	await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-language', 'en'));
	expect(Uniwind.setTheme).toHaveBeenLastCalledWith('dark');
	jest.mocked(AsyncStorage.setItem).mockResolvedValue();
});
it('never overwrites preferences while hydration is pending or after unmount', async () => {
	let finish!: (value: string | null) => void;
	jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const view = await setup();
	expect(screen.queryByText('fr/light')).toBeNull();
	expect(AsyncStorage.setItem).not.toHaveBeenCalled();
	await view.unmount();
	await act(async () => finish('dark'));
	expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('starts in the supplied initial theme when there is no saved preference', async () => {
	await render(
		<ThemeProvider initialTheme="dark">
			<LanguageContextProvider>
				<Example />
			</LanguageContextProvider>
		</ThemeProvider>,
	);
	await screen.findByText('fr/dark');
	expect(Uniwind.setTheme).toHaveBeenLastCalledWith('dark');
	expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
});
it('switches themes and remembers the preference without losing unfinished input', async () => {
	await setup();
	await screen.findByText('fr/light');
	await fireEvent.changeText(screen.getByLabelText('Unfinished work'), 'Unsaved invoice');
	expect(screen.getByText('Navigation theme: light')).toBeOnTheScreen();
	await fireEvent.press(screen.getByText('Theme'));
	await screen.findByText('fr/dark');
	expect(screen.getByText('Navigation theme: dark')).toBeOnTheScreen();
	expect(screen.getByLabelText('Unfinished work')).toHaveDisplayValue('Unsaved invoice');
	expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
	await fireEvent.press(screen.getByText('Theme'));
	await screen.findByText('fr/light');
	expect(screen.getByText('Navigation theme: light')).toBeOnTheScreen();
	expect(screen.getByLabelText('Unfinished work')).toHaveDisplayValue('Unsaved invoice');
	expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-theme', 'light');
});

it.each([
	['light', 'dark'],
	['dark', 'light'],
] as const)(
	'keeps the supplied %s theme instead of restoring the conflicting %s preference',
	async (initialTheme, saved) => {
		jest.mocked(AsyncStorage.getItem).mockResolvedValue(saved);
		await render(
			<ThemeProvider initialTheme={initialTheme}>
				<LanguageContextProvider initialLanguage="fr">
					<Example />
				</LanguageContextProvider>
			</ThemeProvider>,
		);
		expect(screen.getByText('fr/' + initialTheme)).toBeOnTheScreen();
		expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('app-theme');
		expect(Uniwind.setTheme).toHaveBeenLastCalledWith(initialTheme);
		expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-theme', initialTheme);
	},
);

it('keeps the selected theme interactive when a supplied initial theme skips storage restoration', async () => {
	await render(
		<ThemeProvider initialTheme="dark">
			<LanguageContextProvider initialLanguage="fr">
				<Example />
			</LanguageContextProvider>
		</ThemeProvider>,
	);
	await fireEvent.press(screen.getByText('Theme'));
	expect(screen.getByText('fr/light')).toBeOnTheScreen();
	expect(Uniwind.setTheme).toHaveBeenLastCalledWith('light');
	expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('app-theme', 'light');
});

it('restores and applies the saved theme after StrictMode replays its lifecycle', async () => {
	jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => (key === 'app-theme' ? 'dark' : null));
	await render(
		<StrictMode>
			<ThemeProvider>
				<LanguageContextProvider>
					<Example />
				</LanguageContextProvider>
			</ThemeProvider>
		</StrictMode>,
	);
	await screen.findByText('fr/dark');
	expect(Uniwind.setTheme).toHaveBeenLastCalledWith('dark');
	expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('app-theme', 'light');
});

it('uses the same saved theme fallback as the web', () => {
	expect(resolveColorMode(undefined)).toBe('light');
	expect(resolveColorMode('invalid')).toBe('light');
	expect(resolveColorMode('light')).toBe('light');
	expect(resolveColorMode('dark')).toBe('dark');
});
