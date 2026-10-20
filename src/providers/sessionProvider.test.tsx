import { act, cleanup, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';
import { Provider } from 'react-redux';
import { StrictMode } from 'react';
import { AxiosError } from 'axios';
import SessionProvider, { useSession } from './sessionProvider';
import StoreProvider from './storeProvider';
import { InitContextProvider, useInitAccessToken, useInitContext } from '@/contexts/InitContext';
import { InitEffects } from '@/contexts/initEffects';
import { auth, publicInstance } from '@/auth';
import { makeStore, type SagaStore } from '@/store/store';
import { rootSaga } from '@/store/sagas';
import { accountLoginAction, accountLogoutAction } from '@/store/actions/accountActions';
import { emptyInitStateToken } from '@/store/slices/_initSlice';
import { setProfil } from '@/store/slices/accountSlice';
import type { Tokens } from '@/types/accountTypes';
import type { UserClass } from '@/models/classes';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	const { createAuth } = jest.requireActual<typeof import('@/auth')>('@/auth');
	const publicInstance = create();
	const storage = {
		read: jest.fn(async () => ({
			access: 'access-1',
			refresh: 'refresh-1',
			access_expiration: '2030-01-01T00:00:00Z',
			refresh_expiration: '2031-01-01T00:00:00Z',
		})),
		write: jest.fn<Promise<void>, [Tokens | null]>().mockResolvedValue(undefined),
	};
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		publicInstance,
		auth: createAuth(publicInstance, storage),
		storage,
	};
});

// Bootstrap and token refresh use real HTTP adapters and Sagas. Query hooks
// are idle here so this test isolates session synchronization from polling.
jest.mock('@/store/services/account', () => {
	const idleQuery = { currentData: undefined, refetch: jest.fn() };
	return {
		...jest.requireActual<typeof import('@/store/services/account')>('@/store/services/account'),
		useGetProfilQuery: () => idleQuery,
		useGetGroupsQuery: () => idleQuery,
	};
});
jest.mock('@/store/services/company', () => {
	const idleQuery = { currentData: undefined, refetch: jest.fn() };
	return {
		...jest.requireActual<typeof import('@/store/services/company')>('@/store/services/company'),
		useGetUserCompaniesQuery: () => idleQuery,
	};
});

const { storage } = jest.requireMock('@/auth') as {
	storage: { read: jest.Mock; write: jest.Mock };
};
const profile: UserClass = {
	id: 7,
	email: 'test@example.invalid',
	first_name: 'Test',
	last_name: 'User',
	gender: 'Homme',
	avatar: null,
	avatar_cropped: null,
	is_staff: false,
	is_active: true,
	default_password_set: false,
	date_joined: null,
	date_updated: null,
	last_login: null,
};
const Example = () => {
	const token = useInitAccessToken();
	const { initStateToken } = useInitContext();
	return (
		<Text>
			{token ?? 'guest'}:{initStateToken.user.pk ?? 'no-profile'}
		</Text>
	);
};
const originalAppState = AppState.currentState;
let store: SagaStore;
let rejectNextRequest: boolean;
let refreshResponse: Partial<Tokens>;
let requestTokens: unknown[];

beforeEach(async () => {
	await auth.clear();
	jest.clearAllMocks();
	rejectNextRequest = false;
	refreshResponse = { access: 'rotated-access', refresh: 'rotated-refresh' };
	requestTokens = [];
	Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'background' });
	publicInstance.defaults.adapter = async (config) => ({
		data:
			config.url === '/account/token_refresh/' ? { ...auth.getSession(), ...refreshResponse } : { maintenance: false },
		status: 200,
		statusText: 'OK',
		headers: {},
		config,
	});
	auth.instance.defaults.adapter = async (config) => {
		if (config.url === '/protected') {
			requestTokens.push(config.headers.get('Authorization'));
			if (rejectNextRequest) {
				rejectNextRequest = false;
				throw new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
					data: {},
					status: 401,
					statusText: 'Unauthorized',
					headers: {},
					config,
				});
			}
		}
		return {
			data: config.url === '/account/profil/' ? profile : config.url === '/company/by_user/' ? [] : {},
			status: 200,
			statusText: 'OK',
			headers: {},
			config,
		};
	};
	store = makeStore();
	store.runSaga(rootSaga);
});
afterEach(async () => {
	await cleanup();
	store.sagaTask?.cancel();
	await store.sagaTask?.toPromise();
	await auth.clear();
	Object.defineProperty(AppState, 'currentState', { configurable: true, value: originalAppState });
});

const renderSession = async () =>
	await render(
		<SessionProvider>
			<Provider store={store}>
				<InitContextProvider>
					<InitEffects />
					<Example />
				</InitContextProvider>
			</Provider>
		</SessionProvider>,
	);

