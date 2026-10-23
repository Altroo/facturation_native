import { isHiddenFromAccessibility } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import _initReducer, { setAuthenticated, initToken } from '@/store/slices/_initSlice';
import accountReducer, { setProfil, setGroupes } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import notification from '@/store/slices/notificationSlice';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import SettingsPage from '@/app/(app)/(drawer)/settings';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { RootNavigator } from '@/app/_layout';
import UsersFormPage from '@/app/(app)/(drawer)/users/form';
import CompaniesFormPage from '@/app/(app)/(drawer)/companies/form';
import AuthenticatedLayout from '@/app/(app)/_layout';
import DrawerStackLayout, { unstable_settings as drawerSettings } from '@/app/(app)/(drawer)/_layout';

import {
	useGetUserQuery,
	useGetUsersListQuery,
	useAddUserMutation,
	useEditUserMutation,
	useCheckEmailMutation,
} from '@/store/services/account';
import {
	companyApi,
	useGetCompanyQuery,
	useGetCompaniesListQuery,
	useAddCompanyMutation,
	useEditCompanyMutation,
} from '@/store/services/company';
import {
	CLIENTS_ADD,
	CLIENTS_EDIT,
	CLIENTS_VIEW,
	COMPANIES_ADD,
	COMPANIES_EDIT,
	USERS_ADD,
	USERS_EDIT,
} from '@/utils/routes';
import type { CompanyClass, UserClass } from '@/models/classes';
import type { UserWithCompaniesResponseType } from '@/types/usersTypes';
import { translations } from '@/translations';
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-access' }));

jest.mock('@/styles/globals.css', () => ({}));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock('react-native-drawer-layout', () => ({
	Drawer: ({
		children,
		open,
		renderDrawerContent,
	}: {
		children: ReactNode;
		open: boolean;
		renderDrawerContent: () => ReactNode;
	}) => (
		<>
			{children}
			{open && renderDrawerContent()}
		</>
	),
	useDrawerProgress: () => ({ value: 0 }),
}));
jest.mock('@/components/layouts/navigationBar/navigationBar', () => ({
	...jest.requireActual('@/components/layouts/navigationBar/navigationBar'),
	NotificationStatus: () => null,
}));

jest.mock('@/components/shared/themeToggle/themeToggle', () => () => null);
jest.mock('@/components/shared/languageSwitcher/languageSwitcher', () => () => null);
jest.mock('@/components/shared/appUpdate/appUpdate', () => () => null);
jest.mock('@/components/nativeElements/customSquareImageUploading/customSquareImageUploading', () => () => null);
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: jest.fn(), onError: jest.fn() }),
}));
jest.mock('@/store/services/account', () => ({
	...jest.requireActual<typeof import('@/store/services/account')>('@/store/services/account'),
	useGetUserQuery: jest.fn(),
	useGetUsersListQuery: jest.fn(),
	useAddUserMutation: jest.fn(),
	useEditUserMutation: jest.fn(),
	useCheckEmailMutation: jest.fn(),
}));
jest.mock('@/store/services/company', () => ({
	...jest.requireActual<typeof import('@/store/services/company')>('@/store/services/company'),
	useGetCompanyQuery: jest.fn(),
	useGetCompaniesListQuery: jest.fn(),
	useAddCompanyMutation: jest.fn(),
	useEditCompanyMutation: jest.fn(),
}));

const t = translations.fr;
const profile: UserClass = {
	id: 1,
	first_name: 'Staff',
	last_name: 'User',
	email: 'staff@example.invalid',
	gender: 'Homme',
	avatar: null,
	avatar_cropped: null,
	is_staff: true,
	is_active: true,
	default_password_set: false,
	date_joined: null,
	date_updated: null,
	last_login: null,
};
const user = (id: number): UserWithCompaniesResponseType => ({
	...profile,
	id,
	first_name: 'User ' + id,
	email: 'user' + id + '@example.invalid',
	companies: [],
});
const company = (id: number): CompanyClass => ({
	id,
	date_created: null,
	date_updated: null,
	raison_sociale: 'Company ' + id,
	email: null,
	logo: null,
	logo_cropped: null,
	cachet: null,
	cachet_cropped: null,
	nbr_employe: '1 à 5',
	civilite_responsable: '',
	nom_responsable: null,
	gsm_responsable: null,
	adresse: null,
	telephone: null,
	fax: null,
	site_web: null,
	numero_du_compte: null,
	ICE: '123456789012345',
	registre_de_commerce: null,
	identifiant_fiscal: null,
	tax_professionnelle: null,
	CNSS: null,
	managed_by: [],
	admins: [],
	uses_foreign_currency: false,
	stock_management_enabled: false,
	inventory_management_enabled: false,
});
const addUser = jest.fn();
const addCompany = jest.fn();
const memberships = [{ id: 4, raison_sociale: 'Company Four', role: 'Caissier', uses_foreign_currency: false }];

