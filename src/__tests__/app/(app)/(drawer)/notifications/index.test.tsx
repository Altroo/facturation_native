import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { Provider } from 'react-redux';
import { Platform } from 'react-native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync } from 'expo-notifications';
import { auth } from '@/auth';
import NotificationsPage from '@/app/(app)/(drawer)/notifications';
import { NotificationStatus } from '@/components/layouts/navigationBar/navigationBar';
import notification from '@/store/slices/notificationSlice';
import { notificationApi } from '@/store/services/notification';
import type { NotificationType } from '@/types/notificationTypes';
import { translations } from '@/translations';
import { useToast } from '@/utils/hooks';
import { COMPANIES_VIEW } from '@/utils/routes';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-notifications', () => ({
	AndroidImportance: { DEFAULT: 3 },
	getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
	requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
	setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
jest.mock('@/utils/hooks', () => ({ ...jest.requireActual('@/utils/hooks'), useToast: jest.fn() }));
describe('notification inbox', () => {
	const onError = jest.fn();
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
			reducer: { notification, [notificationApi.reducerPath]: notificationApi.reducer },
			middleware: (get) => get().concat(notificationApi.middleware),
		});
	let store: ReturnType<typeof createStore>;
	let items: NotificationType[];
	let failMark = false;
	beforeEach(() => {
		jest.useFakeTimers();
		jest.clearAllMocks();
		store = createStore();
		failMark = false;
		items = [
			{
				id: 1,
				title: 'Company changed',
				message: 'Review company',
				notification_type: 'status_change',
				object_id: 7,
				target_url: '/dashboard/companies/7',
				is_read: false,
				date_created: '2026-10-14T12:00:00Z',
			},
			{
				id: 2,
				title: 'Invoice reminder',
				message: 'Due today',
				notification_type: 'overdue_invoice',
				object_id: 3,
				target_url: '/dashboard/factures-client/3',
				is_read: false,
				date_created: '2026-10-14T12:00:00Z',
			},
		];
		jest.mocked(useToast).mockReturnValue({ onError, onSuccess: jest.fn() } as never);
		auth.instance.defaults.adapter = adapter;
		adapter.mockImplementation(async (config) => {
			if (config.url === '/notifications/unread-count/')
				return response(config, { count: items.filter((item) => !item.is_read).length });
			if (config.method === 'post') {
				if (failMark) throw new AxiosError('Offline', 'ERR_NETWORK', config);
				const ids: number[] | undefined = JSON.parse(config.data).ids;
				items = items.map((item) => (!ids || ids.includes(item.id) ? { ...item, is_read: true } : item));
				return response(config, { updated: ids?.length ?? items.length });
			}
			const page = config.params.page;
			return response(config, {
				count: 2,
				next: page === 1 ? '/api/notifications/?page=2' : null,
				previous: page === 2 ? '/api/notifications/?page=1' : null,
				results: [{ ...items[page - 1] }],
			});
		});
	});
	afterEach(async () => {
		await cleanup();
		store.dispatch(notificationApi.util.resetApiState());
		await jest.runOnlyPendingTimersAsync();
		jest.useRealTimers();
	});
	const open = async () => {
		await render(
			<Provider store={store}>
				<NotificationStatus />
				<NotificationsPage />
			</Provider>,
		);
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(2));
		await screen.findByText('Company changed');
	};

	it('shows an empty full-page inbox without a mark-all action', async () => {
		adapter.mockImplementation(async (config) =>
			response(
				config,
				config.url === '/notifications/unread-count/'
					? { count: 0 }
					: { count: 0, next: null, previous: null, results: [] },
			),
		);
		await render(
			<Provider store={store}>
				<NotificationStatus />
				<NotificationsPage />
			</Provider>,
		);
		await screen.findByText(translations.fr.navigation.noNotifications);
		expect(screen.queryByRole('button', { name: translations.fr.navigation.markAllRead })).toBeNull();
		expect(screen.getByTestId('notifications-list')).toBeOnTheScreen();
		expect(screen.queryByTestId('notifications-sheet')).toBeNull();
		expect(adapter.mock.calls.some(([config]) => config.method === 'post')).toBe(false);
	});

	it.each(['undetermined', 'granted', 'denied'] as const)(
		'checks OS permission on authenticated mount and prompts only when %s needs it',
		async (status) => {
			const platform = jest.replaceProperty(Platform, 'OS', 'ios');
			jest.mocked(getPermissionsAsync).mockResolvedValue({ status } as never);
			try {
				const element = (
					<Provider store={store}>
						<NotificationStatus />
					</Provider>
				);
				const rendered = await render(element);
				await waitFor(() => expect(getPermissionsAsync).toHaveBeenCalledTimes(1));
				await act(async () => {});
				expect(requestPermissionsAsync).toHaveBeenCalledTimes(status === 'undetermined' ? 1 : 0);
				await rendered.rerender(element);
				await act(async () => {});
				expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
				expect(requestPermissionsAsync).toHaveBeenCalledTimes(status === 'undetermined' ? 1 : 0);
				expect(setNotificationChannelAsync).not.toHaveBeenCalled();
			} finally {
				platform.restore();
			}
		},
	);

	it('creates the Android channel before checking and requesting notification permission', async () => {
		const platform = jest.replaceProperty(Platform, 'OS', 'android');
		jest.mocked(getPermissionsAsync).mockResolvedValue({ status: 'undetermined' } as never);
		let finishChannel!: () => void;
		jest.mocked(setNotificationChannelAsync).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finishChannel = () => resolve(null);
				}),
		);
		try {
			await render(
				<Provider store={store}>
					<NotificationStatus />
				</Provider>,
			);
			expect(setNotificationChannelAsync).toHaveBeenCalledWith('facturation', {
				name: 'E.B.H Facturation',
				importance: 3,
			});
			expect(getPermissionsAsync).not.toHaveBeenCalled();
			await act(async () => finishChannel());
			await waitFor(() => expect(requestPermissionsAsync).toHaveBeenCalledTimes(1));
			expect(getPermissionsAsync).toHaveBeenCalledTimes(1);
		} finally {
			platform.restore();
		}
	});

	it('reports notification permission setup failure through the error toast', async () => {
		const platform = jest.replaceProperty(Platform, 'OS', 'ios');
		jest.mocked(getPermissionsAsync).mockRejectedValueOnce(new Error('Permission unavailable'));
		try {
			await render(
				<Provider store={store}>
					<NotificationStatus />
				</Provider>,
			);
			await waitFor(() => expect(onError).toHaveBeenCalledWith(translations.fr.settings.notificationUpdateError));
		} finally {
			platform.restore();
		}
	});

	it('loads on demand, appends older notifications, and refreshes the first page when reopened', async () => {
		await open();
		expect(screen.queryByRole('button', { name: 'Page précédente' })).toBeNull();
		expect(screen.queryByRole('button', { name: translations.fr.navigation.loadMore })).toBeNull();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText('Invoice reminder');
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: translations.fr.navigation.loadMore })).toBeNull();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
		).toEqual([1, 2]);
		await screen.rerender(
			<Provider store={store}>
				<NotificationStatus />
				<NotificationsPage key="reopened" />
			</Provider>,
		);
		await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/' && config.params.page === 1),
		).toHaveLength(2);
		expect(adapter.mock.calls.some(([config]) => config.url === '/notifications/' && config.params.page === 2)).toBe(
			true,
		);
	});

	it('refreshes back to the newest server page when pulled down', async () => {
		await open();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText('Invoice reminder');
		let finish!: () => void;
		adapter.mockImplementationOnce(
			(config) =>
				new Promise((resolve) => {
					finish = () => resolve(response(config, { count: 2, next: '?page=2', previous: null, results: [items[0]] }));
				}),
		);
		await fireEvent(screen.getByTestId('notifications-list'), 'refresh');
		expect(screen.getByTestId('notifications-list')).toHaveProp('refreshing', true);
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.getByText('Invoice reminder')).toBeOnTheScreen();
		expect(screen.queryByText(translations.fr.common.loading)).toBeNull();
		await act(async () => finish());
		await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
		).toEqual([1, 2, 1]);
	});

	it('marks one notification before navigating to an implemented mobile destination', async () => {
		await open();
		await fireEvent.press(screen.getByText('Company changed'));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith(COMPANIES_VIEW(7)));
		const request = adapter.mock.calls.find(([config]) => config.method === 'post')![0];
		expect(JSON.parse(request.data)).toEqual({ ids: [1] });
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(1));
	});

	it.each(['Company changed', 'Invoice reminder'])(
		'retains all loaded notifications without refetching when %s is marked read',
		async (title) => {
			await open();
			await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
			await screen.findByText('Invoice reminder');
			const list = screen.getByTestId('notifications-list');
			await fireEvent.press(screen.getByText(title));
			await waitFor(() => expect(store.getState().notification.unreadCount).toBe(1));
			await act(async () => {
				await Promise.all(store.dispatch(notificationApi.util.getRunningQueriesThunk()).map((query) => query.unwrap()));
			});
			await waitFor(() => expect(screen.getByTestId('notifications-list')).toHaveProp('refreshing', false));
			expect(screen.getByTestId('notifications-list')).toBe(list);
			expect(screen.getByText('Company changed')).toBeOnTheScreen();
			expect(screen.getByText('Invoice reminder')).toBeOnTheScreen();
			expect(screen.getByTestId('notifications-list')).toHaveProp('refreshing', false);
			expect(
				adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
			).toEqual([1, 2]);
			await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
			expect(adapter.mock.calls.filter(([config]) => config.url === '/notifications/')).toHaveLength(2);
		},
	);

	it('marks unsupported destinations read without inventing a route, and marks all using an empty body', async () => {
		await open();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText('Invoice reminder');
		await fireEvent.press(screen.getByText('Invoice reminder'));
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(1));
		expect(router.push).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(screen.getByRole('button', { name: translations.fr.navigation.markAllRead })).toBeEnabled(),
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.markAllRead }));
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(0));
		const requests = adapter.mock.calls.filter(([config]) => config.method === 'post');
		expect(JSON.parse(requests[0][0].data)).toEqual({ ids: [2] });
		expect(JSON.parse(requests[1][0].data)).toEqual({});
		expect(screen.queryByRole('button', { name: translations.fr.navigation.markAllRead })).toBeNull();
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.getByText('Invoice reminder')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
		).toEqual([1, 2]);
	});

	it('keeps the inbox and unread state on failed acknowledgement instead of navigating', async () => {
		await open();
		failMark = true;
		await fireEvent.press(screen.getByText('Company changed'));
		await waitFor(() => expect(onError).toHaveBeenCalledWith(translations.fr.common.genericError));
		expect(screen.getByRole('alert')).toHaveTextContent(translations.fr.common.genericError);
		expect(router.push).not.toHaveBeenCalled();
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(store.getState().notification.unreadCount).toBe(2);
		failMark = false;
		await fireEvent.press(screen.getByText('Company changed'));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith(COMPANIES_VIEW(7)));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('shows a mark-all failure inside the inbox and clears the error after a successful retry', async () => {
		await open();
		failMark = true;
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.markAllRead }));
		await screen.findByText(translations.fr.common.genericError);
		expect(screen.getByRole('alert')).toBeOnTheScreen();
		expect(store.getState().notification.unreadCount).toBe(2);
		expect(router.push).not.toHaveBeenCalled();
		failMark = false;
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.markAllRead }));
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(0));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.queryByRole('button', { name: translations.fr.navigation.markAllRead })).toBeNull();
	});

	it('retains visible notifications after a load-more error and retries the same next page', async () => {
		await open();
		adapter.mockImplementationOnce(async (config) => {
			throw new AxiosError('Offline', 'ERR_NETWORK', config);
		});
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText(translations.fr.errors.networkError);
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		expect(adapter.mock.calls.filter(([config]) => config.url === '/notifications/')).toHaveLength(2);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		await screen.findByText('Invoice reminder');
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
		).toEqual([1, 2, 2]);
	});

	it('preserves the appended list when pull-to-refresh fails, then retries page one', async () => {
		await open();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText('Invoice reminder');
		adapter.mockImplementationOnce(async (config) => {
			throw new AxiosError('Offline', 'ERR_NETWORK', config);
		});
		await fireEvent(screen.getByTestId('notifications-list'), 'refresh');
		await screen.findByText(translations.fr.errors.networkError);
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.getByText('Invoice reminder')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
	});

	it('ignores an old append response after closing and refreshing the inbox', async () => {
		await open();
		let finish!: () => void;
		adapter.mockImplementationOnce(
			(config) =>
				new Promise((resolve) => {
					finish = () => resolve(response(config, { count: 2, next: null, previous: '?page=1', results: [items[1]] }));
				}),
		);
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		expect(screen.getByLabelText(translations.fr.common.loading)).toBeOnTheScreen();
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await waitFor(() =>
			expect(
				adapter.mock.calls.filter(([config]) => config.url === '/notifications/' && config.params.page === 2),
			).toHaveLength(1),
		);
		await screen.rerender(
			<Provider store={store}>
				<NotificationStatus />
				<NotificationsPage key="reopened" />
			</Provider>,
		);
		await waitFor(() =>
			expect(
				adapter.mock.calls.filter(([config]) => config.url === '/notifications/' && config.params.page === 1),
			).toHaveLength(2),
		);
		await act(async () => finish());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.queryByText('Invoice reminder')).toBeNull();
	});

	it('keeps a single notification per ID when server page boundaries overlap', async () => {
		await open();
		adapter.mockImplementationOnce(async (config) =>
			response(config, { count: 2, next: null, previous: '?page=1', results: [items[0], items[1]] }),
		);
		await fireEvent(screen.getByTestId('notifications-list'), 'endReached');
		await screen.findByText('Invoice reminder');
		expect(screen.getAllByText('Company changed')).toHaveLength(1);
	});
});
