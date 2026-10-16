import { AxiosError, AxiosHeaders, create, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { createAuthClient, InvalidSessionError } from '@/auth';
import type { Credentials, Tokens } from '@/types/accountTypes';

const tokens = (overrides: Partial<Tokens> = {}): Tokens => ({
	access: 'access-1',
	refresh: 'refresh-1',
	access_expiration: new Date(Date.now() + 600000).toISOString(),
	refresh_expiration: new Date(Date.now() + 86400000).toISOString(),
	...overrides,
});
const response = (
	data: unknown,
	config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() },
): AxiosResponse => ({
	data,
	config,
	status: 200,
	statusText: 'OK',
	headers: {},
});
const reject = (config: InternalAxiosRequestConfig, status = 401) =>
	new AxiosError('Rejected', 'ERR_BAD_REQUEST', config, undefined, { ...response({}, config), status });
const setup = async (initial: unknown = tokens()) => {
	const storage = { read: jest.fn(async () => initial), write: jest.fn(async (_value: Tokens | null) => {}) };
	const transport = create();
	const post = jest
		.spyOn(transport, 'post')
		.mockResolvedValue(response(tokens({ access: 'access-2', refresh: 'refresh-2' })));
	const auth = createAuthClient(transport, storage);
	const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
		if (config.headers.get('Authorization') === 'Bearer access-1') throw reject(config);
		return response({ id: 7 }, config);
	});
	auth.instance.defaults.adapter = adapter;
	await auth.restore();
	return { auth, post, storage, adapter };
};
it('restores valid credentials without logging in or refreshing unnecessarily', async () => {
	const { auth, post } = await setup();
	expect(auth.getSession()?.access).toBe('access-1');
	expect(post).not.toHaveBeenCalled();
});
it.each([null, {}, tokens({ refresh_expiration: new Date(0).toISOString() })])(
	'does not restore an absent or invalid session',
	async (initial) => {
		const { auth } = await setup(initial);
		expect(auth.getSession()).toBeNull();
	},
);
it('logs in once and persists only the token schema fields', async () => {
	const { auth, post, storage } = await setup(null);
	post.mockResolvedValue(response({ ...tokens(), user: { email: 'test@example.invalid' } }));
	await auth.signIn({ email: 'test@example.invalid', password: 'example-pass' });
	expect(post).toHaveBeenCalledTimes(1);
	expect(storage.write).toHaveBeenLastCalledWith(expect.objectContaining({ access: 'access-1', refresh: 'refresh-1' }));
	expect(auth.getSession()).not.toHaveProperty('password');
	expect(auth.getSession()).not.toHaveProperty('user');
});
it('returns a storage failure without publishing unpersisted login tokens', async () => {
	const { auth, storage } = await setup(null);
	const error = new Error('Secure storage unavailable');
	storage.write.mockRejectedValueOnce(error);
	await expect(auth.signIn({ email: 'test@example.invalid', password: 'example-pass' })).resolves.toEqual({
		success: false,
		error,
	});
	expect(auth.getSession()).toBeNull();
});
it('returns a restore read failure so startup can show Retry', async () => {
	const { auth, storage } = await setup(null);
	const error = new Error('Secure storage unavailable');
	storage.read.mockRejectedValueOnce(error);
	await expect(auth.restore()).resolves.toEqual({ success: false, error });
	expect(auth.getSession()).toBeNull();
});
it('keeps a new login when an old logout finishes late', async () => {
	const { auth, adapter } = await setup();
	let finish!: (value: AxiosResponse) => void;
	adapter.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const logout = auth.signOut(true);
	while (!finish) await Promise.resolve();
	await auth.signIn({ email: 'new@example.invalid', password: 'example-pass' });
	finish(response({}, adapter.mock.calls[0][0]));
	await expect(logout).resolves.toMatchObject({ success: false });
	expect(auth.getSession()?.access).toBe('access-2');
});
it('uses configured login, refresh and logout endpoints through the complete session flow', async () => {
	const env = [
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_ACCOUNT_LOGIN', '/custom/login/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_ACCOUNT_REFRESH_TOKEN', '/custom/refresh/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_ACCOUNT_LOGOUT', '/custom/logout/'),
	];
	try {
		const { auth, post, adapter } = await setup(null);
		const credentials = { email: 'test@example.invalid', password: 'example-pass' };
		post.mockResolvedValueOnce(response(tokens()));
		await auth.signIn(credentials);
		await auth.instance.get('/private');
		await auth.signOut(true);
		expect(post).toHaveBeenNthCalledWith(1, '/custom/login/', credentials);
		expect(post).toHaveBeenNthCalledWith(2, '/custom/refresh/', { refresh: 'refresh-1' });
		expect(adapter.mock.calls.at(-1)?.[0]).toMatchObject({ url: '/custom/logout/', method: 'post' });
		expect(auth.getSession()).toBeNull();
	} finally {
		env.forEach((variable) => variable.restore());
	}
});
it.each([401, 500])('does not retain a session after a failed login (%s)', async (status) => {
	const { auth, post, storage } = await setup(null);
	post.mockRejectedValueOnce(reject({ headers: new AxiosHeaders() }, status));
	await expect(auth.signIn({ email: 'test@example.invalid', password: 'example-pass' })).resolves.toMatchObject({
		success: false,
		error: { response: { status } },
	});
	expect(auth.getSession()).toBeNull();
	expect(storage.write).toHaveBeenLastCalledWith(null);
});
it('does not retain a session after a login network error', async () => {
	const { auth, post, storage } = await setup(null);
	post.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
	await expect(auth.signIn({ email: 'test@example.invalid', password: 'example-pass' })).resolves.toMatchObject({
		success: false,
		error: { message: 'Offline' },
	});
	expect(auth.getSession()).toBeNull();
	expect(storage.write).toHaveBeenLastCalledWith(null);
});
it('uses the library to share one refresh across concurrent 401s and save rotation', async () => {
	const { auth, post, adapter, storage } = await setup();
	await Promise.all([auth.instance.get('/one'), auth.instance.get('/two'), auth.instance.get('/three')]);
	expect(post).toHaveBeenCalledTimes(1);
	expect(post).toHaveBeenCalledWith('/account/token_refresh/', { refresh: 'refresh-1' });
	expect(adapter).toHaveBeenCalledTimes(6);
	expect(storage.write).toHaveBeenLastCalledWith(expect.objectContaining({ access: 'access-2', refresh: 'refresh-2' }));
});
it('preserves credentials after a network failure and can retry', async () => {
	const { auth, post, storage } = await setup();
	post.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
	await expect(auth.instance.get('/one')).rejects.toThrow('Offline');
	expect(storage.write).not.toHaveBeenCalledWith(null);
	await expect(auth.instance.get('/one')).resolves.toMatchObject({ data: { id: 7 } });
});
it.each([400, 401])('expires rejected refresh credentials (%s)', async (status) => {
	const { auth, post, storage } = await setup();
	const onExpired = jest.fn();
	auth.subscribeExpired(onExpired);
	post.mockRejectedValue(reject({ headers: new AxiosHeaders() }, status));
	await expect(auth.instance.get('/one')).rejects.toBeInstanceOf(InvalidSessionError);
	expect(storage.write).toHaveBeenLastCalledWith(null);
	expect(onExpired).toHaveBeenCalledTimes(1);
});
it('expires after one retry if the new access token is rejected too', async () => {
	const { auth, post, adapter } = await setup();
	const onExpired = jest.fn();
	auth.subscribeExpired(onExpired);
	adapter.mockImplementation(async (config) => {
		throw reject(config);
	});
	await expect(auth.instance.get('/one')).rejects.toBeInstanceOf(InvalidSessionError);
	expect(adapter).toHaveBeenCalledTimes(2);
	expect(post).toHaveBeenCalledTimes(1);
	expect(auth.getSession()).toBeNull();
	expect(onExpired).toHaveBeenCalledTimes(1);
});
it('does not refresh forbidden requests', async () => {
	const { auth, post, adapter } = await setup();
	adapter.mockImplementation(async (config) => {
		throw reject(config, 403);
	});
	await expect(auth.instance.get('/one')).rejects.toMatchObject({ response: { status: 403 } });
	expect(post).not.toHaveBeenCalled();
});
it('clears locally even if remote logout is offline', async () => {
	const { auth, adapter, storage } = await setup();
	adapter.mockRejectedValue(new AxiosError('Offline'));
	await expect(auth.signOut(true)).resolves.toMatchObject({ success: false, error: { message: 'Offline' } });
	expect(storage.write).toHaveBeenLastCalledWith(null);
	expect(auth.getSession()).toBeNull();
	expect(adapter.mock.calls[0][0].headers.get('Cookie')).toBe('facturation_backend-jwt-refresh=refresh-1');
});
it('refreshes a rejected logout and revokes with the rotated cookie', async () => {
	const { auth, adapter, storage } = await setup();
	await auth.signOut(true);
	expect(adapter).toHaveBeenCalledTimes(2);
	expect(adapter.mock.calls[1][0].headers.get('Cookie')).toBe('facturation_backend-jwt-refresh=refresh-2');
	expect(storage.write).toHaveBeenLastCalledWith(null);
});
it('queues logout behind an in-flight library refresh', async () => {
	const { auth, post, adapter } = await setup();
	let finish!: (value: AxiosResponse) => void;
	post.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const pending = auth.instance.get('/one');
	while (!finish) await Promise.resolve();
	const logout = auth.signOut(true);
	finish(response(tokens({ access: 'access-2', refresh: 'rotated-refresh' })));
	await Promise.all([pending, logout]);
	const logoutRequest = adapter.mock.calls.find(([config]) => config.url === '/account/logout/');
	expect(logoutRequest?.[0].headers.get('Cookie')).toBe('facturation_backend-jwt-refresh=rotated-refresh');
	expect(auth.getSession()).toBeNull();
});
it('cannot persist a refresh that finishes after the session was cleared', async () => {
	const { auth, post, storage } = await setup();
	let finish!: (value: AxiosResponse) => void;
	post.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const pending = auth.instance.get('/one');
	const rejected = expect(pending).rejects.toThrow('Session changed');
	while (!finish) await Promise.resolve();
	await auth.clear();
	finish(response(tokens({ access: 'late-access' })));
	await rejected;
	expect(storage.write).toHaveBeenLastCalledWith(null);
	expect(auth.getSession()).toBeNull();
});
it('rejects late responses and queued requests across a new login', async () => {
	const { auth, post, adapter } = await setup();
	let finish!: (value: AxiosResponse) => void;
	post.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const first = auth.instance.get('/one');
	const firstRejected = expect(first).rejects.toThrow('Session changed');
	while (!finish) await Promise.resolve();
	const queued = auth.instance.get('/queued');
	const queuedRejected = expect(queued).rejects.toThrow();
	await auth.clear();
	await auth.signIn({ email: 'new@example.invalid', password: 'example-pass' });
	await expect(auth.instance.get('/new')).resolves.toMatchObject({ data: { id: 7 } });
	finish(response(tokens({ access: 'old-response' })));
	await Promise.all([firstRejected, queuedRejected]);
	expect(adapter.mock.calls.some(([config]) => config.url === '/queued')).toBe(false);
	expect(auth.getSession()?.access).toBe('access-2');
});
it('does not accept a login response after logout cleared the session', async () => {
	const { auth, post } = await setup(null);
	let finish!: (value: AxiosResponse) => void;
	post.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const pending = auth.signIn({ email: 'test@example.invalid', password: 'example-pass' });
	const rejected = expect(pending).resolves.toMatchObject({ success: false, error: { message: 'Session changed' } });
	while (!finish) await Promise.resolve();
	await auth.clear();
	finish(response(tokens()));
	await rejected;
	expect(auth.getSession()).toBeNull();
});

