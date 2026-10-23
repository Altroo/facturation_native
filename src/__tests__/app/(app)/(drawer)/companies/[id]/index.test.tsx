import { createQueryMock } from '@/store/setupQuery';
import account, { setProfil } from '@/store/slices/accountSlice';
import companies, { setUserCompanies } from '@/store/slices/companiesSlice';
import _init, { setAuthenticated } from '@/store/slices/_initSlice';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware, { type Task } from 'redux-saga';
import { Provider } from 'react-redux';
import { router } from 'expo-router';
import CompaniesView from '@/app/(app)/(drawer)/companies/[id]/index';
import { useGetCompanyQuery, useSuspendCompanyMutation, companyApi } from '@/store/services/company';

import { watchCompanies } from '@/store/sagas/companiesSaga';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => ({ id: '4' }),
	router: { dismissTo: jest.fn(), push: jest.fn() },
}));
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));

jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: jest.fn(function useGetCompanyQuery() {
		return mockCompanyQuery.useResult();
	}),
	useSuspendCompanyMutation: jest.fn(),
	companyApi: { endpoints: { getUserCompanies: { initiate: jest.fn() } } },
}));
const mockCompanyQuery = createQueryMock<ReturnType<typeof useGetCompanyQuery>>({} as never);
const creator = {
	id: 7,
	first_name: 'Test',
	last_name: 'Creator',
	email: 'creator@example.invalid',
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
const company = {
	id: 4,
	date_created: '2026-01-01',
	date_updated: null,
	raison_sociale: 'Example Company',
	email: 'company@example.invalid',
	logo: 'https://example.invalid/logo.jpg',
	logo_cropped: 'https://example.invalid/logo-crop.jpg',
	cachet: 'https://example.invalid/stamp.jpg',
	cachet_cropped: 'https://example.invalid/stamp-crop.jpg',
	nbr_employe: '1 à 5',
	civilite_responsable: 'Mme',
	nom_responsable: 'Manager',
	gsm_responsable: '0612345678',
	adresse: 'Company address',
	telephone: '0522123456',
	fax: '0522654321',
	site_web: 'https://example.invalid',
	numero_du_compte: 'ACCOUNT123',
	ICE: '123456789012345',
	registre_de_commerce: 'RC1',
	identifiant_fiscal: 'IF1',
	tax_professionnelle: 'TP1',
	CNSS: 'CNSS1',
	managed_by: [
		{ pk: 7, role: 'Caissier' },
		{ pk: 9, role: 'Commercial' },
	],
	admins: [
		{
			id: 7,
			first_name: 'Test',
			last_name: 'Creator',
			role: 'Caissier',
			can_validate_factures: true,
			can_change_document_status: true,
		},
		{
			id: 9,
			first_name: 'Other',
			last_name: 'Manager',
			role: 'Commercial',
			can_validate_factures: false,
			can_change_document_status: true,
		},
	],
	uses_foreign_currency: true,
	stock_management_enabled: true,
	inventory_management_enabled: true,
};

const remainingMembership = {
	id: 8,
	raison_sociale: 'Remaining Company',
	role: 'Caissier',
	uses_foreign_currency: false,
};
const memberships = [
	{ id: 4, raison_sociale: 'Example Company', role: 'Caissier', uses_foreign_currency: false },
	remainingMembership,
];
const suspend = jest.fn();
const sagaTasks: Task[] = [];
const setup = async (record = company) => {
	const middleware = createSagaMiddleware();
	const store = configureStore({
		reducer: { _init, account, companies },
		middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(middleware),
	});
	sagaTasks.push(middleware.run(watchCompanies));
	store.dispatch(setProfil(creator));
	store.dispatch(setUserCompanies(memberships));
	store.dispatch(setAuthenticated());
	await mockCompanyQuery.setResult({ currentData: record, refetch: jest.fn() } as never);
	jest.mocked(useSuspendCompanyMutation).mockReturnValue([suspend, { isLoading: false }] as never);
	await render(
		<Provider store={store}>
			<CompaniesView />
		</Provider>,
	);

	return store;
};
const openModal = async () =>
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
const confirm = async () =>
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
beforeEach(() => {
	jest.clearAllMocks();
	suspend.mockReturnValue({ unwrap: () => Promise.resolve() });
});
afterEach(() => {
	sagaTasks.splice(0).forEach((task) => task.cancel());
});
it('keeps managers in separate panels and uses their cropped or original photo', async () => {
	await setup({
		...company,
		admins: company.admins.map((manager, index) => ({
			...manager,
			avatar: `https://example.invalid/manager-${index}.png`,
			avatar_cropped: index === 0 ? 'https://example.invalid/manager-cropped.png' : null,
		})),
	});
	const panels = screen.getAllByTestId('managed-by-details');
	expect(panels).toHaveLength(2);
	expect(within(panels[0]).getByRole('button', { name: 'Test Creator' })).not.toBeDisabled();
	expect(within(panels[1]).getByRole('button', { name: 'Other Manager' })).not.toBeDisabled();
	const photos = screen.container.queryAll(
		(node) => node.type === 'Image' && ['Test Creator', 'Other Manager'].includes(node.props.accessibilityLabel),
	);
	expect(photos.map((photo) => photo.props.source.uri)).toEqual([
		'https://example.invalid/manager-cropped.png',
		'https://example.invalid/manager-1.png',
	]);
	expect(screen.queryByText(/^ID:/)).toBeNull();
});

it('shows original company fields and manager permissions and cancelling confirmation does not suspend anything', async () => {
	const store = await setup();
	expect(screen.queryByText(/^ID:/)).toBeNull();
	expect(screen.getByText(company.ICE)).toBeOnTheScreen();
	expect(screen.getByText(company.numero_du_compte)).toBeOnTheScreen();
	expect(screen.getByText('Test Creator')).toBeOnTheScreen();
	expect(screen.getAllByText(translations.fr.managedByTable.invoiceValidation)).toHaveLength(2);
	await openModal();
	expect(screen.getByText(translations.fr.companies.suspendModalTitle)).toBeOnTheScreen();
	expect(suspend).not.toHaveBeenCalled();
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.cancel }),
	);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(suspend).not.toHaveBeenCalled();
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(store.getState().companies.user_companies).toEqual(memberships);
});
it.each(['logo', 'cachet'] as const)(
	'opens the original %s from the cropped thumbnail and closes the preview',
	async (image) => {
		await setup();
		const label = image === 'logo' ? translations.fr.companies.logoLabel : translations.fr.companies.stampLabel;
		await fireEvent.press(screen.getByRole('button', { name: label }));
		const preview = screen.getAllByLabelText(label).find((element) => element.props.source?.uri === company[image]);
		expect(preview).toBeDefined();
		expect(preview).toHaveProp('resizeMode', 'contain');

		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		expect(screen.queryByRole('button', { name: translations.fr.common.close })).toBeNull();
		expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
	},
);
it('suspends only after confirmation, dispatches the membership update and returns to the company list', async () => {
	const store = await setup();
	await openModal();
	await confirm();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.suspendSuccess));
	expect(suspend).toHaveBeenCalledWith({ id: 4 });
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(store.getState().companies.user_companies).toEqual([remainingMembership]);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(router.dismissTo).toHaveBeenCalledWith('/companies');
});
it('closes the confirmation on a failed suspend, without changing memberships or navigating', async () => {
	suspend.mockReturnValue({ unwrap: () => Promise.reject(new Error('Server failed')) });
	const store = await setup();
	await openModal();
	await confirm();
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.suspendError));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(mockError).toHaveBeenCalledWith(translations.fr.companies.suspendError);
	expect(store.getState().companies.user_companies).toEqual(memberships);
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(router.dismissTo).not.toHaveBeenCalled();
});
it('finishes suspension without starting a separate membership request', async () => {
	const store = await setup();
	await openModal();
	await confirm();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.suspendSuccess));
	expect(store.getState().companies.user_companies).toEqual([remainingMembership]);
	expect(mockError).not.toHaveBeenCalled();
	expect(router.dismissTo).toHaveBeenCalledWith('/companies');
});

