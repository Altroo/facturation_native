import { createQueryMock } from '@/__tests__/setupQuery';
import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil, setGroupes } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { router } from 'expo-router';
import CompaniesForm from '@/app/(app)/companies/form';
import type { CompanyClass } from '@/models/classes';
import {
	useGetCompanyQuery,
	useAddCompanyMutation,
	useEditCompanyMutation,
	companyApi,
} from '@/store/services/company';
import { useGetUsersListQuery, useGetGroupsQuery } from '@/store/services/account';

import { translations } from '@/translations';
import { AutocompleteDropdownContextProvider } from '@/__tests__/setupAutocomplete';
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-access' }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let mockParams: { id?: string | string[] } = {};
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockParams,
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
	useAddCompanyMutation: jest.fn(),
	useEditCompanyMutation: jest.fn(),
	companyApi: { endpoints: { getUserCompanies: { initiate: jest.fn() } } },
}));
jest.mock('@/store/services/account', () => ({
	useGetUsersListQuery: jest.fn(function useGetUsersListQuery() {
		return mockUsersQuery.useResult();
	}),
	useGetGroupsQuery: jest.fn(),
}));
jest.mock('@/components/formikElements/customSquareImageUploading/customSquareImageUploading', () => () => null);
const mockCompanyQuery = createQueryMock<ReturnType<typeof useGetCompanyQuery>>({} as never);
const mockUsersQuery = createQueryMock<ReturnType<typeof useGetUsersListQuery>>({} as never);
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

