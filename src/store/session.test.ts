import type { AppSession } from '@/types/_initTypes';
import { makeStore } from '@/store/store';
import { rootSaga } from '@/store/sagas';
import { initAppAction } from '@/store/actions/_initActions';
import { companyApi } from '@/store/services/company';
import { auth } from '@/auth';
import { initToken } from '@/store/slices/_initSlice';
import { getAccessTokenFromSession } from '@/store/session';

jest.mock('@/auth', () => {
	const { create, AxiosError } = jest.requireActual<typeof import('axios')>('axios');
	const { createAuth } = jest.requireActual<typeof import('@/auth')>('@/auth');
	const tokens = () => ({
		access: 'test-access',
		refresh: 'test-refresh',
		access_expiration: new Date(Date.now() + 600000).toISOString(),
		refresh_expiration: new Date(Date.now() + 86400000).toISOString(),
	});
	const fixture = { failMembership: false, profileCalls: 0, membershipCalls: 0 };
	const storage = {
		read: jest.fn(async () => tokens()),
		write: jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined),
	};
	const transport = create({
		adapter: async (config) => ({
			data: tokens(),
			status: 200,
			statusText: 'OK',
			headers: {},
			config,
		}),
	});
	const client = createAuth(transport, storage);
	const instance = client.instance;
	instance.defaults.adapter = async (config) => {
		const profile = config.url === '/account/profil/';
		if (profile) fixture.profileCalls++;
		else fixture.membershipCalls++;
		if (profile || fixture.failMembership)
			throw new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, undefined, {
				data: { detail: 'Invalid token' },
				status: 401,
				statusText: 'Unauthorized',
				headers: {},
				config,
			});
		return {
			data: [{ id: 4, raison_sociale: 'Test', role: 'Lecture' }],
			status: 200,
			statusText: 'OK',
			headers: {},
			config,
		};
	};
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), instance, auth: client, fixture, storage };
});
const { fixture, storage } = jest.requireMock('@/auth') as {
	fixture: { failMembership: boolean; profileCalls: number; membershipCalls: number };
	storage: { read: jest.Mock; write: jest.Mock };
};

describe('getAccessTokenFromSession', () => {
	it('returns undefined when session is undefined', () => {
		const result = getAccessTokenFromSession(undefined);
		expect(result).toBeUndefined();
	});

	it('returns accessToken from root when present and non-empty', () => {
		const session = {
			accessToken: 'mock-token',
			refreshToken: 'mock-refresh-token',
			accessTokenExpiration: '2099-12-31T23:59:59Z',
			refreshTokenExpiration: '2099-12-31T23:59:59Z',
			expires: '2099-12-31T23:59:59Z',
			user: {
				accessToken: 'mock-token',
				pk: 1,
				email: 'test@example.com',
				first_name: 'Test',
				last_name: 'User',
				id: 'user-id',
				emailVerified: null,
				name: 'Test User',
			},
		};
		const result = getAccessTokenFromSession(session);
		expect(result).toBe('mock-token');
	});

	it('returns user.accessToken when root accessToken is empty and user.accessToken is present', () => {
		const session = {
			accessToken: '',
			refreshToken: 'mock-refresh-token',
			accessTokenExpiration: '2099-12-31T23:59:59Z',
			refreshTokenExpiration: '2099-12-31T23:59:59Z',
			expires: '2099-12-31T23:59:59Z',
			user: {
				accessToken: 'user-mock-token',
				pk: 1,
				email: 'test@example.com',
				first_name: 'Test',
				last_name: 'User',
				id: 'user-id',
				emailVerified: null,
				name: 'Test User',
			},
		};
		const result = getAccessTokenFromSession(session);
		expect(result).toBe('user-mock-token');
	});

	it('returns undefined when both root and user accessToken are empty', () => {
		const session = {
			accessToken: '',
			refreshToken: '',
			accessTokenExpiration: '',
			refreshTokenExpiration: '',
			expires: '',
			user: {
				accessToken: '',
				pk: 1,
				email: 'test@example.com',
				first_name: 'Test',
				last_name: 'User',
				id: 'user-id',
				emailVerified: null,
				name: 'Test User',
			},
		};
		const result = getAccessTokenFromSession(session);
		expect(result).toBeUndefined();
	});

	it('handles missing user and returns root accessToken if present', () => {
		const session = {
			accessToken: 'only-root',
			refreshToken: '',
			accessTokenExpiration: '',
			refreshTokenExpiration: '',
			expires: '2099-12-31T23:59:59Z',
		} as AppSession;
		const result = getAccessTokenFromSession(session);
		expect(result).toBe('only-root');
	});
});

beforeEach(async () => {
	jest.useFakeTimers();
	await auth.clear();
	storage.write.mockClear();
	fixture.profileCalls = 0;
	fixture.membershipCalls = 0;
});
afterEach(() => {
	jest.clearAllTimers();
	jest.useRealTimers();
});

it.each([false, true])(
	'never authenticates after account loading expires the session (both fail: %s)',
	async (failMembership) => {
		fixture.failMembership = failMembership;
		const store = makeStore();
		const sagaTask = store.runSaga(rootSaga);
		const statuses: string[] = [];
		const unsubscribe = store.subscribe(() => statuses.push(store.getState()._init.status));
		// InitEffects owns this subscriber while the app is mounted.
		const unsubscribeExpired = auth.subscribeExpired(() => store.dispatch(initToken()));
		try {
			store.dispatch(initAppAction());
			await jest.runAllTimersAsync();
			expect(fixture.profileCalls).toBeGreaterThan(0);
			expect(storage.write).toHaveBeenLastCalledWith(null);
			expect(statuses).toContain('guest');
			expect(statuses).not.toContain('authenticated');
			expect(store.getState()._init).toMatchObject({ status: 'guest' });
			expect(Object.values(store.getState().companyApi.queries).some((query) => query?.data)).toBe(false);
		} finally {
			unsubscribe();
			unsubscribeExpired();
			sagaTask.cancel();
			store.dispatch(companyApi.util.resetApiState());
		}
	},
);
