import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { initToken, setLoginError } from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';
import companiesReducer from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';

import LoginClient from '@/app/login';
import { translations } from '@/translations';
import { MINI_INPUT_EMAIL, INPUT_PASSWORD_MIN } from '@/utils/formValidationErrorMessages';
import { router } from 'expo-router';
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, usePathname: () => '/login' }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
const setup = async () => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(initToken());
	const dispatch = jest.spyOn(store, 'dispatch');
	await render(
		<Provider store={store}>
			<LoginClient />
		</Provider>,
	);
	await act(async () => {});
	return { store, dispatch };
};
it('opens the original password recovery flow', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('link', { name: translations.fr.auth.forgotPassword }));
	expect(router.push).toHaveBeenCalledWith('/reset-password');
});
it('renders native validation errors instead of dispatching invalid credentials', async () => {
	const { dispatch } = await setup();
	await fireEvent.changeText(screen.getByLabelText('Adresse email'), 'bad');
	await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'short');
	await fireEvent.press(screen.getByRole('button', { name: 'Me connecter' }));
	await screen.findByText(MINI_INPUT_EMAIL);
	expect(dispatch).not.toHaveBeenCalled();
});
it('dispatches one valid login request and disables submission while pending', async () => {
	const { store, dispatch } = await setup();
	await fireEvent.changeText(screen.getByLabelText('Adresse email'), 'test@example.invalid');
	await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'example-pass');
	await fireEvent.press(screen.getByRole('button', { name: 'Me connecter' }));
	await waitFor(() => expect(store.getState()._init.status).toBe('signingIn'));
	expect(dispatch).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('button', { name: 'Me connecter' })).toBeDisabled();
});
it('uses the original shared password input visibility control', async () => {
	await setup();
	expect(screen.getByLabelText('Mot de passe').props.secureTextEntry).toBe(true);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.togglePasswordVisibility }));
	expect(screen.getByLabelText('Mot de passe').props.secureTextEntry).toBe(false);
});

it('validates an untouched empty login form with the original password rule', async () => {
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('button', { name: 'Me connecter' }));
	await screen.findByText(INPUT_PASSWORD_MIN(8));
	expect(dispatch).not.toHaveBeenCalled();
});

it('renders the original login title and controls', async () => {
	await setup();
	expect(screen.getByText(translations.fr.auth.login)).toBeOnTheScreen();
	expect(screen.getByLabelText(translations.fr.auth.emailLabel)).toBeOnTheScreen();
	expect(screen.getByLabelText(translations.fr.auth.passwordLabel)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.auth.loginButton })).toBeOnTheScreen();
});
it('maps backend field errors to the form and releases pending submission', async () => {
	const { store } = await setup();
	await fireEvent.changeText(screen.getByLabelText('Adresse email'), 'test@example.invalid');
	await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'example-pass');
	await fireEvent.press(screen.getByRole('button', { name: 'Me connecter' }));
	await waitFor(() => expect(store.getState()._init.status).toBe('signingIn'));
	await act(() =>
		store.dispatch(
			setLoginError({ status_code: 400, message: 'Invalid login', details: { email: ['This email is unavailable'] } }),
		),
	);
	await screen.findByText('This email is unavailable');
	expect(screen.getByRole('button', { name: 'Me connecter' })).toBeEnabled();
});

it('shows the backend global login detail instead of losing it behind a generic message', async () => {
	const { store } = await setup();
	await act(() =>
		store.dispatch(
			setLoginError({
				status_code: 400,
				message: 'Invalid login',
				details: { error: ['Ce compte est désactivé.'] },
			}),
		),
	);
	await screen.findByText('Ce compte est désactivé.');
	expect(screen.queryByText('Invalid login')).toBeNull();
});
