import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ClientsFormPage from '@/app/(app)/(drawer)/clients/form';
import { useGetClientQuery, useGetCodeClientQuery } from '@/store/services/client';
import { useGetCitiesListQuery } from '@/store/services/parameter';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';
import type { CompaniesUserCompaniesType } from '@/types/companyTypes';
import {
	AutocompleteDropdownContextProvider,
	toggleAutocomplete,
} from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { dismissTo: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: jest.fn(() => ({ currentData: mockCompanies })),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientQuery: jest.fn(() => mockClientQuery.useResult()),
	useGetCodeClientQuery: jest.fn(() => mockCodeQuery.useResult()),
	useAddClientMutation: () => [mockAddClient, {}],
	useEditClientMutation: () => [mockEditClient, {}],
}));
jest.mock('@/store/services/parameter', () => ({
	useGetCitiesListQuery: jest.fn(() => mockCitiesQuery.useResult()),
	useAddCityMutation: () => [mockAddCity, {}],
	useEditCityMutation: () => [jest.fn(), {}],
	useDeleteCityMutation: () => [jest.fn(), {}],
}));

const mockClientQuery = createQueryMock<ReturnType<typeof useGetClientQuery>>({} as never);
const mockCodeQuery = createQueryMock<ReturnType<typeof useGetCodeClientQuery>>({} as never);
const mockCitiesQuery = createQueryMock<ReturnType<typeof useGetCitiesListQuery>>({} as never);
let mockParams: { id?: string | string[]; company_id?: string | string[] };
let mockToken: string | undefined;
let mockCompanies: CompaniesUserCompaniesType[];
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAddClient = jest.fn();
const mockEditClient = jest.fn();
const mockAddCity = jest.fn();
const refetchCode = jest.fn();
const t = translations.fr;
const client = {
	id: 7,
	company: 5,
	client_type: 'PM',
	code_client: 'CLT007',
	raison_sociale: 'Client Atlas',
	ville: 2,
	email: 'client@example.invalid',
	tel: '0612345678',
	ICE: '123456789012345',
	registre_de_commerce: 'RC-123',
	delai_de_paiement: 60,
};
const setup = () => render(<ClientsFormPage />, { wrapper: AutocompleteDropdownContextProvider });
const fillPM = async () => {
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRaisonSociale), 'Client Atlas');
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldICE), '123456789012345');
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRegistreCommerce), 'RC-123');
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldTelephone), '0612345678');
	await toggleAutocomplete(t.clients.fieldVille);
	await fireEvent.press(screen.getByRole('radio', { name: 'Casablanca' }));
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { company_id: '5' };
	mockToken = 'test-access';
	mockCompanies = [{ id: 5, raison_sociale: 'Atlas', role: 'Caissier', uses_foreign_currency: false }];
	mockAddClient.mockReturnValue({ unwrap: () => Promise.resolve({ id: 8 }) });
	mockEditClient.mockReturnValue({ unwrap: () => Promise.resolve(client) });
	mockAddCity.mockReturnValue({ unwrap: () => Promise.resolve({ id: 3 }) });
	refetchCode.mockReturnValue({ unwrap: () => Promise.resolve({ code_client: 'CLT011' }) });
	await mockClientQuery.setResult({ currentData: undefined, refetch: jest.fn() } as never);
	await mockCodeQuery.setResult({ currentData: { code_client: 'CLT010' }, refetch: refetchCode } as never);
	await mockCitiesQuery.setResult({
		currentData: [{ id: 2, nom: 'Casablanca', company: 5 }],
		refetch: jest.fn(),
	} as never);
});

it('creates a company-scoped client, preserves the visible phone, and returns to the list', async () => {
	await setup();
	expect(screen.queryByRole('header', { name: t.clients.addTitle })).toBeNull();
	expect(screen.queryByLabelText(t.clients.fieldNom)).toBeNull();
	expect(screen.queryByLabelText(t.clients.fieldPrenom)).toBeNull();
	expect(screen.getByLabelText(t.clients.fieldAdresse)).toHaveProp('numberOfLines', 2);
	expect(screen.getByLabelText(t.clients.fieldRemarque)).toHaveProp('numberOfLines', 4);
	expect(screen.getByLabelText(t.clients.fieldCodeClient)).toHaveProp('value', 'CLT010');
	await fillPM();
	const delayLabel = t.clients.fieldDelaiPaiement;
	expect(screen.getByLabelText(delayLabel)).toHaveProp('keyboardType', 'number-pad');
	await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue(delayLabel) }));
	expect(screen.getByLabelText(delayLabel)).toHaveProp('value', '59');
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue(delayLabel) }));
	expect(screen.getByLabelText(delayLabel)).toHaveProp('value', '60');
	await fireEvent.changeText(screen.getByLabelText(delayLabel), '0');
	expect(screen.getByRole('button', { name: t.common.decreaseValue(delayLabel) })).toBeDisabled();
	await fireEvent.changeText(screen.getByLabelText(delayLabel), '2.5');
	expect(screen.getByLabelText(delayLabel)).toHaveProp('value', '0');
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue(delayLabel) }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockAddClient).toHaveBeenCalledTimes(1));
	expect(mockAddClient.mock.calls[0][0].data).toMatchObject({
		company: 5,
		client_type: 'PM',
		code_client: 'CLT010',
		raison_sociale: 'Client Atlas',
		ville: 2,
		tel: '0612345678',
		nom: null,
		prenom: null,
		delai_de_paiement: 1,
	});
	expect(mockAddClient.mock.calls[0][0].data).not.toHaveProperty('globalError');
	expect(mockSuccess).toHaveBeenCalledWith(t.clients.addSuccess);
	expect(router.dismissTo).toHaveBeenCalledWith('/clients');
});