it('forwards browser cookies for logout without setting a forbidden Cookie header', async () => {
	const transport = create({ withCredentials: true });
	const auth = createAuthClient(transport, { read: async () => tokens(), write: async () => {} });
	await auth.restore();
	auth.instance.defaults.adapter = async (config) => {
		expect(config.withCredentials).toBe(true);
		expect(config.headers.has('Cookie')).toBe(false);
		return response({}, config);
	};
	await auth.signOut(false);
	expect(auth.getSession()).toBeNull();
});

// Original authorize/jwt scenarios adapted to the native auth client.
it.each([
	['invalid email format', { email: 'invalid-email', password: 'pass' }],
	['missing password', { email: 'test@example.com' }],
	['missing email', { password: 'password123' }],
])('rejects %s before calling the login API', async (_case, credentials) => {
	const { auth, post } = await setup(null);
	await expect(auth.signIn(credentials as Credentials)).resolves.toMatchObject({
		success: false,
		error: expect.any(Error),
	});
	expect(post).not.toHaveBeenCalled();
});
it('should keep old refresh token if not provided in refresh response', async () => {
	const { auth, post, storage } = await setup();
	post.mockResolvedValueOnce(response({ access: 'new-access-token', access_expiration: '2099-01-01T00:00:00Z' }));
	await auth.instance.get('/one');
	expect(auth.getSession()?.refresh).toBe('refresh-1');
	expect(storage.write).toHaveBeenLastCalledWith(
		expect.objectContaining({ access: 'new-access-token', refresh: 'refresh-1' }),
	);
});

