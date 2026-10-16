import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';
import NotFound from '@/app/+not-found';
import { RootNavigator } from '@/app/_layout';
import _initReducer, { initToken, setAuthenticated } from '@/store/slices/_initSlice';
import { translations } from '@/translations';
import type { Language } from '@/types/languageTypes';

let mockLanguage: Language = 'fr';
jest.mock('@/styles/globals.css', () => ({}));
jest.mock('@expo/vector-icons/MaterialIcons', () => () => null);
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations[mockLanguage],
	}),
}));

const setup = async (authenticated = true) => {
	const store = configureStore({ reducer: { _init: _initReducer } });
	store.dispatch(authenticated ? setAuthenticated() : initToken());
	return renderRouter(
		{
			_layout: () => (
				<Provider store={store}>
					<RootNavigator />
				</Provider>
			),
			'+not-found': NotFound,
			login: () => <Text>Public login</Text>,
			'reset-password/_layout': () => <Stack />,
			'reset-password/index': () => <Text>Public recovery</Text>,
			'(app)/_layout': () => <Stack />,
			'(app)/index': () => <Text>Private dashboard</Text>,
		},
		{ initialUrl: '/missing-page' },
	);
};

describe('NotFound (404 page)', () => {
	beforeEach(() => {
		mockLanguage = 'fr';
	});

	it('renders the 404 text for an unmatched route', async () => {
		await setup();
		expect(screen.getByText('404')).toBeOnTheScreen();
	});

	it('renders "Page introuvable" heading', async () => {
		await setup();
		expect(screen.getByRole('header', { name: translations.fr.notFound.title })).toBeOnTheScreen();
	});

	it('renders the description text', async () => {
		await setup();
		expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
	});

	it('does not offer a history-dependent return', async () => {
		await setup();
		expect(screen.queryByRole('button', { name: 'Retour' })).toBeNull();
	});

	it('renders Accueil button', async () => {
		await setup();
		expect(screen.getByRole('button', { name: translations.fr.notFound.homeBtn })).toBeOnTheScreen();
	});

	it('opens the dashboard when an authenticated user presses Accueil', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.notFound.homeBtn }));
		await screen.findByText('Private dashboard');
		expect(screen.queryByText('404')).toBeNull();
	});

	it('opens login for guests without exposing the protected dashboard', async () => {
		await setup(false);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.notFound.homeBtn }));
		await screen.findByText('Public login');
		expect(screen.queryByText('Private dashboard')).toBeNull();
	});

	it('uses the original English copy when English is selected', async () => {
		mockLanguage = 'en';
		await setup();
		expect(screen.getByRole('header', { name: translations.en.notFound.title })).toBeOnTheScreen();
		expect(screen.getByText(translations.en.notFound.message)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: translations.en.notFound.homeBtn })).toBeOnTheScreen();
	});
});
