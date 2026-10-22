import { setupApiStore } from '@/store/setupApiStore';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { notificationApi } from '@/store/services/notification';
import { auth } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
const createStore = () =>
	configureStore({
		reducer: { [notificationApi.reducerPath]: notificationApi.reducer },
		middleware: (get) => get().concat(notificationApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	adapter.mockImplementation(async (config) =>
		response(config, { ok: true, count: 0, next: null, previous: null, results: [] }),
	);
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(notificationApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});
it('uses configured URLs for notification queries and mutations', async () => {
	const env = [
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_FACTURATION_NOTIFICATIONS', '/custom/notifications/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_FACTURATION_NOTIFICATION_PREFERENCES', '/custom/preferences/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_FACTURATION_NOTIFICATION_MARK_READ', '/custom/read/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_FACTURATION_NOTIFICATION_UNREAD_COUNT', '/custom/unread/'),
	];
	try {
		await store.dispatch(notificationApi.endpoints.getNotifications.initiate({}, { subscribe: false })).unwrap();
		await store
			.dispatch(notificationApi.endpoints.getNotificationPreferences.initiate(undefined, { subscribe: false }))
			.unwrap();
		await store
			.dispatch(notificationApi.endpoints.getUnreadNotificationCount.initiate(undefined, { subscribe: false }))
			.unwrap();
		await store.dispatch(notificationApi.endpoints.updateNotificationPreferences.initiate({})).unwrap();
		await store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate({ ids: [2] })).unwrap();
		expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
			'/custom/notifications/',
			'/custom/preferences/',
			'/custom/unread/',
			'/custom/preferences/',
			'/custom/read/',
		]);
	} finally {
		env.forEach((variable) => variable.restore());
	}
});
it('loads the correct paginated notification endpoint and preserves next/previous links', async () => {
	const data = { count: 12, next: null, previous: 'http://localhost:8000/api/notifications/?page=1', results: [] };
	adapter.mockImplementation(async (config) => response(config, data));
	await expect(
		store.dispatch(notificationApi.endpoints.getNotifications.initiate({ page: 2 })).unwrap(),
	).resolves.toEqual(data);
	expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/notifications/', method: 'get', params: { page: 2 } });
});
it('marks selected notifications in the cached list and refreshes only the unread count', async () => {
	let read = false;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'post') {
			read = true;
			return response(config, { updated: 1 });
		}
		return response(
			config,
			config.url === '/notifications/unread-count/'
				? { count: read ? 0 : 1 }
				: { count: 1, next: null, previous: null, results: [{ id: 2, is_read: read }] },
		);
	});
	const list = store.dispatch(notificationApi.endpoints.getNotifications.initiate({}));
	const count = store.dispatch(notificationApi.endpoints.getUnreadNotificationCount.initiate());
	await Promise.all([list.unwrap(), count.unwrap()]);
	await expect(
		store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate({ ids: [2] })).unwrap(),
	).resolves.toEqual({ updated: 1 });
	await Promise.all(store.dispatch(notificationApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
	const request = adapter.mock.calls.find(([config]) => config.method === 'post')![0];
	expect(request).toMatchObject({ url: '/notifications/mark-read/', method: 'post' });
	expect(JSON.parse(request.data)).toEqual({ ids: [2] });
	expect(notificationApi.endpoints.getUnreadNotificationCount.select()(store.getState()).data).toEqual({ count: 0 });
	expect(notificationApi.endpoints.getNotifications.select({})(store.getState()).data?.results[0].is_read).toBe(true);
	expect(adapter.mock.calls.filter(([config]) => config.url === '/notifications/')).toHaveLength(1);
	expect(adapter.mock.calls.filter(([config]) => config.url === '/notifications/unread-count/')).toHaveLength(2);
	list.unsubscribe();
	count.unsubscribe();
});
it('uses an empty body to mark all notifications read, exactly as Django expects', async () => {
	adapter.mockImplementation(async (config) => response(config, { updated: 7 }));
	await store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate({})).unwrap();
	expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({});
});

it.each([{}, { ids: [] }])('marks all cached pages read without downloading them again for %j', async (data) => {
	adapter.mockImplementation(async (config) =>
		response(
			config,
			config.method === 'post'
				? { updated: 2 }
				: {
						count: 2,
						next: config.params.page === 1 ? '?page=2' : null,
						previous: config.params.page === 2 ? '?page=1' : null,
						results: [{ id: config.params.page, is_read: false }],
					},
		),
	);
	for (const page of [1, 2]) {
		await store.dispatch(notificationApi.endpoints.getNotifications.initiate({ page }, { subscribe: false })).unwrap();
	}
	await store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate(data)).unwrap();
	for (const page of [1, 2]) {
		expect(notificationApi.endpoints.getNotifications.select({ page })(store.getState()).data?.results[0].is_read).toBe(
			true,
		);
	}
	expect(adapter.mock.calls.filter(([config]) => config.url === '/notifications/')).toHaveLength(2);
});

