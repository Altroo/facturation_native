import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import notification from '@/store/slices/notificationSlice';
import { notificationApi } from '@/store/services/notification';
import { auth } from '@/auth';
import type { NotificationType } from '@/types/facturationTypes';
import { useToast } from '@/utils/hooks';
import { openURL } from 'expo-linking';
import { getPermissionsAsync, requestPermissionsAsync, setNotificationChannelAsync } from 'expo-notifications';
import {
	COMPANIES_VIEW,
	COMPANIES_EDIT,
	USERS_VIEW,
	USERS_EDIT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_PASSWORD,
	DASHBOARD,
	COMPANIES_LIST,
	COMPANIES_ADD,
	USERS_LIST,
	USERS_ADD,
	DASHBOARD_NOTIFICATIONS,
	BACKEND_SITE_ADMIN,
} from '@/utils/routes';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { Platform } from 'react-native';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import {
	NavigationDrawer,
	Notifications,
	getNotificationDestination,
} from '@/components/layouts/navigationBar/navigationBar';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { translations } from '@/translations';

jest.mock('expo-router', () => ({
	usePathname: jest.fn(() => '/'),
	useGlobalSearchParams: jest.fn(() => ({})),
	router: { navigate: jest.fn(), push: jest.fn() },
}));
jest.mock('expo-router/drawer', () => ({
	DrawerContentScrollView: jest.requireActual<typeof import('react-native')>('react-native').ScrollView,
}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-linking', () => ({ openURL: jest.fn().mockResolvedValue(true) }));
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
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useToast: jest.fn(),
}));
const closeDrawer = jest.fn();
const onDrawerError = jest.fn();
const setup = async (staff = false, gender = '') => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(
		setProfil({
			id: 1,
			email: 'test@example.invalid',
			first_name: 'Test',
			last_name: 'User',
			is_staff: staff,
			gender,
			avatar: null,
			avatar_cropped: null,
			is_active: true,
			default_password_set: false,
			date_joined: null,
			date_updated: null,
			last_login: null,
		}),
	);
	store.dispatch(setUserCompanies([]));
	store.dispatch(setAuthenticated());
	await render(
		<Provider store={store}>
			<NavigationDrawer {...({ navigation: { closeDrawer } } as unknown as DrawerContentComponentProps)} />
		</Provider>,
	);
	return store;
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useToast).mockReturnValue({ onError: onDrawerError, onSuccess: jest.fn() } as never);
	jest.mocked(getPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
	jest.mocked(requestPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
	jest.mocked(usePathname).mockReturnValue('/');
	jest.mocked(useGlobalSearchParams).mockReturnValue({});
});
describe('NavigationBar additional behaviors', () => {
	it.each([
		['Homme', translations.fr.navigation.welcomeMale],
		['Femme', translations.fr.navigation.welcomeFemale],
		['', translations.fr.navigation.welcomeNeutral],
	])('shows correct greeting for gender %s', async (gender, greeting) => {
		await setup(false, gender);
		expect(screen.getByText(greeting)).toBeOnTheScreen();
	});
	it('expands default panel based on pathname (dashboard) and shows its item', async () => {
		await setup();
		expect(screen.getByText(translations.fr.navigation.viewDashboard)).toBeOnTheScreen();
	});
	it('clicking another section expands it (Articles) and its items become visible', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.articles }));
		expect(screen.getByText(translations.fr.navigation.articlesList)).toBeOnTheScreen();
	});
	it('keeps the logistics menu aligned with web without an extra Gantt destination', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.logistique }));
		for (const name of [
			translations.fr.navigation.logistiqueDashboard,
			translations.fr.navigation.logistiqueList,
			translations.fr.navigation.logistiqueSuppliers,
		]) {
			expect(screen.getByRole('button', { name })).toBeDisabled();
		}
		expect(screen.queryByText(/gantt/i)).toBeNull();
	});
	it('finds exact match for pathname and expands correct panel', async () => {
		jest.mocked(usePathname).mockReturnValue('/companies');
		await setup(true);
		expect(screen.getByText(translations.fr.navigation.companiesList)).toBeOnTheScreen();
	});
	it.each(['/companies/123', '/companies/different/path'])('handles partial path matching at %s', async (pathname) => {
		jest.mocked(usePathname).mockReturnValue(pathname);
		await setup(true);
		expect(screen.getByText(translations.fr.navigation.companiesList)).toBeOnTheScreen();
	});
	it('handles pathname with no matching menu item', async () => {
		jest.mocked(usePathname).mockReturnValue('/some/random/path');
		await setup();
		expect(screen.getByText('Test User')).toBeOnTheScreen();
		expect(screen.queryByText(translations.fr.navigation.viewDashboard)).toBeNull();
	});
});
it.each([
	['/users/form', translations.fr.navigation.newUser],
	['/companies/form', translations.fr.navigation.newCompany],
] as const)('opens a blank create form from an edit route at %s', async (pathname, label) => {
	jest.mocked(usePathname).mockReturnValue(pathname);
	jest.mocked(useGlobalSearchParams).mockReturnValue({ id: '7' });
	await setup(true);
	const button = screen.getByRole('button', { name: label });
	expect(button).not.toBeSelected();
	await fireEvent.press(button);
	expect(router.push).toHaveBeenCalledWith(pathname);
	expect(closeDrawer).toHaveBeenCalledTimes(1);
});
it.each([
	['/users/form', translations.fr.navigation.newUser],
	['/companies/form', translations.fr.navigation.newCompany],
] as const)('selects the create drawer entry only when %s has no edit ID', async (pathname, label) => {
	jest.mocked(usePathname).mockReturnValue(pathname);
	await setup(true);
	expect(screen.getByRole('button', { name: label })).toBeSelected();
});
it('navigates to the implemented destination and leaves placeholders disabled', async () => {
	await setup();
	expect(screen.getByRole('button', { name: translations.fr.navigation.viewDashboard })).toBeSelected();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.viewDashboard }));
	expect(closeDrawer).toHaveBeenCalledTimes(1);
	expect(router.navigate).toHaveBeenCalledWith('/');
	await fireEvent.press(screen.getByText(translations.fr.navigation.clients));
	const archived = screen.getByRole('button', { name: translations.fr.navigation.clientsArchived });
	expect(archived).toBeDisabled();
	await fireEvent.press(archived);
	expect(router.navigate).toHaveBeenCalledTimes(1);
});
it('hides staff-only sections for regular users and requests logout', async () => {
	const store = await setup();
	expect(screen.queryByText(translations.fr.navigation.companies)).toBeNull();
	expect(screen.queryByText(translations.fr.navigation.users)).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.navigation.administration })).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.logout }));
	expect(store.getState()._init.status).toBe('signingOut');
});
it('shows staff sections and allows changing the expanded navigation group', async () => {
	await setup(true);
	expect(screen.getByText(translations.fr.navigation.companies)).toBeOnTheScreen();
	expect(screen.getByText(translations.fr.navigation.users)).toBeOnTheScreen();
	await fireEvent.press(screen.getByText(translations.fr.navigation.users));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.usersList }));
	expect(router.navigate).toHaveBeenCalledWith('/users');
	await fireEvent.press(screen.getByText(translations.fr.navigation.dashboard));
	expect(screen.queryByText(translations.fr.navigation.clientsList)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.viewDashboard }));
	expect(router.navigate).toHaveBeenCalledWith('/');
});