it('restores the persisted session through StoreProvider after StrictMode replays its lifecycle', async () => {
	const view = await render(
		<StrictMode>
			<SessionProvider>
				<StoreProvider>
					<InitContextProvider>
						<InitEffects />
						<Example />
					</InitContextProvider>
				</StoreProvider>
			</SessionProvider>
		</StrictMode>,
	);
	await screen.findByText('access-1:7');
	expect(auth.getSession()?.access).toBe('access-1');
	await view.unmount();
});

it('synchronizes a successful login through its login action and the native session provider', async () => {
	storage.read.mockResolvedValueOnce(null);
	const session: Tokens = {
		access: 'login-access',
		refresh: 'login-refresh',
		access_expiration: '2030-01-01T00:00:00Z',
		refresh_expiration: '2031-01-01T00:00:00Z',
	};
	publicInstance.defaults.adapter = async (config) => ({
		data: config.url === process.env.EXPO_PUBLIC_ACCOUNT_LOGIN ? session : { maintenance: false },
		status: 200,
		statusText: 'OK',
		headers: {},
		config,
	});
	await renderSession();
	await screen.findByText('guest:no-profile');
	await act(() => store.dispatch(accountLoginAction({ email: 'test@example.invalid', password: 'example-pass' })));
	await screen.findByText('login-access:7');
	expect(store.getState()._init.status).toBe('authenticated');
	expect(store.getState()._init.initStateToken).toMatchObject({
		...session,
		user: { pk: 7, email: profile.email, first_name: profile.first_name, last_name: profile.last_name },
	});
});

it('synchronizes restored and rotated auth tokens through InitEffects, Redux and context, then clears on logout', async () => {
	await renderSession();
	await screen.findByText('access-1:7');
	expect(storage.read).toHaveBeenCalledTimes(1);
	expect(store.getState()._init).toMatchObject({
		status: 'authenticated',
		initStateToken: {
			...auth.getSession(),
			user: { pk: 7, email: profile.email, first_name: 'Test', last_name: 'User' },
		},
	});
	rejectNextRequest = true;
	await act(async () => {
		await auth.instance.get('/protected');
	});
	expect(requestTokens).toEqual(['Bearer access-1', 'Bearer rotated-access']);
	expect(screen.getByText('rotated-access:7')).toBeOnTheScreen();
	expect(store.getState()._init.initStateToken).toMatchObject(refreshResponse);
	expect(storage.write).toHaveBeenLastCalledWith(auth.getSession());

	await act(() => store.dispatch(setProfil({ ...profile, first_name: 'Edited' })));
	expect(store.getState()._init.initStateToken.user.first_name).toBe('Edited');

	await act(() => store.dispatch(accountLogoutAction()));
	expect(store.getState()._init.initStateToken).toEqual(emptyInitStateToken);
	await waitFor(() => expect(store.getState()._init.status).toBe('guest'));
	expect(auth.getSession()).toBeNull();
	expect(storage.write).toHaveBeenLastCalledWith(null);
	expect(screen.getByText('guest:no-profile')).toBeOnTheScreen();
});

it('synchronizes refresh-only rotation and clears Redux when the authoritative session disappears', async () => {
	await renderSession();
	await screen.findByText('access-1:7');
	refreshResponse = { refresh: 'refresh-only-rotation' };
	rejectNextRequest = true;
	await act(async () => {
		await auth.instance.get('/protected');
	});
	expect(screen.getByText('access-1:7')).toBeOnTheScreen();
	expect(store.getState()._init.initStateToken.refresh).toBe('refresh-only-rotation');
	expect(storage.write).toHaveBeenLastCalledWith(expect.objectContaining(refreshResponse));
	await act(async () => {
		await auth.clear();
	});
	expect(store.getState()._init.status).toBe('guest');
	expect(store.getState()._init.initStateToken).toEqual(emptyInitStateToken);
	expect(screen.getByText('guest:no-profile')).toBeOnTheScreen();
});

it('synchronizes proactive token rotation through persistence, Redux and context without a failed API request', async () => {
	storage.read.mockResolvedValueOnce({
		access: 'access-1',
		refresh: 'refresh-1',
		access_expiration: new Date(Date.now() + 3 * 60000).toISOString(),
		refresh_expiration: '2031-01-01T00:00:00Z',
	});
	refreshResponse.access_expiration = new Date(Date.now() + 15 * 60000).toISOString();
	await renderSession();
	await screen.findByText('access-1:7');
	await act(async () => {
		await auth.refresh();
	});
	expect(screen.getByText('rotated-access:7')).toBeOnTheScreen();
	expect(store.getState()._init.initStateToken).toMatchObject(refreshResponse);
	expect(storage.write).toHaveBeenLastCalledWith(auth.getSession());
	expect(requestTokens).toEqual([]);
});