it('blocks an incomplete form and shows translated field labels', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.common.correctErrors));
	expect(mockAddClient).not.toHaveBeenCalled();
	expect(screen.getAllByText(new RegExp(t.clients.fieldRegistreCommerce)).length).toBeGreaterThan(0);
});

it('clears the required-city error when selection is immediately followed by blur', async () => {
	await setup();
	await fireEvent(screen.getByRole('combobox', { name: t.clients.fieldVille }), 'blur', { nativeEvent: { target: 1 } });
	await waitFor(() => expect(screen.getByText('Ce champ est obligatoire.')).toBeOnTheScreen());
	await toggleAutocomplete(t.clients.fieldVille);
	const option = screen.getByRole('radio', { name: 'Casablanca' });
	const blur = screen.getByRole('combobox', { name: t.clients.fieldVille }).props.onBlur;
	await act(async () => {
		const selection = fireEvent.press(option);
		blur({ nativeEvent: { target: 1 } });
		await selection;
	});
	await waitFor(() => expect(screen.queryByText('Ce champ est obligatoire.')).toBeNull());
	expect(screen.getByRole('combobox', { name: t.clients.fieldVille })).toHaveProp('value', 'Casablanca');
});

it('changes the required fields for a physical person and clears hidden company fields', async () => {
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRaisonSociale), 'Discard this company name');
	await fireEvent.press(screen.getByRole('button', { name: t.clients.typeSection }));
	await fireEvent.press(screen.getByRole('radio', { name: t.clients.typePersonnePhysique }));
	expect(screen.queryByLabelText(t.clients.fieldRaisonSociale)).toBeNull();
	expect(screen.queryByLabelText(t.clients.fieldEmail)).toBeNull();
	expect(screen.queryByLabelText(t.clients.fieldICE)).toBeNull();
	expect(screen.queryByLabelText(t.clients.fieldRegistreCommerce)).toBeNull();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldNom), 'Amine');
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldPrenom), 'Benali');
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldAdresse), 'Rue de Casablanca');
	await toggleAutocomplete(t.clients.fieldVille);
	await fireEvent.press(screen.getByRole('radio', { name: 'Casablanca' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockAddClient).toHaveBeenCalledTimes(1));
	expect(mockAddClient.mock.calls[0][0].data).toMatchObject({
		client_type: 'PP',
		nom: 'Amine',
		prenom: 'Benali',
		raison_sociale: null,
		ICE: null,
		registre_de_commerce: null,
	});
});

it('resets only the generated code, preserving all other entered values and city selection', async () => {
	await setup();
	await fillPM();
	await fireEvent.press(screen.getByRole('button', { name: t.clients.resetCode }));
	await waitFor(() => expect(screen.getByLabelText(t.clients.fieldCodeClient)).toHaveProp('value', 'CLT011'));
	await mockCodeQuery.setResult({ currentData: { code_client: 'CLT011' }, refetch: refetchCode } as never);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('value', 'Client Atlas');
	expect(screen.getByRole('combobox', { name: t.clients.fieldVille })).toHaveProp('value', 'Casablanca');
});

it('allows a manually entered code if code generation fails, and retains values when retry fails', async () => {
	await mockCodeQuery.setResult({ isError: true, error: { status: 0 }, refetch: refetchCode } as never);
	refetchCode.mockReturnValue({ unwrap: () => Promise.reject({ status: 0 }) });
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldCodeClient), 'MANUAL01');
	await fireEvent.press(screen.getByRole('button', { name: t.clients.resetCode }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(screen.getByLabelText(t.clients.fieldCodeClient)).toHaveProp('value', 'MANUAL01');
});

it('keeps the draft mounted while retrying an initially failed code request', async () => {
	await mockCodeQuery.setResult({ isError: true, error: { status: 0 }, refetch: refetchCode } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRaisonSociale), 'Keep this draft');
	await mockCodeQuery.setResult({ isError: false, isFetching: true, isLoading: false, refetch: refetchCode } as never);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('value', 'Keep this draft');
	await mockCodeQuery.setResult({ currentData: { code_client: 'CLT011' }, refetch: refetchCode } as never);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('value', 'Keep this draft');
});

