import type { Action } from 'redux';
import * as Types from '@/store/actions';
import { eventChannel, runSaga, stdChannel, type Task, SagaIterator } from 'redux-saga';
import type { AxiosInstance } from 'axios';
import type { UnknownAction } from '@reduxjs/toolkit';
import { watchWS } from '@/store/sagas/wsSaga';
import { initMaintenanceSaga, watchInit } from '@/store/sagas/_initSaga';
import { all, call } from 'redux-saga/effects';
import { initWebsocket } from '@/store/services/ws';
import { auth } from '@/auth';
import { allowAnyInstance, isAuthenticatedInstance } from '@/utils/helpers';
import { initToken } from '@/store/slices/_initSlice';
import { setWSMaintenance, setWSServerVersion } from '@/store/slices/wsSlice';
import {
	initMaintenanceAction,
	startWSAction,
	stopWSAction,
	WSMaintenanceAction,
	WSReconnectedAction,
	WSNotificationAction,
	WSUserAvatarAction,
} from '@/store/actions/wsActions';
import { accountLogoutAction } from '@/store/actions/accountActions';
import type { WSAction } from '@/types/wsTypes';
import type { Tokens } from '@/types/accountTypes';
import type { NotificationType } from '@/types/notificationTypes';
import { notificationApi } from '@/store/services/notification';
import { incrementUnreadCount, setLatestNotification } from '@/store/slices/notificationSlice';
import { Platform } from 'react-native';
import { PermissionStatus } from 'expo';
import {
	getPermissionsAsync,
	requestPermissionsAsync,
	scheduleNotificationAsync,
	setNotificationHandler,
	type NotificationPermissionsStatus,
} from 'expo-notifications';

jest.mock('expo-asset', () => ({
	Asset: { fromModule: jest.fn(() => ({ uri: 'asset:/icon.png' })) },
}));
jest.mock('expo-notifications', () => ({
	getPermissionsAsync: jest.fn(),
	requestPermissionsAsync: jest.fn(),
	scheduleNotificationAsync: jest.fn(),
	setNotificationHandler: jest.fn(),
}));
jest.mock('@/utils/helpers', () => ({ allowAnyInstance: jest.fn(), isAuthenticatedInstance: jest.fn() }));
jest.mock('@/auth', () => ({
	...jest.requireActual<typeof import('@/auth')>('@/auth'),
	auth: { epoch: 1, getSession: jest.fn(), refresh: jest.fn(async () => {}), signOut: jest.fn(async () => {}) },
}));
jest.mock('@/store/services/notification', () => ({
	notificationApi: {
		util: {
			invalidateTags: (tags: string[]) => ({ type: 'notificationApi/invalidateTags', payload: tags }),
			resetApiState: () => ({ type: 'notificationApi/resetApiState' }),
		},
	},
}));
jest.mock('@/store/services/ws', () => ({ initWebsocket: jest.fn() }));
const publicGet = jest.fn();
const privateGet = jest.fn();
const tasks: Task[] = [];
const sagaErrors: unknown[] = [];
const originalPlatform = Platform.OS;
const originalNotification = Object.getOwnPropertyDescriptor(window, 'Notification');
const permissions = (granted: boolean): NotificationPermissionsStatus => ({
	granted,
	status: granted ? PermissionStatus.GRANTED : PermissionStatus.DENIED,
	canAskAgain: !granted,
	expires: 'never',
});
const notification: NotificationType = {
	id: 10,
	title: 'Stock minimum',
	message: 'Article disponible: 2',
	notification_type: 'low_stock',
	object_id: 4,
	target_url: '/dashboard/stock?company_id=2',
	is_read: false,
	date_created: '2026-10-14T12:00:00Z',
};
const tokens = (access: string): Tokens => ({
	access,
	refresh: 'refresh',
	access_expiration: '2030-01-01T00:00:00Z',
	refresh_expiration: '2031-01-01T00:00:00Z',
});
const deferred = <T>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
};
const flush = async () => {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
};
function* watchers(): SagaIterator {
	yield all([call(watchInit), call(watchWS)]);
}
const start = (saga = watchers) => {
	const bus = stdChannel();
	const actions: UnknownAction[] = [];
	const task = runSaga(
		{
			channel: bus,
			onError: (error) => {
				sagaErrors.push(error);
			},
			dispatch: (action: UnknownAction) => {
				actions.push(action);
				bus.put(action);
			},
		},
		saga,
	);
	tasks.push(task);
	return { task, actions, send: (action: UnknownAction) => bus.put(action) };
};
const startSocket = () => {
	let emit!: (action: WSAction) => void;
	jest.mocked(initWebsocket).mockImplementation(() =>
		eventChannel((next) => {
			emit = next;
			return () => {};
		}),
	);
	const socket = start();
	socket.send(startWSAction());
	return { ...socket, emit };
};
beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
	jest.mocked(getPermissionsAsync).mockReset().mockResolvedValue(permissions(false));
	jest.mocked(scheduleNotificationAsync).mockReset().mockResolvedValue('notification-id');
	jest.mocked(setNotificationHandler).mockReset();
	sagaErrors.length = 0;
	Object.defineProperty(auth, 'epoch', { configurable: true, value: 1 });
	jest.mocked(auth.getSession).mockReturnValue(tokens('old'));
	jest.mocked(auth.refresh).mockReset().mockResolvedValue({ success: true, data: undefined });
	jest.mocked(auth.signOut).mockReset().mockResolvedValue({ success: true, data: undefined });
	jest.mocked(allowAnyInstance).mockReturnValue({ get: publicGet } as unknown as AxiosInstance);
	jest.mocked(isAuthenticatedInstance).mockReturnValue({ get: privateGet } as unknown as AxiosInstance);
	privateGet.mockResolvedValue({ data: {} });
	jest.mocked(initWebsocket).mockImplementation(() => eventChannel(() => () => {}));
	publicGet.mockReturnValue(new Promise(() => {}));
});
afterEach(async () => {
	tasks.splice(0).forEach((task) => task.cancel());
	await flush();
	Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
	if (originalNotification) Object.defineProperty(window, 'Notification', originalNotification);
	else Reflect.deleteProperty(window, 'Notification');
	expect(sagaErrors).toEqual([]);
});