describe('proactive session refresh', () => {
	beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-16T10:00:00Z') }));
	afterEach(() => jest.useRealTimers());

	it.each([null, tokens({ access_expiration: '2030-01-01T00:00:00Z' })])(
		'does not refresh a guest or a session outside the expiry window',
		async (initial) => {
			const { auth, post } = await setup(initial);
			await auth.refresh();
			expect(post).not.toHaveBeenCalled();
		},
	);
	it.each([5 * 60000, 0, -60000])('refreshes with %s ms remaining without waiting for a 401', async (remaining) => {
		const { auth, post, storage, adapter } = await setup(
			tokens({ access_expiration: new Date(Date.now() + remaining).toISOString() }),
		);
		const onSession = jest.fn();
		auth.subscribe(onSession);
		await auth.refresh();
		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith('/account/token_refresh/', { refresh: 'refresh-1' });
		expect(adapter).not.toHaveBeenCalled();
		expect(storage.write).toHaveBeenLastCalledWith(
			expect.objectContaining({ access: 'access-2', refresh: 'refresh-2' }),
		);
		expect(onSession).toHaveBeenCalledTimes(1);
		await auth.refresh();
		expect(post).toHaveBeenCalledTimes(1);
	});
	it('expires an aged refresh token even if the access token has time remaining', async () => {
		const { auth, post } = await setup(tokens({ refresh_expiration: new Date(Date.now() + 60000).toISOString() }));
		const onExpired = jest.fn();
		auth.subscribeExpired(onExpired);
		jest.advanceTimersByTime(60000);
		await expect(auth.refresh()).resolves.toEqual({ success: false, error: expect.any(InvalidSessionError) });
		expect(post).not.toHaveBeenCalled();
		expect(auth.getSession()).toBeNull();
		expect(onExpired).toHaveBeenCalledTimes(1);
	});
	it.each([400, 401])('clears a session rejected by proactive refresh (%s)', async (status) => {
		const { auth, post, storage } = await setup(tokens({ access_expiration: new Date().toISOString() }));
		post.mockRejectedValueOnce(reject({ headers: new AxiosHeaders() }, status));
		await expect(auth.refresh()).resolves.toEqual({ success: false, error: expect.any(InvalidSessionError) });
		expect(auth.getSession()).toBeNull();
		expect(storage.write).toHaveBeenLastCalledWith(null);
	});
	it.each([new AxiosError('Offline', 'ERR_NETWORK'), reject({ headers: new AxiosHeaders() }, 500)])(
		'preserves the session on transient refresh failure and retries later',
		async (failure) => {
			const { auth, post } = await setup(tokens({ access_expiration: new Date().toISOString() }));
			post.mockRejectedValueOnce(failure);
			await expect(auth.refresh()).resolves.toEqual({ success: false, error: failure });
			expect(auth.getSession()?.access).toBe('access-1');
			await auth.refresh();
			expect(post).toHaveBeenCalledTimes(2);
			expect(auth.getSession()?.access).toBe('access-2');
		},
	);
	it('shares scheduled refreshes and sends queued requests with the rotated token', async () => {
		const { auth, post, adapter } = await setup(tokens({ access_expiration: new Date().toISOString() }));
		let finish!: (value: AxiosResponse) => void;
		post.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const first = auth.refresh();
		const second = auth.refresh();
		const request = auth.instance.get('/protected');
		await Promise.resolve();
		expect(adapter).not.toHaveBeenCalled();
		finish(response(tokens({ access: 'access-2', refresh: 'rotated-refresh' })));
		await Promise.all([first, second, request]);
		expect(post).toHaveBeenCalledTimes(1);
		expect(adapter).toHaveBeenCalledTimes(1);
		expect(adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer access-2');
	});
	it('shares a 401 refresh already in progress with a scheduled check', async () => {
		const { auth, post } = await setup();
		let finish!: (value: AxiosResponse) => void;
		post.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const request = auth.instance.get('/protected');
		while (!finish) await Promise.resolve();
		const scheduled = auth.refresh();
		finish(response(tokens({ access: 'access-2' })));
		await Promise.all([scheduled, request]);
		expect(post).toHaveBeenCalledTimes(1);
	});
	it('preserves transient refresh errors for requests waiting behind proactive refresh', async () => {
		const { auth, post } = await setup(tokens({ access_expiration: new Date().toISOString() }));
		let fail!: (error: AxiosError) => void;
		post.mockImplementationOnce(
			() =>
				new Promise((_resolve, rejectRequest) => {
					fail = rejectRequest;
				}),
		);
		const scheduled = auth.refresh();
		const request = auth.instance.get('/protected');
		const failure = reject({ headers: new AxiosHeaders(), url: '/account/token_refresh/' }, 500);
		const refreshRejected = expect(scheduled).resolves.toEqual({ success: false, error: failure });
		const requestRejected = expect(request).rejects.toBe(failure);
		await Promise.resolve();
		fail(failure);
		await Promise.all([refreshRejected, requestRejected]);
		expect(auth.getSession()?.access).toBe('access-1');
		await expect(auth.instance.get('/protected')).resolves.toMatchObject({ data: { id: 7 } });
	});
	it('retries a delayed 401 during proactive refresh without a second token rotation', async () => {
		const { auth, post, adapter } = await setup(tokens({ access_expiration: new Date().toISOString() }));
		let fail!: () => void;
		adapter.mockImplementationOnce(
			(config) =>
				new Promise((_resolve, rejectRequest) => {
					fail = () => rejectRequest(reject(config));
				}),
		);
		const request = auth.instance.get('/protected');
		while (!fail) await Promise.resolve();
		let finish!: (value: AxiosResponse) => void;
		post.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const scheduled = auth.refresh();
		fail();
		finish(response(tokens({ access: 'access-2' })));
		await Promise.all([scheduled, request]);
		expect(post).toHaveBeenCalledTimes(1);
		expect(adapter).toHaveBeenCalledTimes(2);
	});
	it('does not restore a session cleared while proactive refresh was pending', async () => {
		const { auth, post } = await setup(tokens({ access_expiration: new Date().toISOString() }));
		let finish!: (value: AxiosResponse) => void;
		post.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		const pending = auth.refresh();
		const rejected = expect(pending).resolves.toMatchObject({ success: false, error: { message: 'Session changed' } });
		await auth.clear();
		finish(response(tokens({ access: 'late-access' })));
		await rejected;
		expect(auth.getSession()).toBeNull();
	});
});