it('identifies a manager with empty names using the original fallback without an ID field', async () => {
	await setup({ ...company, admins: [{ ...company.admins[0], first_name: '', last_name: '' }] });
	expect(screen.getByText('Utilisateur 7')).toBeOnTheScreen();
	expect(screen.queryByText(/^ID:/)).toBeNull();
});

it('submits only once while a detail destructive request is unresolved, then permits retry after failure', async () => {
	let reject!: (error: Error) => void;
	suspend.mockReturnValueOnce({
		unwrap: () =>
			new Promise((_, rejectRequest) => {
				reject = rejectRequest;
			}),
	});
	await setup();
	await openModal();
	const button = within(screen.getByTestId('action-modal')).getByRole('button', {
		name: translations.fr.companies.suspendBtn,
	});
	await fireEvent.press(button);
	await fireEvent.press(button);
	expect(suspend).toHaveBeenCalledTimes(1);
	await act(async () => reject(new Error('Server failed')));
	expect(mockError).toHaveBeenCalledWith(translations.fr.companies.suspendError);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	suspend.mockReturnValueOnce({ unwrap: () => Promise.resolve() });
	await openModal();
	await confirm();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
	expect(suspend).toHaveBeenCalledTimes(2);
});

it.each(['loading', 'error'])('keeps edit actions hidden while the original detail state is %s', async (state) => {
	const store = await setup();
	await mockCompanyQuery.setResult({
		currentData: undefined,
		isLoading: state === 'loading',
		error: state === 'error' ? { status_code: 404, message: 'Missing', details: {} } : undefined,
		refetch: jest.fn(),
	} as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesView />
		</Provider>,
	);
	expect(screen.queryByRole('button', { name: translations.fr.common.edit })).toBeNull();
	expect(screen.getByRole(state === 'loading' ? 'progressbar' : 'alert')).toBeOnTheScreen();
});
it('keeps edit navigation and relies on the header for Back', async () => {
	await setup();
	expect(screen.queryByRole('button', { name: translations.fr.companies.backToList })).toBeNull();
	const actions = within(screen.getByTestId('details-page-actions'));
	expect(actions.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
		translations.fr.companies.suspendBtn,
		translations.fr.common.edit,
	]);
	expect(screen.queryByRole('button', { name: translations.fr.common.delete })).toBeNull();
	expect(within(screen.getByTestId('details-page')).queryByTestId('details-page-actions')).toBeNull();
	expect(within(screen.getByTestId('page-action-bar')).getByTestId('details-page-actions')).toBeOnTheScreen();
	await fireEvent.press(actions.getByRole('button', { name: translations.fr.common.edit }));
	expect(router.push).toHaveBeenCalledWith({ pathname: '/companies/form', params: { id: '4' } });
});