const nativeHeaders = (title: string) => screen.queryAllByRole('header', { name: title });
const nativeHeader = (title: string) => {
	const headers = nativeHeaders(title);
	expect(headers).toHaveLength(1);
	return headers[0]!;
};

const pressNavbarBack = async () => {
	const active = screen.container
		.queryAll((node) => node.type === 'RNSScreen' && !isHiddenFromAccessibility(node))
		.at(-1)!;
	await fireEvent(active, 'headerBackButtonClicked');
};
const pressNavbarClose = async () => {
	const header = screen.container
		.queryAll(
			(node) =>
				node.type === 'RNSScreenStackHeaderConfig' &&
				!isHiddenFromAccessibility(node) &&
				node.props.headerLeftBarButtonItems?.some((item: { title?: string }) => item.title === t.common.close),
		)
		.at(-1)!;
	const close = header.props.headerLeftBarButtonItems.find((item: { title?: string }) => item.title === t.common.close);
	await act(() => close.onPress());
};

const setup = async (initialUrl: string, access: 'staff' | 'guest' | 'nonstaff' = 'staff') => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer, notification },
	});
	if (access === 'guest') store.dispatch(initToken());
	else {
		store.dispatch(setProfil({ ...profile, is_staff: access === 'staff' }));
		store.dispatch(setUserCompanies(memberships));
		store.dispatch(setAuthenticated());
	}
	store.dispatch(setGroupes({ group_titles: ['Caissier', 'Commercial', 'Lecture'] }));
	return renderRouter(
		{
			_layout: () => (
				<Provider store={store}>
					<RootNavigator />
				</Provider>
			),
			login: () => <Text>Guest login</Text>,
			'reset-password/index': () => <Text>Recovery</Text>,
			'(app)/_layout': AuthenticatedLayout,
			'(app)/(drawer)/_layout': { default: DrawerStackLayout, unstable_settings: drawerSettings },
			'(app)/(drawer)/index': () => <Text>Dashboard</Text>,
			'(app)/(drawer)/clients/index': () => <Text>Clients list</Text>,
			'(app)/(drawer)/clients/archived': () => <Text>Archived clients</Text>,
			'(app)/(drawer)/clients/form': () => <Text>Client form</Text>,
			'(app)/(drawer)/clients/[id]/index': () => <Text>Client details</Text>,
			'(app)/(drawer)/future-module/index': () => <Text>Future page</Text>,
			'(app)/(drawer)/users/index': () => <Text>Users list</Text>,
			'(app)/(drawer)/users/[id]/index': () => <Text>User details</Text>,
			'(app)/(drawer)/users/form': UsersFormPage,
			'(app)/(drawer)/companies/index': () => <Text>Companies list</Text>,
			'(app)/(drawer)/companies/[id]/index': () => <Text>Company details</Text>,
			'(app)/(drawer)/companies/form': CompaniesFormPage,
			'(app)/(drawer)/notifications/index': () => <BottomNavigation activePage="notifications" />,
			'(app)/(drawer)/settings/index': SettingsPage,
			'(app)/(drawer)/settings/edit-profile': () => <Text>Profile content</Text>,
			'(app)/(drawer)/settings/password': () => <Text>Password content</Text>,
			'(app)/(drawer)/settings/notifications': () => <Text>Notification preferences content</Text>,
		},
		{ initialUrl },
	);
};

beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useGetUserQuery).mockImplementation(((arg, options) => ({
		currentData: options?.skip || typeof arg !== 'object' ? undefined : user(arg.id),
		refetch: jest.fn(),
	})) as typeof useGetUserQuery);
	jest.mocked(useGetCompanyQuery).mockImplementation(((arg, options) => ({
		currentData: options?.skip || typeof arg !== 'object' ? undefined : company(arg.id),
		refetch: jest.fn(),
	})) as typeof useGetCompanyQuery);
	jest.mocked(useGetUsersListQuery).mockReturnValue({ data: [], refetch: jest.fn() } as never);
	jest.mocked(useGetCompaniesListQuery).mockReturnValue({ data: [], refetch: jest.fn() } as never);
	jest.mocked(useAddUserMutation).mockReturnValue([addUser, {}] as never);
	jest.mocked(useAddCompanyMutation).mockReturnValue([addCompany, {}] as never);
	jest.mocked(useEditUserMutation).mockReturnValue([jest.fn(), {}] as never);
	jest.mocked(useEditCompanyMutation).mockReturnValue([jest.fn(), {}] as never);
	jest.mocked(useCheckEmailMutation).mockReturnValue([jest.fn(() => ({ unwrap: async () => undefined })), {}] as never);
	addUser.mockReturnValue({ unwrap: async () => undefined });
	addCompany.mockReturnValue({ unwrap: async () => company(9) });
	jest
		.spyOn(companyApi.endpoints.getUserCompanies, 'initiate')
		.mockImplementation((() => () => ({ unwrap: async () => memberships, unsubscribe: jest.fn() })) as never);
});

describe('settings header navigation', () => {
	it.each(['/users', '/companies/7', '/clients/form?company_id=5'])(
		'closes to the original %s page after repeatedly switching the two bottom destinations',
		async (origin) => {
			const result = await setup(origin);
			await act(() => router.push('/notifications'));
			for (let index = 0; index < 3; index += 1) {
				await fireEvent.press(screen.getByRole('button', { name: t.navigation.settings }));
				await waitFor(() => expect(result.getPathname()).toBe('/settings'));
				await fireEvent.press(screen.getByRole('button', { name: t.navigation.notifications }));
				await waitFor(() => expect(result.getPathname()).toBe('/notifications'));
			}
			await pressNavbarClose();
			await waitFor(() => expect(result.getPathname()).toBe(origin.split('?')[0]));
			if (origin.includes('company_id')) expect(result.getSearchParams()).toHaveProperty('company_id', '5');
		},
	);
	it.each([
		[t.navigation.myProfile, '/settings/edit-profile'],
		[t.navigation.changePassword, '/settings/password'],
		[t.navigation.notificationPreferences, '/settings/notifications'],
	])('returns from %s to Settings before closing to the original list', async (label, path) => {
		const result = await setup('/users');
		await act(() => router.push('/settings'));
		await fireEvent.press(screen.getByRole('button', { name: label }));
		await waitFor(() => expect(result.getPathname()).toBe(path));
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/settings'));
		await pressNavbarClose();
		await waitFor(() => expect(result.getPathname()).toBe('/users'));
	});
	it.each(['edit-profile', 'password', 'notifications'])(
		'returns to the dashboard from a cold %s screen',
		async (page) => {
			const result = await setup('/settings/' + page);
			expect(result.getPathname()).toBe('/settings/' + page);
			expect(router.canGoBack()).toBe(true);
			await pressNavbarBack();
			await waitFor(() => expect(result.getPathname()).toBe('/'));
			expect(screen.getByRole('button', { name: t.common.toggleDrawer })).toBeOnTheScreen();
		},
	);

	it.each(['password', 'notifications'])('retains native Back after navigating from profile to %s', async (page) => {
		const result = await setup('/settings/edit-profile');
		await act(async () => router.push(('/settings/' + page) as '/settings/password' | '/settings/notifications'));
		await waitFor(() => expect(result.getPathname()).toBe('/settings/' + page));
		expect(screen.queryByRole('button', { name: t.common.toggleDrawer })).toBeNull();
		expect(
			screen.container.queryAll(
				(node) => node.type === 'RNSScreenStackHeaderConfig' && node.props.hideBackButton === false,
			),
		).not.toHaveLength(0);
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/settings/edit-profile'));
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/'));
		expect(screen.getByRole('button', { name: t.common.toggleDrawer })).toBeOnTheScreen();
	});
});
afterEach(() => jest.restoreAllMocks());