describe('watchWS saga', () => {
	it('bootstraps public maintenance without requiring a session or authenticated request', async () => {
		jest.mocked(auth.getSession).mockReturnValue(null);
		publicGet.mockResolvedValue({
			status: 200,
			data: { maintenance: true, version: '9.0.0', version_mobile: '3.6.2' },
		});
		const { task, actions } = start(initMaintenanceSaga);
		await task.toPromise();
		expect(publicGet).toHaveBeenCalledWith('/ws/maintenance/', { params: undefined, signal: expect.any(AbortSignal) });
		expect(privateGet).not.toHaveBeenCalled();
		expect(actions).toEqual([setWSMaintenance(true), setWSServerVersion('3.6.2')]);
	});

	it('preserves the last state on network errors', async () => {
		publicGet.mockRejectedValue(new Error('offline'));
		const { task, actions } = start(initMaintenanceSaga);
		await task.toPromise();
		expect(actions).toEqual([]);
	});

	it('does not announce a web release when the HTTP response has no mobile version', async () => {
		publicGet.mockResolvedValue({ status: 200, data: { maintenance: false, version: '9.0.0' } });
		const { task, actions } = start(initMaintenanceSaga);
		await task.toPromise();
		expect(actions).toEqual([setWSMaintenance(false)]);
	});

	it('aborts an older HTTP snapshot when a live signal arrives and ignores its eventual response', async () => {
		const pending = deferred<{ data: { maintenance: boolean; version_mobile: string } }>();
		publicGet.mockReturnValue(pending.promise);
		let emit!: (action: WSAction) => void;
		const unsubscribe = jest.fn();
		jest.mocked(initWebsocket).mockImplementation(() =>
			eventChannel((next) => {
				emit = next;
				return unsubscribe;
			}),
		);
		const { send, actions } = start();
		send(startWSAction());
		send(initMaintenanceAction());
		const signal: AbortSignal = publicGet.mock.calls[0][1].signal;
		emit(WSMaintenanceAction(true, '3.6.3'));
		await flush();
		expect(signal.aborted).toBe(true);
		pending.resolve({ data: { maintenance: false, version_mobile: '3.6.2' } });
		await flush();
		expect(actions).toContainEqual(setWSMaintenance(true));
		expect(actions).toContainEqual(setWSServerVersion('3.6.3'));
		expect(actions).not.toContainEqual(setWSMaintenance(false));
		expect(actions).not.toContainEqual(setWSServerVersion('3.6.2'));
	});

	it('refreshes a public snapshot when a socket connects and cancels superseded HTTP checks', async () => {
		let emit!: (action: WSAction) => void;
		jest.mocked(initWebsocket).mockImplementation(() =>
			eventChannel((next) => {
				emit = next;
				return () => {};
			}),
		);
		const { send } = start();
		send(startWSAction());
		emit(WSReconnectedAction());
		expect(publicGet).toHaveBeenCalledTimes(1);
		const firstSignal: AbortSignal = publicGet.mock.calls[0][1].signal;
		send(initMaintenanceAction());
		expect(firstSignal.aborted).toBe(true);
		expect(publicGet).toHaveBeenCalledTimes(2);
	});

	it.each([stopWSAction(), accountLogoutAction(), initToken()])(
		'closes the active channel on $type',
		async (action) => {
			const unsubscribe = jest.fn();
			jest.mocked(initWebsocket).mockImplementation(() => eventChannel(() => unsubscribe));
			const { send } = start();
			send(startWSAction());
			send(action);
			await flush();
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		},
	);

	it('closes an old connection before starting another and closes the last one on cancellation', async () => {
		const closes: jest.Mock[] = [];
		jest.mocked(initWebsocket).mockImplementation(() =>
			eventChannel(() => {
				const close = jest.fn();
				closes.push(close);
				return close;
			}),
		);
		const { send, task } = start();
		send(startWSAction());
		send(startWSAction());
		expect(closes[0]).toHaveBeenCalledTimes(1);
		expect(closes[1]).not.toHaveBeenCalled();
		task.cancel();
		await flush();
		expect(closes[1]).toHaveBeenCalledTimes(1);
	});

	it('reads the rotated access token through session refresh without a profile API request', async () => {
		const { send } = start();
		send(startWSAction());
		const getToken = jest.mocked(initWebsocket).mock.calls[0][0];
		jest.mocked(auth.refresh).mockImplementationOnce(async () => {
			jest.mocked(auth.getSession).mockReturnValue(tokens('rotated'));
			return { success: true, data: undefined };
		});
		await expect(getToken()).resolves.toBe('rotated');
		expect(auth.refresh).toHaveBeenCalledTimes(1);
		expect(isAuthenticatedInstance).not.toHaveBeenCalled();
		expect(privateGet).not.toHaveBeenCalled();
	});

	it('does not request a socket token for guests or reuse a token after logout during refresh', async () => {
		const { send } = start();
		send(startWSAction());
		const getToken = jest.mocked(initWebsocket).mock.calls[0][0];
		jest.mocked(auth.getSession).mockReturnValue(null);
		await expect(getToken()).resolves.toBeNull();
		expect(auth.refresh).not.toHaveBeenCalled();
		expect(privateGet).not.toHaveBeenCalled();
		jest.mocked(auth.getSession).mockReturnValue(tokens('old'));
		const pending = deferred<Awaited<ReturnType<typeof auth.refresh>>>();
		jest.mocked(auth.refresh).mockReturnValueOnce(pending.promise);
		const request = getToken();
		Object.defineProperty(auth, 'epoch', { configurable: true, value: 2 });
		jest.mocked(auth.getSession).mockReturnValue(tokens('different-account'));
		pending.resolve({ success: true, data: undefined });
		await expect(request).resolves.toBeNull();
	});

	it('allows the socket service to retry a failed session refresh without clearing the session', async () => {
		const { send } = start();
		send(startWSAction());
		const getToken = jest.mocked(initWebsocket).mock.calls[0][0];
		const failure = new Error('Offline');
		jest.mocked(auth.refresh).mockResolvedValueOnce({ success: false, error: failure });
		await expect(getToken()).resolves.toBeNull();
		expect(auth.signOut).not.toHaveBeenCalled();
		await expect(getToken()).resolves.toBe('old');
		expect(auth.refresh).toHaveBeenCalledTimes(2);
	});

	it('updates in-app notification state and invalidates cached lists without requesting OS permissions', async () => {
		let emit!: (action: WSAction) => void;
		jest.mocked(initWebsocket).mockImplementation(() =>
			eventChannel((next) => {
				emit = next;
				return () => {};
			}),
		);
		const { send, actions } = start();
		send(startWSAction());
		emit(WSNotificationAction(notification));
		await flush();
		expect(actions).toContainEqual(incrementUnreadCount());
		expect(actions).toContainEqual(setLatestNotification(notification));
		expect(actions).toContainEqual(notificationApi.util.invalidateTags(['Notification']));
		actions.length = 0;
		emit(WSNotificationAction({ ...notification, is_read: true }));
		await flush();
		expect(actions).not.toContainEqual(incrementUnreadCount());
		expect(actions).toContainEqual(setLatestNotification({ ...notification, is_read: true }));
		expect(requestPermissionsAsync).not.toHaveBeenCalled();
		expect(scheduleNotificationAsync).not.toHaveBeenCalled();
	});

	it.each(['ios', 'android'] as const)(
		'shows an immediate system notification on %s only with granted permission',
		async (platform) => {
			Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
			jest.mocked(getPermissionsAsync).mockResolvedValue(permissions(true));
			const { emit } = startSocket();
			emit(WSNotificationAction(notification));
			await flush();
			expect(scheduleNotificationAsync).toHaveBeenCalledWith({
				content: { title: notification.title, body: notification.message },
				trigger: platform === 'android' ? { channelId: 'facturation' } : null,
			});
			expect(requestPermissionsAsync).not.toHaveBeenCalled();
			const handler = jest.mocked(setNotificationHandler).mock.calls[0][0];
			expect(handler).not.toBeNull();
			await expect(
				handler!.handleNotification({} as Parameters<NonNullable<typeof handler>['handleNotification']>[0]),
			).resolves.toEqual({
				shouldShowBanner: true,
				shouldShowList: true,
				shouldPlaySound: false,
				shouldSetBadge: false,
			});
			jest.mocked(auth.getSession).mockReturnValue(null);
			await expect(
				handler!.handleNotification({} as Parameters<NonNullable<typeof handler>['handleNotification']>[0]),
			).resolves.toMatchObject({
				shouldShowBanner: false,
				shouldShowList: false,
			});
		},
	);

	it('continues processing socket messages while system permissions are being read', async () => {
		const pending = deferred<NotificationPermissionsStatus>();
		jest.mocked(getPermissionsAsync).mockReturnValue(pending.promise);
		const { emit, actions } = startSocket();
		emit(WSNotificationAction(notification));
		emit(WSMaintenanceAction(true, '3.7.2'));
		expect(actions).toContainEqual(setWSMaintenance(true));
		expect(actions).toContainEqual(setLatestNotification(notification));
		expect(scheduleNotificationAsync).not.toHaveBeenCalled();
		pending.resolve(permissions(true));
		await flush();
		expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
	});

	it.each([stopWSAction(), accountLogoutAction(), initToken()])(
		'does not display a late notification after $type',
		async (action) => {
			const pending = deferred<NotificationPermissionsStatus>();
			jest.mocked(getPermissionsAsync).mockReturnValue(pending.promise);
			const { emit, send } = startSocket();
			emit(WSNotificationAction(notification));
			send(action);
			pending.resolve(permissions(true));
			await flush();
			expect(scheduleNotificationAsync).not.toHaveBeenCalled();
		},
	);

	it('does not display a previous account notification after the session changes', async () => {
		const pending = deferred<NotificationPermissionsStatus>();
		jest.mocked(getPermissionsAsync).mockReturnValue(pending.promise);
		const { emit } = startSocket();
		emit(WSNotificationAction(notification));
		Object.defineProperty(auth, 'epoch', { configurable: true, value: 2 });
		jest.mocked(auth.getSession).mockReturnValue(tokens('different-account'));
		pending.resolve(permissions(true));
		await flush();
		expect(scheduleNotificationAsync).not.toHaveBeenCalled();
	});

	it.each(['handler', 'permissions', 'schedule'])(
		'keeps socket and in-app notifications working when the system %s fails',
		async (failure) => {
			jest.mocked(getPermissionsAsync).mockResolvedValue(permissions(true));
			if (failure === 'handler')
				jest.mocked(setNotificationHandler).mockImplementationOnce(() => {
					throw new Error('unavailable');
				});
			if (failure === 'permissions') jest.mocked(getPermissionsAsync).mockRejectedValueOnce(new Error('unavailable'));
			if (failure === 'schedule')
				jest.mocked(scheduleNotificationAsync).mockRejectedValueOnce(new Error('unavailable'));
			const { emit, actions, task } = startSocket();
			emit(WSNotificationAction(notification));
			await flush();
			emit(WSMaintenanceAction(true));
			expect(task.isRunning()).toBe(true);
			expect(actions).toContainEqual(setLatestNotification(notification));
			expect(actions).toContainEqual(setWSMaintenance(true));
		},
	);

	it.each(['granted', 'denied', 'default'] as const)(
		'preserves browser system notifications for %s permission without native APIs',
		async (permission) => {
			Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
			const BrowserNotification = Object.assign(jest.fn(), { permission });
			Object.defineProperty(window, 'Notification', { configurable: true, value: BrowserNotification });
			const { emit, actions } = startSocket();
			emit(WSNotificationAction(notification));
			await flush();
			if (permission === 'granted') {
				expect(BrowserNotification).toHaveBeenCalledWith(notification.title, {
					body: notification.message,
					icon: 'asset:/icon.png',
				});
			} else expect(BrowserNotification).not.toHaveBeenCalled();
			expect(actions).toContainEqual(setLatestNotification(notification));
			expect(getPermissionsAsync).not.toHaveBeenCalled();
			expect(setNotificationHandler).not.toHaveBeenCalled();
			expect(scheduleNotificationAsync).not.toHaveBeenCalled();
		},
	);

	it('forwards avatar updates to account watchers and stops forwarding after logout', async () => {
		let emit!: (action: WSAction) => void;
		const close = jest.fn();
		jest.mocked(initWebsocket).mockImplementation(() =>
			eventChannel((next) => {
				emit = next;
				return close;
			}),
		);
		const { send, actions } = start();
		send(startWSAction());
		const action = WSUserAvatarAction(7, 'resized.png');
		emit(action);
		await flush();
		expect(actions).toContainEqual(action);
		send(initToken());
		expect(close).toHaveBeenCalledTimes(1);
		actions.length = 0;
		emit(WSUserAvatarAction(7, 'late.png'));
		await flush();
		expect(actions).not.toContainEqual(WSUserAvatarAction(7, 'late.png'));
	});

	it('aborts a pending public maintenance check when its initialization watcher is cancelled', async () => {
		const pending = deferred<{ data: { maintenance: boolean } }>();
		publicGet.mockReturnValue(pending.promise);
		const { send, task, actions } = start();
		send(initMaintenanceAction());
		const signal: AbortSignal = publicGet.mock.calls[0][1].signal;
		task.cancel();
		expect(signal.aborted).toBe(true);
		pending.resolve({ data: { maintenance: true } });
		await flush();
		expect(actions).not.toContainEqual(setWSMaintenance(true));
	});

	it.each([true, false])(
		'forwards HTTP maintenance %s and the announced version to the original reducers',
		async (maintenance) => {
			publicGet.mockResolvedValue({ status: 200, data: { maintenance, version_mobile: 'invalid' } });
			const { task, actions } = start(initMaintenanceSaga);
			await task.toPromise();
			expect(actions).toContainEqual(setWSMaintenance(maintenance));
			expect(actions).toContainEqual(setWSServerVersion('invalid'));
		},
	);

	it('should initialize websocket and dispatch actions from the channel', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction: Action = { type: 'MOCK_ACTION' };

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10); // emit after saga starts
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const bus = stdChannel();
		const task = runSaga(
			{
				channel: bus,
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);
		bus.put(startWSAction());

		// Cancel after short delay to break infinite loop
		setTimeout(() => task.cancel(), 100);

		await task.toPromise();

		expect(initWebsocket).toHaveBeenCalledWith(expect.any(Function));
		expect(dispatched).toContainEqual(mockAction);
	}, 10000); // Optional: increase timeout to 10s

	it('should request initMaintenanceSaga on WS_RECONNECTED', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction = { type: Types.WS_RECONNECTED };

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10);
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const bus = stdChannel();
		const task = runSaga(
			{
				channel: bus,
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);
		bus.put(startWSAction());

		setTimeout(() => task.cancel(), 100);
		await task.toPromise();

		expect(dispatched).toContainEqual(initMaintenanceAction());
	});

	it('should map WS_MAINTENANCE to setWSMaintenance', async () => {
		const dispatched: Action[] = [];
		const mockToken = 'mock-token';
		const mockAction = { type: Types.WS_MAINTENANCE, maintenance: true };

		const mockChannel = eventChannel((emit) => {
			const timer = setTimeout(() => emit(mockAction), 10);
			return () => clearTimeout(timer);
		});

		(initWebsocket as jest.Mock).mockReturnValue(mockChannel);

		const bus = stdChannel();
		const task = runSaga(
			{
				channel: bus,
				dispatch: (action: Action) => dispatched.push(action),
				getState: () => ({ auth: { token: mockToken } }),
			},
			watchWS,
		);
		bus.put(startWSAction());

		setTimeout(() => task.cancel(), 100);
		await task.toPromise();

		expect(initWebsocket).toHaveBeenCalledWith(expect.any(Function));
		expect(dispatched).toContainEqual(setWSMaintenance(true));
	});
});
