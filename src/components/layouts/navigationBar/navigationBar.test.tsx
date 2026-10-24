import { configureStore } from '@reduxjs/toolkit';
import { useToast } from '@/utils/hooks';
import { openURL } from 'expo-linking';
import { BACKEND_SITE_ADMIN, CLIENTS_LIST, CLIENTS_ARCHIVED, ARTICLES_LIST, ARTICLES_ARCHIVED } from '@/utils/routes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { NavigationDrawer } from '@/components/layouts/navigationBar/navigationBar';
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
jest.mock('@shopify/flash-list', () => ({
	FlashList: jest.requireActual<typeof import('react-native')>('react-native').FlatList,
}));
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
	for (const [name, path] of [
		[translations.fr.navigation.clientsList, CLIENTS_LIST],
		[translations.fr.navigation.clientsArchived, CLIENTS_ARCHIVED],
	]) {
		const entry = screen.getByRole('button', { name });
		expect(entry).toBeEnabled();
		await fireEvent.press(entry);
		expect(router.navigate).toHaveBeenLastCalledWith(path);
	}
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.articles }));
	for (const [name, path] of [
		[translations.fr.navigation.articlesList, ARTICLES_LIST],
		[translations.fr.navigation.articlesArchived, ARTICLES_ARCHIVED],
	]) {
		const entry = screen.getByRole('button', { name });
		expect(entry).toBeEnabled();
		await fireEvent.press(entry);
		expect(router.navigate).toHaveBeenLastCalledWith(path);
	}
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.devis }));
	expect(screen.getByRole('button', { name: translations.fr.navigation.devisList })).toBeEnabled();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.devisList }));
	expect(router.navigate).toHaveBeenLastCalledWith('/devis');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.facturesProforma }));
	expect(screen.getByRole('button', { name: translations.fr.navigation.facturesProformaList })).toBeEnabled();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.facturesProformaList }));
	expect(router.navigate).toHaveBeenLastCalledWith('/facture-pro-forma');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.facturesClient }));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.facturesClientList }));
	expect(router.navigate).toHaveBeenLastCalledWith('/facture-client');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.facturesImpayees }));
	expect(router.navigate).toHaveBeenLastCalledWith('/facture-client/unpaid');
	expect(router.navigate).toHaveBeenCalledTimes(9);
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

it('opens the current section after deep navigation and only selects the exact destination', async () => {
	jest.mocked(usePathname).mockReturnValue('/users/form');
	await setup(true);
	expect(screen.getByRole('button', { name: translations.fr.navigation.newUser })).toBeSelected();
	expect(screen.getByRole('button', { name: translations.fr.navigation.usersList })).not.toBeSelected();
	await fireEvent.press(screen.getByText(translations.fr.navigation.users));
	expect(screen.queryByRole('button', { name: translations.fr.navigation.newUser })).toBeNull();
});

it('keeps Settings out of the drawer now that the bottom navigation owns it', async () => {
	await setup(true);
	expect(screen.queryByRole('button', { name: translations.fr.navigation.settings })).toBeNull();
});