it('keeps cached read flags and unread counts unchanged when acknowledgement fails', async () => {
	adapter.mockImplementation(async (config) => {
		if (config.method === 'post') throw new AxiosError('Offline', 'ERR_NETWORK', config);
		return response(
			config,
			config.url === '/notifications/unread-count/'
				? { count: 1 }
				: {
						count: 1,
						next: null,
						previous: null,
						results: [{ id: 2, is_read: false }],
					},
		);
	});
	const list = store.dispatch(notificationApi.endpoints.getNotifications.initiate({ page: 1 }));
	const count = store.dispatch(notificationApi.endpoints.getUnreadNotificationCount.initiate());
	await Promise.all([list.unwrap(), count.unwrap()]);
	await expect(
		store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate({ ids: [2] })).unwrap(),
	).rejects.toMatchObject({ status: 0 });
	expect(
		notificationApi.endpoints.getNotifications.select({ page: 1 })(store.getState()).data?.results[0].is_read,
	).toBe(false);
	expect(notificationApi.endpoints.getUnreadNotificationCount.select()(store.getState()).data?.count).toBe(1);
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	list.unsubscribe();
	count.unsubscribe();
});
it('persists preferences with PUT and refreshes their subscribed query', async () => {
	let hours = 24;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'put') hours = JSON.parse(config.data).low_stock_repeat_hours;
		return response(config, { id: 1, low_stock_repeat_hours: hours });
	});
	const query = store.dispatch(notificationApi.endpoints.getNotificationPreferences.initiate());
	await query.unwrap();
	await store
		.dispatch(notificationApi.endpoints.updateNotificationPreferences.initiate({ low_stock_repeat_hours: 48 }))
		.unwrap();
	await Promise.all(store.dispatch(notificationApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
	expect(adapter.mock.calls[1][0]).toMatchObject({ url: '/notifications/preferences/', method: 'put' });
	expect(
		notificationApi.endpoints.getNotificationPreferences.select()(store.getState()).data?.low_stock_repeat_hours,
	).toBe(48);
	query.unsubscribe();
});
it('returns backend validation errors without reporting a successful save', async () => {
	const data = {
		status_code: 400,
		message: 'Invalid preferences',
		details: { low_stock_repeat_hours: ['Invalid value.'] },
	};
	adapter.mockImplementation(async (config) => {
		throw new AxiosError('Invalid', 'ERR_BAD_REQUEST', config, undefined, response(config, data, 400));
	});
	await expect(
		store
			.dispatch(notificationApi.endpoints.updateNotificationPreferences.initiate({ low_stock_repeat_hours: -1 }))
			.unwrap(),
	).rejects.toEqual({ status: 400, data });
});

describe('notificationApi endpoints', () => {
	const storeRef = setupApiStore(notificationApi);
	const endpointCalls: Array<[string, () => Promise<unknown>]> = [
		[
			'getNotifications',
			async () => storeRef.store.dispatch(notificationApi.endpoints.getNotifications.initiate({ page: 2 })).unwrap(),
		],
		[
			'getNotificationPreferences',
			async () => storeRef.store.dispatch(notificationApi.endpoints.getNotificationPreferences.initiate()).unwrap(),
		],
		[
			'updateNotificationPreferences',
			async () =>
				storeRef.store.dispatch(notificationApi.endpoints.updateNotificationPreferences.initiate({})).unwrap(),
		],
		[
			'markNotificationsRead',
			async () =>
				storeRef.store.dispatch(notificationApi.endpoints.markNotificationsRead.initiate({ ids: [1, 2] })).unwrap(),
		],
		[
			'getUnreadNotificationCount',
			async () => storeRef.store.dispatch(notificationApi.endpoints.getUnreadNotificationCount.initiate()).unwrap(),
		],
	];

	it.each(endpointCalls)('%s completes without an API error', async (_name, callEndpoint) => {
		await expect(callEndpoint()).resolves.toEqual(expect.objectContaining({ ok: true }));
	});

	it('exposes every tested endpoint', () => {
		expect(Object.keys(notificationApi.endpoints)).toHaveLength(endpointCalls.length);
	});
});