const addCompany = jest.fn();
const editCompany = jest.fn();
const refreshMemberships = jest.fn();
const unsubscribe = jest.fn();
const memberships = [{ id: 4, raison_sociale: 'Example Company', role: 'Caissier', uses_foreign_currency: false }];
const setup = async (edit = false, record: CompanyClass = company) => {
	mockParams = edit ? { id: String(record.id) } : {};
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(setProfil(creator));
	store.dispatch(setUserCompanies(memberships));
	store.dispatch(setAuthenticated());
	store.dispatch(setGroupes({ group_titles: ['Caissier', 'Commercial', 'Lecture'] }));
	const dispatch = jest.spyOn(store, 'dispatch');
	await mockCompanyQuery.setResult({ currentData: edit ? record : undefined, refetch: jest.fn() } as never);
	await mockUsersQuery.setResult({ data: [creator], refetch: jest.fn() } as never);
	jest.mocked(useGetGroupsQuery).mockReturnValue({ isFetching: false, refetch: jest.fn() } as never);
	jest.mocked(useAddCompanyMutation).mockReturnValue([addCompany, {}] as never);
	jest.mocked(useEditCompanyMutation).mockReturnValue([editCompany, {}] as never);
	await render(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
		{ wrapper: AutocompleteDropdownContextProvider },
	);
	return { store, dispatch };
};
beforeEach(() => {
	mockParams = {};
	jest.clearAllMocks();
	addCompany.mockReturnValue({ unwrap: () => Promise.resolve(company) });
	editCompany.mockReturnValue({ unwrap: () => Promise.resolve({ ...company, raison_sociale: 'Updated Company' }) });
	refreshMemberships.mockResolvedValue(memberships);
	jest
		.mocked(companyApi.endpoints.getUserCompanies.initiate)
		.mockImplementation((() => () => ({ unwrap: refreshMemberships, unsubscribe })) as never);
});
it.each(['', ['4'], '../4', '0'])('blocks malformed edit id %s without requesting a company', async (id) => {
	const { store } = await setup(true);
	mockParams = { id };
	jest.mocked(useGetCompanyQuery).mockClear();
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	expect(useGetCompanyQuery).not.toHaveBeenCalled();
	expect(screen.queryByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toBeNull();
	expect(screen.getByRole('alert')).toHaveTextContent(translations.fr.notFound.message);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.back }));
	expect(router.dismissTo).toHaveBeenCalledWith('/companies');
	expect(editCompany).not.toHaveBeenCalled();
});
it('creates with the original creator role and locked permissions, strips globalError, and returns to the list', async () => {
	await setup();
	expect(screen.getByText('Test Creator')).toBeOnTheScreen();
	expect(screen.getByText('Caissier')).toBeOnTheScreen();
	expect(screen.getByRole('switch', { name: translations.fr.managedByTable.invoiceValidation })).toBeDisabled();
	expect(screen.getByRole('switch', { name: translations.fr.managedByTable.documentStatusChange })).toBeDisabled();
	expect(screen.getByRole('button', { name: translations.fr.common.delete })).toBeDisabled();
	await fireEvent.changeText(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *'), 'New Company');
	await fireEvent.changeText(screen.getByLabelText(translations.fr.companies.fieldICE + ' *'), '123456789012345');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.fieldNbrEmploye + ' *' }));
	await fireEvent.press(screen.getByRole('radio', { name: '1 à 5' }));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.addTitle, disabled: false }));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.addSuccess));
	expect(addCompany.mock.calls[0][0].data).toMatchObject({
		raison_sociale: 'New Company',
		ICE: '123456789012345',
		nbr_employe: '1 à 5',
		managed_by: [{ pk: 7, role: 'Caissier', can_validate_factures: true, can_change_document_status: true }],
		stock_management_enabled: false,
		inventory_management_enabled: false,
	});
	expect(addCompany.mock.calls[0][0].data).not.toHaveProperty('globalError');
	expect(addCompany.mock.calls[0][0].data.managed_by[0]).toMatchObject({ first_name: 'Test', last_name: 'Creator' });
	expect(router.dismissTo).toHaveBeenCalledWith('/companies');
});
it('preserves original administrative data, images and manager permissions on edit and cannot disable existing stock', async () => {
	await setup(true);
	expect(screen.getByRole('switch', { name: translations.fr.companies.stockManagementLabel })).toBeDisabled();
	expect(screen.getAllByRole('switch', { name: translations.fr.managedByTable.invoiceValidation })[0]).toBeDisabled();
	expect(
		screen.getAllByRole('switch', { name: translations.fr.managedByTable.documentStatusChange })[0],
	).toBeDisabled();
	expect(screen.getAllByRole('button', { name: translations.fr.common.delete, disabled: false })).toHaveLength(1);
	await fireEvent.changeText(
		screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *'),
		'Updated Company',
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.updateSuccess));
	expect(editCompany.mock.calls[0][0]).toMatchObject({
		id: 4,
		data: {
			raison_sociale: 'Updated Company',
			email: company.email,
			logo: company.logo,
			logo_cropped: company.logo_cropped,
			cachet: company.cachet,
			cachet_cropped: company.cachet_cropped,
			numero_du_compte: 'ACCOUNT123',
			ICE: company.ICE,
			registre_de_commerce: 'RC1',
			identifiant_fiscal: 'IF1',
			tax_professionnelle: 'TP1',
			CNSS: 'CNSS1',
			uses_foreign_currency: true,
			stock_management_enabled: true,
			inventory_management_enabled: true,
		},
	});
	expect(editCompany.mock.calls[0][0].data.managed_by).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				pk: 7,
				role: 'Caissier',
				can_validate_factures: true,
				can_change_document_status: true,
			}),
			expect.objectContaining({
				pk: 9,
				role: 'Commercial',
				can_validate_factures: false,
				can_change_document_status: true,
			}),
		]),
	);
	expect(editCompany.mock.calls[0][0].data.managed_by).toHaveLength(2);
	expect(router.dismissTo).not.toHaveBeenCalled();
	expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
		'value',
		'Updated Company',
	);
});
it('keeps edits and shows a backend field error without refreshing memberships or navigating after a failed save', async () => {
	editCompany.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { details: { ICE: ['ICE already exists'] } } }),
	});
	await setup(true);
	await fireEvent.changeText(screen.getByLabelText(translations.fr.companies.fieldICE + ' *'), '987654321012345');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await screen.findByText('ICE already exists');
	expect(screen.getByLabelText(translations.fr.companies.fieldICE + ' *')).toHaveProp('value', '987654321012345');
	expect(mockError).toHaveBeenCalledWith(translations.fr.companies.updateError);
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('keeps the company form visible and disabled while its save button is busy', async () => {
	let finish!: () => void;
	editCompany.mockReturnValue({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	});
	await setup(true);
	const label = translations.fr.companies.fieldRaisonSociale + ' *';
	await fireEvent.changeText(screen.getByLabelText(label), 'Updated Company');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(editCompany).toHaveBeenCalledTimes(1));
	expect(screen.getByLabelText(label)).toHaveProp('value', 'Updated Company');
	expect(screen.getByLabelText(label)).toHaveProp('editable', false);
	expect(screen.getByRole('button', { name: translations.fr.common.update })).toHaveProp('accessibilityState', {
		busy: true,
		disabled: true,
	});
	await act(async () => finish());
	await waitFor(() => expect(screen.getByLabelText(label)).toHaveProp('editable', true));
	expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.updateSuccess);
});
it('uses the original validation toast and keeps invalid company fields without calling the API', async () => {
	await setup(true);
	await act(
		async () => await fireEvent.changeText(screen.getByLabelText(translations.fr.companies.fieldICE + ' *'), ''),
	);
	await waitFor(() => expect(screen.getByLabelText(translations.fr.companies.fieldICE + ' *')).toHaveProp('value', ''));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.common.correctErrors));
	expect(editCompany).not.toHaveBeenCalled();
	expect(addCompany).not.toHaveBeenCalled();
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('replaces untouched cached company values and manager permissions after a same-ID refresh', async () => {
	const { store } = await setup(true);
	const fresh = {
		...company,
		raison_sociale: 'Fresh Company',
		ICE: '987654321012345',
		admins: [company.admins[0], { ...company.admins[1], role: 'Lecture', can_validate_factures: true }],
	};
	await mockCompanyQuery.setResult({ currentData: fresh, refetch: jest.fn() } as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	await waitFor(() =>
		expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
			'value',
			'Fresh Company',
		),
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(editCompany).toHaveBeenCalled());
	expect(editCompany.mock.calls[0][0].data).toMatchObject({
		raison_sociale: 'Fresh Company',
		ICE: fresh.ICE,
		managed_by: expect.arrayContaining([
			expect.objectContaining({
				pk: 9,
				role: 'Lecture',
				can_validate_factures: true,
				can_change_document_status: true,
			}),
		]),
	});
});

