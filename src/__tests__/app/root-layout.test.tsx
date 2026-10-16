import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated, initToken, setSessionUnavailable } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';
import { RootNavigator } from '@/app/_layout';

import { initAppAction } from '@/store/actions/_initActions';
import { accountLogoutAction } from '@/store/actions/accountActions';
import { translations } from '@/translations';
jest.mock('@/styles/globals.css', () => ({}));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));

jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		theme: 'light',
	}),
}));
jest.mock('@/auth', () => ({
	...jest.requireActual<typeof import('@/auth')>('@/auth'),
	auth: { instance: { get: jest.fn(async () => ({ data: {} })) } },
}));
const account = {
	profile: {
		id: 1,
		email: 'test@example.invalid',
		first_name: 'Test',
		last_name: 'User',
		gender: 'Homme',
		avatar: null,
		avatar_cropped: null,
		is_staff: false,
		is_active: true,
		default_password_set: false,
		date_joined: '2026-01-01T00:00:00Z',
		date_updated: null,
		last_login: null,
	},
	memberships: [],
};
const setup = async (initialUrl = '/') => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	const dispatch = jest.spyOn(store, 'dispatch');
	const result = await renderRouter(
		{
			_layout: () => (
				<Provider store={store}>
					<RootNavigator />
				</Provider>
			),
			login: () => <Text>Public login</Text>,
			'reset-password/_layout': () => <Stack />,
			'reset-password/index': () => <Text>Public recovery</Text>,
			'(app)/_layout': () => <Stack />,
			'(app)/index': () => <Text>Private dashboard</Text>,
		},
		{ initialUrl },
	);
	return { store, dispatch, result };
};
afterEach(() => jest.restoreAllMocks());
it('allows recovery for guests and removes it when the account becomes authenticated', async () => {
	const { store } = await setup('/reset-password');
	await act(() => store.dispatch(initToken()));
	await screen.findByText('Public recovery');
	await act(() => {
		store.dispatch(setProfil(account.profile));
		store.dispatch(setUserCompanies(account.memberships));
		store.dispatch(setAuthenticated());
	});
	await screen.findByText('Private dashboard');
	expect(screen.queryByText('Public recovery')).toBeNull();
});
it('restores first, guards private pages, and removes them on logout', async () => {
	const { store } = await setup();
	expect(screen.getByText(translations.fr.common.loading)).toBeOnTheScreen();
	expect(screen.queryByText('Private dashboard')).toBeNull();
	await act(() => store.dispatch(initToken()));
	await screen.findByText('Public login');
	await act(() => {
		store.dispatch(setProfil(account.profile));
		store.dispatch(setUserCompanies(account.memberships));
		store.dispatch(setAuthenticated());
	});
	await screen.findByText('Private dashboard');
	expect(screen.queryByText('Public login')).toBeNull();
	await act(() => store.dispatch(initToken()));
	await screen.findByText('Public login');
	expect(screen.queryByText('Private dashboard')).toBeNull();
});
it('offers retry and logout when session restoration is unavailable', async () => {
	const { store, dispatch } = await setup();
	const error = { status_code: 0, message: 'Offline', details: {} };
	await act(() => store.dispatch(setSessionUnavailable(error)));
	await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
	expect(dispatch).toHaveBeenLastCalledWith(initAppAction());
	await act(() => store.dispatch(setSessionUnavailable(error)));
	await fireEvent.press(screen.getByRole('button', { name: 'Se déconnecter' }));
	expect(dispatch).toHaveBeenLastCalledWith(accountLogoutAction());
	await screen.findByText(translations.fr.common.loading);
});
