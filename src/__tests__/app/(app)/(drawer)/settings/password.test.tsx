import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import Password from '@/app/(app)/(drawer)/settings/password';
import { makeStore } from '@/store/store';
import { rootSaga } from '@/store/sagas';
import { profilApi } from '@/store/services/account';
import { accountSetProfilAction } from '@/store/actions/accountActions';
import { getProfilState } from '@/store/selectors';
import { auth } from '@/auth';
import { translations } from '@/translations';
import type { UserClass } from '@/models/classes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		auth: { instance: create() },
		publicInstance: create(),
	};
});
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		theme: 'light',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
const t = translations.fr;
const profile: UserClass = {
	id: 7,
	email: 'profile@example.invalid',
	first_name: 'Example',
	last_name: 'User',
	gender: 'Homme',
	avatar: null,
	avatar_cropped: null,
	is_staff: true,
	is_active: true,
	default_password_set: true,
	date_joined: '2026-01-01T00:00:00Z',
	date_updated: null,
	last_login: null,
};
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
const reject = (config: InternalAxiosRequestConfig, details: Record<string, string[]>, status = 400): never => {
	throw new AxiosError('Request rejected', 'ERR_BAD_REQUEST', config, undefined, response(config, { details }, status));
};
let store: ReturnType<typeof makeStore>;
beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = makeStore();
	store.runSaga(rootSaga);
	store.dispatch(accountSetProfilAction(profile));
});
afterEach(async () => {
	await cleanup();
	store.sagaTask?.cancel();
	store.dispatch(profilApi.util.resetApiState());
	await act(async () => {
		await jest.runOnlyPendingTimersAsync();
	});
	jest.useRealTimers();
});
const setup = async () =>
	await render(
		<Provider store={store}>
			<Password />
		</Provider>,
	);
const fill = async (confirmation = 'new-example-pass') => {
	await fireEvent.changeText(screen.getByLabelText(t.settings.fieldOldPassword), 'old-example-pass');
	await fireEvent.changeText(screen.getByLabelText(t.settings.fieldNewPassword), 'new-example-pass');
	await fireEvent.changeText(screen.getByLabelText(t.settings.fieldConfirmPassword), confirmation);
};
const submit = async () => await fireEvent.press(screen.getByRole('button', { name: t.settings.save }));

it('changes the password, clears the default-password warning through its action, and resets the form', async () => {
	adapter.mockImplementation(async (config) => response(config, '', 204));
	await setup();
	expect(screen.getByText(t.settings.defaultPasswordWarning)).toBeOnTheScreen();
	await fill();
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.passwordChangeSuccess));
	expect(adapter.mock.calls[0][0]).toMatchObject({ method: 'put', url: '/account/password_change/' });
	expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
		old_password: 'old-example-pass',
		new_password: 'new-example-pass',
		new_password2: 'new-example-pass',
	});
	expect(adapter).toHaveBeenCalledTimes(1);
	expect(getProfilState(store.getState())).toEqual({ ...profile, default_password_set: false });
	expect(screen.queryByText(t.settings.defaultPasswordWarning)).toBeNull();
	for (const label of [t.settings.fieldOldPassword, t.settings.fieldNewPassword, t.settings.fieldConfirmPassword])
		expect(screen.getByLabelText(label)).toHaveProp('value', '');
	expect(mockError).not.toHaveBeenCalled();
});

it('keeps a successful password change and cleared default flag when the follow-up profile request fails', async () => {
	let profileReads = 0;
	adapter.mockImplementation(async (config) =>
		config.method === 'put'
			? response(config, '', 204)
			: ++profileReads === 1
				? response(config, profile)
				: reject(config, { detail: ['Profile temporarily unavailable'] }, 503),
	);
	const subscription = store.dispatch(profilApi.endpoints.getProfil.initiate());
	await subscription.unwrap();
	await setup();
	await fill();
	await submit();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.settings.passwordChangeSuccess));
	expect(getProfilState(store.getState())).toEqual({ ...profile, default_password_set: false });
	expect(screen.queryByText(t.settings.defaultPasswordWarning)).toBeNull();
	expect(screen.getByLabelText(t.settings.fieldOldPassword)).toHaveProp('value', '');
	expect(mockError).not.toHaveBeenCalled();
	await waitFor(() => expect(profileReads).toBe(2));
	subscription.unsubscribe();
});

it('shows an incorrect current-password error without clearing the inputs or the default flag', async () => {
	adapter.mockImplementation(async (config) => reject(config, { old_password: ['Incorrect current password'] }));
	await setup();
	await fill();
	await submit();
	await screen.findByText('Incorrect current password');
	expect(screen.getByLabelText(t.settings.fieldOldPassword)).toHaveProp('value', 'old-example-pass');
	expect(getProfilState(store.getState())).toEqual(profile);
	expect(adapter).toHaveBeenCalledTimes(1);
	expect(mockError).toHaveBeenCalledWith(t.settings.passwordChangeError);
	expect(mockSuccess).not.toHaveBeenCalled();
});

it('shows the original server-failure fallback and permits retry without changing the profile', async () => {
	adapter.mockImplementation(async (config) =>
		reject(config, { non_field_errors: ['Password service unavailable'] }, 503),
	);
	await setup();
	await fill();
	await submit();
	await screen.findByText(
		'Il semble que nous ne puissions pas nous connecter. Veuillez vérifier votre connexion réseau et réessayer.',
	);
	expect(screen.getByRole('button', { name: t.settings.save })).not.toBeDisabled();
	expect(getProfilState(store.getState())).toEqual(profile);
	expect(mockError).toHaveBeenCalledWith(t.settings.passwordChangeError);
});