it('reinitializes company edits and managers after a same-ID refresh, matching the original form', async () => {
	const { store } = await setup(true);
	await fireEvent.changeText(
		screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *'),
		'Unsaved Company',
	);
	await waitFor(() =>
		expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
			'value',
			'Unsaved Company',
		),
	);
	await mockCompanyQuery.setResult({
		currentData: { ...company, raison_sociale: 'Server Company', ICE: '987654321012345', admins: [company.admins[0]] },
		refetch: jest.fn(),
	} as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	await waitFor(() =>
		expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
			'value',
			'Server Company',
		),
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(editCompany).toHaveBeenCalled());
	expect(editCompany.mock.calls[0][0].data).toMatchObject({ raison_sociale: 'Server Company', ICE: '987654321012345' });
	expect(editCompany.mock.calls[0][0].data.managed_by).toHaveLength(1);
});

it('shows labeled manager and inventory errors after a rejected save', async () => {
	editCompany.mockReturnValue({
		unwrap: () =>
			Promise.reject({
				status: 400,
				data: {
					details: {
						managed_by: ['Manager is required'],
						inventory_management_enabled: ['Inventory setting is locked'],
					},
				},
			}),
	});
	await setup(true);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	const summary =
		translations.fr.companies.managersSection +
		' : Manager is required\n' +
		translations.fr.companies.inventoryManagementLabel +
		' : Inventory setting is locked';
	expect((await screen.findAllByText(summary)).length).toBeGreaterThan(0);
	expect(mockSuccess).not.toHaveBeenCalled();
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
});