describe('shared drawer and stack', () => {
	it('inherits a start-aligned title on a future route without per-page header configuration', async () => {
		const result = await setup('/future-module');
		expect(nativeHeader('future-module/index')).toHaveStyle({ textAlign: 'left' });
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/'));
	});
	it.each([
		['/', t.navigation.dashboard],
		['/clients', t.clients.listTitle],
		['/clients/archived', t.clients.archivedTitle],
		['/users', t.users.listTitle],
		['/companies', t.companies.listTitle],
	])('keeps a single menu header on %s', async (url, title) => {
		const result = await setup(url);
		expect(result.getPathname()).toBe(url);
		expect(nativeHeaders(title)).toHaveLength(1);
		expect(screen.getAllByRole('button', { name: t.common.toggleDrawer })).toHaveLength(1);
		await fireEvent.press(screen.getByRole('button', { name: t.common.toggleDrawer }));
		expect(await screen.findByRole('button', { name: t.navigation.logout })).toBeOnTheScreen();
	});

	it('opens Client archives through the drawer and returns from a form to those archives', async () => {
		const result = await setup('/');
		await fireEvent.press(screen.getByRole('button', { name: t.common.toggleDrawer }));
		await fireEvent.press(screen.getByRole('button', { name: t.navigation.clients }));
		await fireEvent.press(screen.getByRole('button', { name: t.navigation.clientsArchived }));
		await waitFor(() => expect(result.getPathname()).toBe('/clients/archived'));
		expect(screen.queryByRole('button', { name: t.navigation.logout })).toBeNull();
		await act(async () => router.push(CLIENTS_ADD));
		await screen.findByText('Client form');
		expect(nativeHeader(t.clients.addTitle)).toBeOnTheScreen();
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/clients/archived'));
	});

	it.each(['/', '/clients', '/companies/7', '/settings/edit-profile'])(
		'returns to %s after opening a Client form',
		async (url) => {
			const result = await setup(url);
			await act(async () => router.push(CLIENTS_ADD));
			await screen.findByText('Client form');
			await pressNavbarBack();
			await waitFor(() => expect(result.getPathname()).toBe(url));
		},
	);

	it('returns through Client edit, details, and list in their actual visit order', async () => {
		const result = await setup('/clients');
		await act(async () => router.push(CLIENTS_VIEW(7)));
		await screen.findByText('Client details');
		expect(nativeHeader(t.clients.detailsTitle)).toBeOnTheScreen();
		await act(async () => router.push(CLIENTS_EDIT(7)));
		await screen.findByText('Client form');
		expect(result.getSearchParams()).toHaveProperty('id', '7');
		expect(nativeHeader(t.clients.editTitle)).toBeOnTheScreen();
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/clients/7'));
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/clients'));
	});

	it('returns to the dashboard after revisiting Users through its Add menu entry', async () => {
		const result = await setup('/users');
		await act(async () => router.navigate('/'));
		await screen.findByText('Dashboard');
		await fireEvent.press(screen.getByRole('button', { name: t.common.toggleDrawer }));
		await fireEvent.press(screen.getByRole('button', { name: t.navigation.users }));
		await fireEvent.press(screen.getByRole('button', { name: t.navigation.newUser }));
		await screen.findByLabelText(t.users.fieldNom);
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/'));
	});
});