it('waits for the initial code before mounting the fields', async () => {
	await mockCodeQuery.setResult({ isLoading: true } as never);
	await setup();
	expect(screen.queryByLabelText(t.clients.fieldCodeClient)).toBeNull();
	await mockCodeQuery.setResult({ currentData: { code_client: 'CLT010' } } as never);
	expect(screen.getByLabelText(t.clients.fieldCodeClient)).toHaveProp('value', 'CLT010');
});

it('loads an edit by its own company, updates with a mutation, and stays on the form', async () => {
	const longName = 'Démo Services et Aménagements de la Côte Atlantique';
	mockParams = { id: '7' };
	await mockClientQuery.setResult({ currentData: client } as never);
	await setup();
	expect(useGetCodeClientQuery).toHaveBeenLastCalledWith({ company_id: 5 }, expect.objectContaining({ skip: true }));
	expect(screen.queryByRole('button', { name: t.clients.resetCode })).toBeNull();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRaisonSociale), longName);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('value', longName);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('scrollEnabled', true);
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() =>
		expect(mockEditClient).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 7,
				data: expect.objectContaining({ company: 5, raison_sociale: longName }),
			}),
		),
	);
	expect(mockSuccess).toHaveBeenCalledWith(t.clients.updateSuccess);
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('keeps backend field errors and edited values visible after a failed save', async () => {
	mockParams = { id: '7' };
	await mockClientQuery.setResult({ currentData: client } as never);
	mockEditClient.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { details: { code_client: ['Code already used'] } } }),
	});
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.clients.fieldRaisonSociale), 'Edited Client');
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.clients.updateError));
	expect(screen.getAllByText(/Code already used/).length).toBeGreaterThan(0);
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('value', 'Edited Client');
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('disables fields and prevents a second save while a request is pending', async () => {
	let finish!: () => void;
	mockParams = { id: '7' };
	await mockClientQuery.setResult({ currentData: client } as never);
	mockEditClient.mockReturnValue({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	});
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() => expect(mockEditClient).toHaveBeenCalledTimes(1));
	expect(screen.getByLabelText(t.clients.fieldRaisonSociale)).toHaveProp('editable', false);
	expect(screen.getByRole('button', { name: t.common.update })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	expect(mockEditClient).toHaveBeenCalledTimes(1);
	await act(async () => finish());
});

it.each(['Lecture', 'Comptable', 'Logistique'])('blocks write access for the %s role', async (role) => {
	mockCompanies[0].role = role;
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByLabelText(t.clients.fieldCodeClient)).toBeNull();
	expect(useGetCodeClientQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
});

it('rejects a company route parameter that disagrees with the fetched client', async () => {
	mockParams = { id: '7', company_id: '6' };
	await mockClientQuery.setResult({ currentData: client } as never);
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(mockEditClient).not.toHaveBeenCalled();
});

it.each([{ id: '0' }, { id: ['7'] }, { company_id: '../5' }])(
	'rejects malformed route parameters %j',
	async (params) => {
		mockParams = params;
		await setup();
		expect(screen.getByRole('alert')).toHaveTextContent(t.notFound.message);
		expect(useGetClientQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
		expect(useGetCodeClientQuery).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
	},
);

it.each([
	['Atlas', false],
	[' immobiliere nectar ', true],
] as const)('offers Client Divers only for the permitted company %s', async (name, available) => {
	mockCompanies[0].raison_sociale = name;
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.clients.typeSection }));
	expect(!!screen.queryByRole('radio', { name: t.clients.typeClientDivers })).toBe(available);
});

it('allows choosing an eligible company when opened from the drawer', async () => {
	mockParams = {};
	mockCompanies.push({ id: 6, raison_sociale: 'Second Company', role: 'Commercial', uses_foreign_currency: false });
	await setup();
	await toggleAutocomplete(t.shared.selectCompany);
	await fireEvent.press(screen.getByRole('radio', { name: 'Second Company' }));
	expect(useGetCodeClientQuery).toHaveBeenLastCalledWith({ company_id: 6 }, expect.objectContaining({ skip: false }));
	expect(useGetCitiesListQuery).toHaveBeenLastCalledWith({ company_id: 6 }, expect.objectContaining({ skip: false }));
});

it('adds a city in the selected company using the shared CRUD sheet', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.add} ${t.clients.fieldVille}` }));
	await fireEvent.changeText(screen.getByLabelText(t.addEntityModal.fieldLabel(t.clients.fieldVille)), 'Rabat');
	await fireEvent.press(within(screen.getByTestId('entity-name-sheet')).getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(mockAddCity).toHaveBeenCalledWith({ data: { nom: 'Rabat', company: 5 } }));
	await mockCitiesQuery.setResult({
		currentData: [
			{ id: 2, nom: 'Casablanca' },
			{ id: 3, nom: 'Rabat' },
		],
	} as never);
	expect(screen.getByRole('combobox', { name: t.clients.fieldVille })).toHaveProp('value', 'Rabat');
});