it.each([0, 503])('uses original form/error rendering after a background refresh fails with %s', async (status) => {
	const { store } = await setup(true);
	await fireEvent.changeText(
		screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *'),
		'Unsaved Company',
	);
	await waitFor(() =>
		expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
			'value',
			'Unsaved Company',
		),
	);
	await mockCompanyQuery.setResult({
		currentData: company,
		error: { status_code: status, message: 'Refresh unavailable', details: {} },
		refetch: jest.fn(),
	} as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	if (status === 503) {
		expect(screen.getByRole('alert')).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: translations.fr.common.update })).toBeNull();
		return;
	}
	expect(screen.getByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toHaveProp(
		'value',
		'Unsaved Company',
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(editCompany).toHaveBeenCalled());
	expect(editCompany.mock.calls[0][0].data).toMatchObject({ raison_sociale: 'Unsaved Company', ICE: company.ICE });
	expect(editCompany.mock.calls[0][0].data.managed_by).toHaveLength(2);
});

it.each([401, 403, 404])('blocks cached company editing after an authoritative %s response', async (status) => {
	const { store } = await setup(true);
	await mockCompanyQuery.setResult({
		currentData: company,
		error: { status_code: status, message: 'Unavailable', details: {} },
		refetch: jest.fn(),
	} as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	expect(screen.queryByLabelText(translations.fr.companies.fieldRaisonSociale + ' *')).toBeNull();
	expect(screen.getByRole('alert')).toBeOnTheScreen();
	expect(editCompany).not.toHaveBeenCalled();
});

it('preserves an existing manager list without inserting the editing account', async () => {
	await setup(true, { ...company, admins: [company.admins[1]], managed_by: [company.managed_by[1]], email: null });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
	await waitFor(() => expect(editCompany).toHaveBeenCalled());
	expect(editCompany.mock.calls[0][0].data).toMatchObject({
		email: '',
		managed_by: [{ pk: 9, role: 'Commercial', can_validate_factures: false, can_change_document_status: true }],
	});
	expect(company.admins[1].role).toBe('Commercial');
});

it.each([
	[false, true, true],
	[true, true, true],
	[true, false, false],
])(
	'preserves original stock=%s and inventory=%s fields in the submitted payload (%s)',
	async (stock, inventory, expected) => {
		await setup(true, { ...company, stock_management_enabled: stock, inventory_management_enabled: inventory });
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.update }));
		await waitFor(() => expect(editCompany).toHaveBeenCalled());
		expect(editCompany.mock.calls[0][0].data).toMatchObject({
			stock_management_enabled: stock,
			inventory_management_enabled: expected,
		});
	},
);

it('renders the original add title and sections without duplicating header Back', async () => {
	await setup();
	expect(screen.getByRole('header', { name: translations.fr.companies.addTitle })).toBeOnTheScreen();
	for (const section of [
		translations.fr.companies.generalSection,
		translations.fr.companies.responsableSection,
		translations.fr.companies.contactSection,
		translations.fr.companies.adminSection,
	])
		expect(screen.getByText(section)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.companies.addTitle })).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: translations.fr.companies.backToList })).toBeNull();
});
it('shows the original relationship loading state until users are available', async () => {
	const { store } = await setup();
	await mockUsersQuery.setResult({ isLoading: true, refetch: jest.fn() } as never);
	await screen.rerender(
		<Provider store={store}>
			<CompaniesForm />
		</Provider>,
	);
	expect(screen.getByRole('progressbar')).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: translations.fr.companies.addTitle })).toBeNull();
});