it('keeps the compact account header and logout without invented brand or footer text', async () => {
	await setup(true);
	expect(screen.getByText('Test User')).toBeOnTheScreen();
	expect(screen.getByText(translations.fr.navigation.welcomeNeutral)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.navigation.myProfile })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.navigation.logout })).toBeOnTheScreen();
	expect(screen.queryByText('Facturation')).toBeNull();
	expect(screen.container.queryAll((node) => node.type === 'Image')).toHaveLength(0);
	expect(screen.queryByText(/^v\d/)).toBeNull();
	expect(screen.getByRole('button', { name: translations.fr.navigation.administration })).toBeOnTheScreen();
	expect(screen.queryByText('À venir')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.myProfile }));
	expect(router.navigate).toHaveBeenCalledWith('/settings/edit-profile');
	expect(closeDrawer).toHaveBeenCalledTimes(1);
});

it('opens the configured Django administration outside the app for staff', async () => {
	await setup(true);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.administration }));
	await waitFor(() => expect(openURL).toHaveBeenCalledWith(BACKEND_SITE_ADMIN));
	expect(closeDrawer).toHaveBeenCalledTimes(1);
	expect(router.navigate).not.toHaveBeenCalled();
});

it('reports an administration link failure through the error toast', async () => {
	jest.mocked(openURL).mockRejectedValueOnce(new Error('Browser unavailable'));
	await setup(true);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.administration }));
	await waitFor(() => expect(onDrawerError).toHaveBeenCalledWith(translations.fr.common.genericError));
});