describe.each(['users', 'companies'] as const)('%s form route', (entity) => {
	const label = entity === 'users' ? t.users.fieldNom : t.companies.fieldRaisonSociale + ' *';
	const addRoute = entity === 'users' ? USERS_ADD : COMPANIES_ADD;
	const editRoute = entity === 'users' ? USERS_EDIT : COMPANIES_EDIT;
	const editTitle = entity === 'users' ? t.users.editTitle : t.companies.editTitle;
	const addTitle = entity === 'users' ? t.users.addTitle : t.companies.addTitle;
	const fieldValue = (id: number) => (entity === 'users' ? 'User ' : 'Company ') + id;

	it.each(['create', 'edit', 'details'] as const)(
		'keeps the native back icon visible on a cold %s screen',
		async (mode) => {
			const url = '/' + entity + (mode === 'create' ? '/form' : mode === 'edit' ? '/form?id=7' : '/7');
			const title =
				mode === 'create'
					? addTitle
					: mode === 'edit'
						? editTitle
						: entity === 'users'
							? t.users.detailsTitle
							: t.companies.detailsTitle;
			const result = await setup(url);
			await waitFor(() => expect(nativeHeaders(title)).toHaveLength(1));
			expect(
				screen.container.queryAll(
					(node) => node.type === 'RNSScreenStackHeaderConfig' && node.props.hideBackButton === false,
				),
			).not.toHaveLength(0);
			expect(nativeHeader(title)).toHaveStyle({ textAlign: 'left' });
			await pressNavbarBack();
			await waitFor(() => expect(result.getPathname()).toBe('/'));
			expect(screen.getByRole('button', { name: t.common.toggleDrawer })).toBeOnTheScreen();
		},
	);

	it('returns to the dashboard after opening create directly from its menu', async () => {
		const result = await setup('/');
		await fireEvent.press(screen.getByRole('button', { name: t.common.toggleDrawer }));
		await fireEvent.press(screen.getByRole('button', { name: t.navigation[entity] }));
		await fireEvent.press(
			screen.getByRole('button', { name: entity === 'users' ? t.navigation.newUser : t.navigation.newCompany }),
		);
		await screen.findByLabelText(label);
		expect(screen.queryByRole('button', { name: t.navigation.logout })).toBeNull();
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/'));
		expect(screen.getByText('Dashboard')).toBeOnTheScreen();
	});

	it('returns to the list when create was opened from that list', async () => {
		const result = await setup('/' + entity);
		await act(async () => router.push(addRoute));
		await screen.findByLabelText(label);
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/' + entity));
	});

	it('returns to the previous module instead of a fabricated list', async () => {
		const previous = entity === 'users' ? '/companies/7' : '/users/7';
		const result = await setup(previous);
		await act(async () => router.push(addRoute));
		await screen.findByLabelText(label);
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe(previous));
	});

	it('follows the previous activity after returning to a module that was already visited', async () => {
		const previous = entity === 'users' ? '/companies/7' : '/users/7';
		const result = await setup('/' + entity + '/7');
		await act(async () => router.push(previous));
		await waitFor(() => expect(result.getPathname()).toBe(previous));
		await act(async () => router.push(addRoute));
		await screen.findByLabelText(label);
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe(previous));
	});

	it('returns to the preceding edit screen after opening another create form', async () => {
		const result = await setup('/' + entity + '/form?id=7');
		await screen.findByLabelText(label);
		await act(async () => router.push(addRoute));
		await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('value', ''));
		await pressNavbarBack();
		await waitFor(() => expect(result.getSearchParams()).toHaveProperty('id', '7'));
		expect(screen.getByLabelText(label)).toHaveProp('value', fieldValue(7));
	});

	it('reads edit IDs from the actual router and discards drafts when the ID changes', async () => {
		await setup('/' + entity + '/form?id=7');
		expect(await screen.findByLabelText(label)).toHaveProp('value', fieldValue(7));
		await fireEvent.changeText(screen.getByLabelText(label), 'Unsaved seven');
		await act(async () => router.setParams({ id: '8' }));
		await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('value', fieldValue(8)));
		expect(screen.getAllByText(editTitle).length).toBeGreaterThan(0);
	});

	it('opens a fresh create form after editing, using the same route helper as the drawer', async () => {
		const result = await setup('/' + entity + '/form?id=7');
		await screen.findByLabelText(label);
		await fireEvent.changeText(screen.getByLabelText(label), 'Unsaved edit');
		await act(async () => router.push(addRoute));
		await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('value', ''));
		expect(result.getSearchParams()).not.toHaveProperty('id');
		expect(screen.getAllByText(addTitle).length).toBeGreaterThan(0);
		expect(screen.queryByText(editTitle)).toBeNull();
	});

	it('clears the edit mode and header when the current route ID is removed', async () => {
		await setup('/' + entity + '/form?id=7');
		await screen.findByLabelText(label);
		await act(async () => router.setParams({ id: undefined }));
		await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('value', ''));
		expect(screen.queryByText(editTitle)).toBeNull();
		expect(screen.getAllByText(addTitle).length).toBeGreaterThan(0);
	});

	it.each(['id=', 'id=0', 'id=7&id=8'])(
		'rejects malformed parameters %s without requesting a record',
		async (query) => {
			const result = await setup('/' + entity + '/form?' + query);
			expect(await screen.findByRole('alert')).toHaveTextContent(t.notFound.message);
			expect(screen.queryByLabelText(label)).toBeNull();
			const requests = entity === 'users' ? jest.mocked(useGetUserQuery) : jest.mocked(useGetCompanyQuery);
			expect(requests).not.toHaveBeenCalled();
			await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
			await waitFor(() => expect(result.getPathname()).toBe('/' + entity));
		},
	);

	it('protects the deep link from guests and nonstaff accounts', async () => {
		const result = await setup('/' + entity + '/form?id=7', 'guest');
		await screen.findByText('Guest login');
		expect(result.getPathname()).toBe('/login');
		expect(useGetUserQuery).not.toHaveBeenCalled();
		expect(useGetCompanyQuery).not.toHaveBeenCalled();
		await result.unmount();
		await setup('/' + entity + '/form?id=7', 'nonstaff');
		await screen.findByText(t.noPermission.description);
		expect(screen.queryByLabelText(label)).toBeNull();
		expect(jest.mocked(useGetUserQuery).mock.calls.every(([, options]) => options?.skip === true)).toBe(true);
		expect(jest.mocked(useGetCompanyQuery).mock.calls.every(([, options]) => options?.skip === true)).toBe(true);
	});

	it('retains Back to the dashboard when a cold link is denied', async () => {
		const result = await setup('/' + entity + '/form?id=7', 'nonstaff');
		await screen.findByText(t.noPermission.description);
		expect(nativeHeader(editTitle)).toBeOnTheScreen();
		expect(router.canGoBack()).toBe(true);
		// The native stack draws Back outside React; exercise its real router action.
		await pressNavbarBack();
		await waitFor(() => expect(result.getPathname()).toBe('/'));
		expect(screen.getByRole('button', { name: t.common.toggleDrawer })).toBeOnTheScreen();
		expect(jest.mocked(useGetUserQuery).mock.calls.every(([, options]) => options?.skip === true)).toBe(true);
		expect(jest.mocked(useGetCompanyQuery).mock.calls.every(([, options]) => options?.skip === true)).toBe(true);
	});

	it('submits a create and dismisses to the existing list, without returning to the edit record', async () => {
		const result = await setup('/' + entity);
		await act(async () => router.push(editRoute(7)));
		await screen.findByLabelText(label);
		await act(async () => router.push(addRoute));
		await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('value', ''));
		await fireEvent.changeText(screen.getByLabelText(label), 'New record');
		if (entity === 'users') {
			await fireEvent.changeText(screen.getByLabelText(t.users.fieldPrenom), 'Person');
			await fireEvent.changeText(screen.getByLabelText(t.users.fieldEmail), 'new@example.invalid');
			await fireEvent.press(screen.getByRole('button', { name: t.users.fieldSexe }));
			await fireEvent.press(screen.getByRole('radio', { name: 'Homme' }));
		} else {
			await fireEvent.changeText(screen.getByLabelText(t.companies.fieldICE + ' *'), '123456789012345');
			await fireEvent.press(screen.getByRole('button', { name: t.companies.fieldNbrEmploye + ' *' }));
			await fireEvent.press(screen.getByRole('radio', { name: '1 à 5' }));
		}
		await fireEvent.press(screen.getByRole('button', { name: addTitle, disabled: false }));
		await waitFor(() => expect(result.getPathname()).toBe('/' + entity));
		expect(entity === 'users' ? addUser : addCompany).toHaveBeenCalledTimes(1);
		expect(screen.queryByLabelText(label)).toBeNull();
		expect(JSON.stringify(result.getRouterState())).not.toContain('"name":"form"');
	});
});

it.each(['/users', '/companies', '/clients', '/clients/archived', '/clients/form', '/clients/7'])(
	'keeps the nested private route %s behind the root authentication guard',
	async (initialUrl) => {
		const result = await setup(initialUrl, 'guest');
		await screen.findByText('Guest login');
		expect(result.getPathname()).toBe('/login');
		expect(screen.queryByText('Clients list')).toBeNull();
		expect(screen.queryByText('Users list')).toBeNull();
		expect(screen.queryByText('Companies list')).toBeNull();
		expect(screen.queryByText('Client form')).toBeNull();
		expect(screen.queryByText('Client details')).toBeNull();
	},
);
