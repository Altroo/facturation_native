import AsyncStorage from '@react-native-async-storage/async-storage';
import { StrictMode } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { useAssets } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { act, cleanup, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '@/app/_layout';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';

jest.mock('@/styles/globals.css', () => ({}));
jest.mock('expo-font', () => ({ ...jest.requireActual<typeof import('expo-font')>('expo-font'), useFonts: jest.fn() }));
jest.mock('expo-asset', () => ({
	...jest.requireActual<typeof import('expo-asset')>('expo-asset'),
	useAssets: jest.fn(),
}));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hide: jest.fn() }));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	const { createAuth } = jest.requireActual<typeof import('@/auth')>('@/auth');
	const publicInstance = create({
		adapter: async (config) => ({ data: { maintenance: false }, status: 200, statusText: 'OK', headers: {}, config }),
	});
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		publicInstance,
		auth: createAuth(publicInstance, { read: async () => null, write: async () => {} }),
	};
});
const Login = () => {
	const { language } = useLanguage();
	const { mode } = useColorMode();
	const status = useAppSelector((state) => state._init.status);
	return (
		<Text>
			{status}/{language}/{mode}
		</Text>
	);
};
const setup = async (strict = false) =>
	await renderRouter(
		{
			_layout: strict
				? () => (
						<StrictMode>
							<RootLayout />
						</StrictMode>
					)
				: RootLayout,
			login: Login,
			'reset-password/index': () => <Text>Recovery</Text>,
			'(app)/_layout': () => <Stack />,
			'(app)/index': () => <Text>Private</Text>,
		},
		{ initialUrl: '/login' },
	);
beforeEach(() => {
	jest.clearAllMocks();
	jest.useFakeTimers();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
	jest.mocked(useAssets).mockReturnValue([[], undefined]);
});
afterEach(async () => {
	await cleanup();
	jest.clearAllTimers();
	jest.useRealTimers();
});
it('mounts the actual original provider tree with restored preferences and the guest navigator', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	jest
		.mocked(AsyncStorage.getItem)
		.mockImplementation(async (key) => (key === 'app-theme' ? 'dark' : key === 'app-language' ? 'en' : null));
	await setup();
	await screen.findByText('guest/en/dark');
});
it('waits for fonts before mounting the app', async () => {
	jest.mocked(useFonts).mockReturnValue([false, null]);
	await setup();
	expect(screen.queryByText('guest/fr/light')).toBeNull();
	expect(AsyncStorage.getItem).not.toHaveBeenCalled();
	expect(SplashScreen.hide).not.toHaveBeenCalled();
});
it('keeps the splash visible while the logo is loading', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	jest.mocked(useAssets).mockReturnValue([undefined, undefined]);
	await setup();
	expect(screen.queryByTestId('app-root')).toBeNull();
	expect(AsyncStorage.getItem).not.toHaveBeenCalled();
	expect(SplashScreen.hide).not.toHaveBeenCalled();
});
it('hides the splash after saved preferences finish restoring and the app has laid out', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	const language = Promise.withResolvers<string | null>();
	jest
		.mocked(AsyncStorage.getItem)
		.mockImplementation(async (key) =>
			key === 'app-theme' ? 'dark' : key === 'app-language' ? language.promise : null,
		);
	await setup();
	expect(screen.queryByTestId('app-root')).toBeNull();
	expect(SplashScreen.hide).not.toHaveBeenCalled();
	await act(() => language.resolve('en'));
	await screen.findByText('guest/en/dark');
	expect(SplashScreen.hide).not.toHaveBeenCalled();
	await fireEvent(screen.getByTestId('app-root'), 'layout');
	expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
});
it('falls back to native fonts when loading fails instead of hiding the login screen', async () => {
	jest.mocked(useFonts).mockReturnValue([false, new Error('Font unavailable')]);
	await setup();
	await screen.findByText('guest/fr/light');
});
it('opens the app if logo loading fails instead of leaving the splash visible forever', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	jest.mocked(useAssets).mockReturnValue([undefined, new Error('Logo unavailable')]);
	await setup();
	await screen.findByText('guest/fr/light');
	await fireEvent(screen.getByTestId('app-root'), 'layout');
	expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
});
it('uses default preferences and releases the splash if preference storage fails', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('Storage unavailable'));
	await setup();
	await screen.findByText('guest/fr/light');
	await fireEvent(screen.getByTestId('app-root'), 'layout');
	expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
});
it('restarts initialization after StrictMode replays provider cleanup', async () => {
	jest.mocked(useFonts).mockReturnValue([true, null]);
	await setup(true);
	await screen.findByText('guest/fr/light');
});