describe('foreground session polling', () => {
	const listeners = new Set<(state: AppStateStatus) => void>();
	const SessionValue = () => <Text>{useSession()?.access ?? 'guest'}</Text>;
	const renderProvider = async () =>
		await render(
			<SessionProvider>
				<SessionValue />
			</SessionProvider>,
		);
	const changeState = async (state: AppStateStatus) => {
		Object.defineProperty(AppState, 'currentState', { configurable: true, value: state });
		await act(async () => {
			listeners.forEach((listener) => listener(state));
		});
	};
	const advance = async (milliseconds: number) => {
		await act(async () => {
			await jest.advanceTimersByTimeAsync(milliseconds);
		});
	};
	const restoreSession = async (minutes = 15) => {
		storage.read.mockResolvedValueOnce({
			access: 'access-1',
			refresh: 'refresh-1',
			access_expiration: new Date(Date.now() + minutes * 60000).toISOString(),
			refresh_expiration: new Date(Date.now() + 86400000).toISOString(),
		});
		await auth.restore();
	};
	beforeEach(() => {
		jest.useFakeTimers({ now: new Date('2026-10-16T10:00:00Z') });
		listeners.clear();
		Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
		jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
			listeners.add(listener);
			return {
				remove: () => {
					listeners.delete(listener);
				},
			};
		});
		refreshResponse.access_expiration = new Date(Date.now() + 30 * 60000).toISOString();
	});
	afterEach(async () => {
		await cleanup();
		jest.restoreAllMocks();
		jest.useRealTimers();
	});

	it('checks every four minutes and refreshes at twelve minutes for a fifteen-minute token', async () => {
		await restoreSession();
		const refresh = jest.spyOn(auth, 'refresh');
		const post = jest.spyOn(publicInstance, 'post');
		await renderProvider();
		expect(refresh).toHaveBeenCalledTimes(1);
		await advance(8 * 60000);
		expect(refresh).toHaveBeenCalledTimes(3);
		expect(post).not.toHaveBeenCalled();
		await advance(4 * 60000);
		expect(refresh).toHaveBeenCalledTimes(4);
		expect(post).toHaveBeenCalledTimes(1);
		expect(screen.getByText('rotated-access')).toBeOnTheScreen();
	});
	it('pauses in the background and checks immediately on returning to the foreground', async () => {
		await restoreSession();
		const refresh = jest.spyOn(auth, 'refresh');
		const post = jest.spyOn(publicInstance, 'post');
		await renderProvider();
		await changeState('background');
		await advance(16 * 60000);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(post).not.toHaveBeenCalled();
		await changeState('active');
		expect(refresh).toHaveBeenCalledTimes(2);
		expect(post).toHaveBeenCalledTimes(1);
		expect(screen.getByText('rotated-access')).toBeOnTheScreen();
		await advance(4 * 60000);
		expect(refresh).toHaveBeenCalledTimes(3);
	});
	it('starts after login and stops polling and listening after logout', async () => {
		const refresh = jest.spyOn(auth, 'refresh');
		await renderProvider();
		await advance(4 * 60000);
		expect(refresh).not.toHaveBeenCalled();
		expect(listeners.size).toBe(0);
		await act(async () => {
			await restoreSession();
		});
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(listeners.size).toBe(1);
		await act(async () => {
			await auth.clear();
		});
		await advance(8 * 60000);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(listeners.size).toBe(0);
		expect(screen.getByText('guest')).toBeOnTheScreen();
	});
	it('retries transient failures on the next check without discarding the session', async () => {
		await restoreSession(3);
		const post = jest.spyOn(publicInstance, 'post').mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
		await renderProvider();
		await act(async () => {});
		expect(screen.getByText('access-1')).toBeOnTheScreen();
		expect(post).toHaveBeenCalledTimes(1);
		await advance(4 * 60000);
		expect(post).toHaveBeenCalledTimes(2);
		expect(screen.getByText('rotated-access')).toBeOnTheScreen();
	});
	it('cleans up the timer and AppState listener on unmount', async () => {
		await restoreSession();
		const refresh = jest.spyOn(auth, 'refresh');
		const view = await renderProvider();
		expect(listeners.size).toBe(1);
		await view.unmount();
		await advance(8 * 60000);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(listeners.size).toBe(0);
	});
	it('shares the initial refresh and keeps one timer when StrictMode replays effects', async () => {
		await restoreSession(3);
		const refresh = jest.spyOn(auth, 'refresh');
		const post = jest.spyOn(publicInstance, 'post');
		await render(
			<StrictMode>
				<SessionProvider>
					<SessionValue />
				</SessionProvider>
			</StrictMode>,
		);
		await act(async () => {});
		expect(screen.getByText('rotated-access')).toBeOnTheScreen();
		expect(post).toHaveBeenCalledTimes(1);
		expect(listeners.size).toBe(1);
		const checks = refresh.mock.calls.length;
		await advance(4 * 60000);
		expect(refresh).toHaveBeenCalledTimes(checks + 1);
	});
});
