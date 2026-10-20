import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import AuthenticatedLayout, { unstable_settings as appSettings } from '@/app/(app)/_layout';
import DrawerLayout from '@/app/(app)/(drawer)/_layout';

import type { UserClass } from '@/models/classes';

jest.mock('expo-router/drawer', () => ({
	Drawer: jest.requireActual<typeof import('expo-router')>('expo-router').Stack,
	DrawerToggleButton: () => null,
}));
jest.mock('@/components/layouts/navigationBar/navigationBar', () => {
	const actual = jest.requireActual<typeof import('@/components/layouts/navigationBar/navigationBar')>(
		'@/components/layouts/navigationBar/navigationBar',
	);
	const { cloneElement } = jest.requireActual<typeof import('react')>('react');
	return {
		...actual,
		NavigationDrawer: () => null,
		Notifications: () => null,
		useNavigationHeader: () => {
			const options = actual.useNavigationHeader();
			return { ...options, headerRight: () => cloneElement(options.headerRight(), {}, null) };
		},
	};
});
jest.mock('@/components/shared/themeToggle/themeToggle', () => () => null);
jest.mock('@/components/shared/languageSwitcher/languageSwitcher', () => () => null);
jest.mock('@/components/shared/appUpdate/appUpdate', () => () => null);

const profile = (required: boolean): UserClass => ({
	id: 1,
	email: 'test@example.invalid',
	first_name: 'Test',
	last_name: 'User',
	gender: 'Homme',
	avatar: null,
	avatar_cropped: null,
	is_staff: true,
	is_active: true,
	default_password_set: required,
	date_joined: null,
	date_updated: null,
	last_login: null,
});
const setup = async (required: boolean, initialUrl: string) => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(setProfil(profile(required)));
	store.dispatch(setUserCompanies([]));
	store.dispatch(setAuthenticated());
	const rendered = await renderRouter(
		{
			_layout: () => (
				<Provider store={store}>
					<Stack />
				</Provider>
			),
			'(app)/_layout': { default: AuthenticatedLayout, unstable_settings: appSettings },
			'(app)/(drawer)/_layout': DrawerLayout,
			'(app)/companies/form': () => <Text>Company form</Text>,
			'(app)/users/form': () => <Text>User form</Text>,
			'(app)/users/[id]/index': () => <Text>User details</Text>,
			'(app)/companies/[id]/index': () => <Text>Company details</Text>,
			'(app)/(drawer)/settings/_layout': () => <Stack />,
			'(app)/(drawer)/companies/index': () => <Text>Companies</Text>,
			'(app)/(drawer)/index': () => <Text>Dashboard</Text>,
			'(app)/(drawer)/users/index': () => <Text>User list</Text>,
			'(app)/(drawer)/settings/password': () => <Text>Change password</Text>,
		},
		{ initialUrl },
	);
	return { store, rendered };
};
it('redirects an authenticated default-password account from a cold private link to password settings', async () => {
	const { rendered } = await setup(true, '/users');
	await screen.findByText('Change password');
	expect(screen.queryByText('User list')).toBeNull();
	expect(rendered.getPathname()).toBe('/settings/password');
});
it('allows the password screen and releases other screens once the password flag is cleared', async () => {
	const { store, rendered } = await setup(true, '/settings/password');
	await screen.findByText('Change password');
	await act(() => router.push('/users'));
	await waitFor(() => expect(rendered.getPathname()).toBe('/settings/password'));
	expect(screen.queryByText('User list')).toBeNull();
	await act(() => store.dispatch(setProfil(profile(false))));
	await act(() => router.push('/users'));
	await screen.findByText('User list');
	expect(rendered.getPathname()).toBe('/users');
});
it('reacts when a refreshed profile requires password change after navigation', async () => {
	const { store, rendered } = await setup(false, '/users');
	await screen.findByText('User list');
	await act(() => store.dispatch(setProfil(profile(true))));
	await screen.findByText('Change password');
	expect(rendered.getPathname()).toBe('/settings/password');
});