describe('notification popup', () => {
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
				<Notifications />
			</Provider>,
		);
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(2));
		expect(adapter.mock.calls.every(([config]) => config.url === '/notifications/unread-count/')).toBe(true);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.notifications }));
		await screen.findByText('Company changed');
	};
	it.each(['undetermined', 'granted', 'denied'] as const)(
		'checks OS permission on authenticated mount and prompts only when %s needs it',
		async (status) => {
			const platform = jest.replaceProperty(Platform, 'OS', 'ios');
			jest.mocked(getPermissionsAsync).mockResolvedValue({ status } as never);
			try {
				const element = (
					<Provider store={store}>
						<Notifications />
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
					<Notifications />
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
					<Notifications />
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
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await screen.findByText('Invoice reminder');
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: translations.fr.navigation.loadMore })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.notifications }));
		await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/' && config.params.page === 1),
		).toHaveLength(2);
		expect(adapter.mock.calls.some(([config]) => config.url === '/notifications/' && config.params.page === 2)).toBe(
			true,
		);
	});
	it('marks one notification before navigating to an implemented mobile destination', async () => {
		await open();
		await fireEvent.press(screen.getByText('Company changed'));
		await waitFor(() => expect(router.push).toHaveBeenCalledWith(COMPANIES_VIEW(7)));
		const request = adapter.mock.calls.find(([config]) => config.method === 'post')![0];
		expect(JSON.parse(request.data)).toEqual({ ids: [1] });
		await waitFor(() => expect(store.getState().notification.unreadCount).toBe(1));
	});
	it.each(['dismiss', 'requestClose', 'backdrop'])(
		'closes through %s and restarts at the first page when reopened',
		async (method) => {
			await open();
			await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
			await screen.findByText('Invoice reminder');
			if (method === 'backdrop')
				await fireEvent.press(screen.getByTestId('notifications-backdrop', { includeHiddenElements: true }));
			else await fireEvent(screen.getByTestId('notifications-sheet'), method);
			expect(screen.queryByText('Invoice reminder')).toBeNull();
			await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.notifications }));
			await screen.findByText('Company changed');
			await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
			expect(router.push).not.toHaveBeenCalled();
		},
	);
	it('marks unsupported destinations read without inventing a route, and marks all using an empty body', async () => {
		await open();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
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
		expect(screen.getByRole('button', { name: translations.fr.navigation.markAllRead })).toBeDisabled();
	});
	it('keeps the popup and unread state on failed acknowledgement instead of navigating', async () => {
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

	it('shows a mark-all failure inside the popup and clears the error after a successful retry', async () => {
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
		expect(screen.getByRole('button', { name: translations.fr.navigation.markAllRead })).toBeDisabled();
	});

	it('retains visible notifications after a load-more error and retries the same next page', async () => {
		await open();
		adapter.mockImplementationOnce(async (config) => {
			throw new AxiosError('Offline', 'ERR_NETWORK', config);
		});
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await screen.findByText(translations.fr.errors.networkError);
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		await screen.findByText('Invoice reminder');
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(
			adapter.mock.calls.filter(([config]) => config.url === '/notifications/').map(([config]) => config.params.page),
		).toEqual([1, 2, 2]);
	});

	it('preserves the appended list when a refresh on reopen fails, then retries page one', async () => {
		await open();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await screen.findByText('Invoice reminder');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		adapter.mockImplementationOnce(async (config) => {
			throw new AxiosError('Offline', 'ERR_NETWORK', config);
		});
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.notifications }));
		await screen.findByText(translations.fr.errors.networkError);
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
		expect(screen.getByText('Invoice reminder')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		await waitFor(() => expect(screen.queryByText('Invoice reminder')).toBeNull());
		expect(screen.getByText('Company changed')).toBeOnTheScreen();
	});

	it('ignores an old append response after closing and refreshing the popup', async () => {
		await open();
		let finish!: () => void;
		adapter.mockImplementationOnce(
			(config) =>
				new Promise((resolve) => {
					finish = () => resolve(response(config, { count: 2, next: null, previous: '?page=1', results: [items[1]] }));
				}),
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await waitFor(() =>
			expect(
				adapter.mock.calls.filter(([config]) => config.url === '/notifications/' && config.params.page === 2),
			).toHaveLength(1),
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.notifications }));
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
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.loadMore }));
		await screen.findByText('Invoice reminder');
		expect(screen.getAllByText('Company changed')).toHaveLength(1);
	});
});
it.each([
	['/dashboard', DASHBOARD],
	['/dashboard/?source=notification', DASHBOARD],
	['/dashboard/companies', COMPANIES_LIST],
	['/dashboard/companies/new', COMPANIES_ADD],
	['/dashboard/users', USERS_LIST],
	['/dashboard/users/new', USERS_ADD],
	['/dashboard/companies/7', COMPANIES_VIEW(7)],
	['/dashboard/companies/7/edit?company_id=2', COMPANIES_EDIT(7)],
	['/dashboard/users/8/', USERS_VIEW(8)],
	['/dashboard/users/8/edit', USERS_EDIT(8)],
	['/dashboard/settings/edit-profile', DASHBOARD_EDIT_PROFILE],
	['/dashboard/settings/password', DASHBOARD_PASSWORD],
	['/dashboard/settings/notifications', DASHBOARD_NOTIFICATIONS],
])('maps the implemented original destination %s', (target, expected) => {
	expect(getNotificationDestination(target as string)).toEqual(expected);
});
it.each([
	undefined,
	'',
	'https://example.invalid/dashboard/users/1',
	'//example.invalid/dashboard/users/1',
	'/dashboard/clients/4',
	'/dashboard/stock',
	'/dashboard/users/0',
	'/dashboard/users/01',
	'/dashboard/users/1.5',
	'/dashboard/users/9007199254740993',
	'/dashboard/users/4/delete',
])('does not invent a destination for %s', (target) => {
	expect(getNotificationDestination(target)).toBeNull();
});

it('opens the current section after deep navigation and only selects the exact destination', async () => {
	jest.mocked(usePathname).mockReturnValue('/users/form');
	await setup(true);
	expect(screen.getByRole('button', { name: translations.fr.navigation.newUser })).toBeSelected();
	expect(screen.getByRole('button', { name: translations.fr.navigation.usersList })).not.toBeSelected();
	await fireEvent.press(screen.getByText(translations.fr.navigation.users));
	expect(screen.queryByRole('button', { name: translations.fr.navigation.newUser })).toBeNull();
});
