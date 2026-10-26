import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ReglementFormPage from '@/app/(app)/(drawer)/reglements/form';
import { useGetFactureClientForPaymentQuery, useGetFactureClientQuery } from '@/store/services/factureClient';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { useGetReglementQuery } from '@/store/services/reglement';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';
import {
	AutocompleteDropdownContextProvider,
	toggleAutocomplete,
} from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockParams,
	router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: jest.fn(() => ({ currentData: [{ id: 5, role: mockRole }] })),
}));
jest.mock('@/store/services/factureClient', () => ({
	useGetFactureClientQuery: jest.fn(() => ({ currentData: mockInvoice })),
	useGetFactureClientForPaymentQuery: jest.fn(() => mockFacturesQuery.useResult()),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({
		currentData: [
			{ id: 3, raison_sociale: 'Atlas Client' },
			{ id: 4, raison_sociale: 'Other Client' },
		],
	}),
}));
jest.mock('@/store/services/reglement', () => ({
	useAddReglementMutation: () => [mockAdd, {}],
	useEditReglementMutation: () => [mockEdit, {}],
	useGetReglementQuery: jest.fn(() => mockPaymentQuery.useResult()),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
	useAddModePaiementMutation: () => [jest.fn(), {}],
	useEditModePaiementMutation: () => [jest.fn(), {}],
	useDeleteModePaiementMutation: () => [jest.fn(), {}],
}));

const t = translations.fr;
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockFacturesQuery = createQueryMock<ReturnType<typeof useGetFactureClientForPaymentQuery>>({} as never);
const mockPaymentQuery = createQueryMock<ReturnType<typeof useGetReglementQuery>>({} as never);
let mockParams: { id?: string | string[]; company_id?: string | string[]; facture_client_id?: string | string[] };
let mockRole: string;
let mockToken: string | undefined;
let mockInvoice: { id: number; company: number; client: number; numero_facture: string };
const invoice = {
	id: 7,
	numero_facture: '001/26',
	client_name: 'Atlas Client',
	date_facture: '2026-10-23',
	total_ttc_apres_remise: '1200.00',
	total_paid: '500.00',
	remaining_amount: '700.00',
	statut: 'Accepté',
	devise: 'MAD',
};
const amountLabel = `${t.reglements.colMontant} (MAD) *`;
const setup = () => render(<ReglementFormPage />, { wrapper: AutocompleteDropdownContextProvider });
const submit = () =>
	fireEvent.press(within(screen.getByTestId('page-action-bar')).getByRole('button', { name: t.common.save }));

beforeEach(async () => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
	mockToken = 'access';
	mockParams = { company_id: '5', facture_client_id: '7' };
	mockInvoice = { id: 7, company: 5, client: 3, numero_facture: '001/26' };
	mockAdd.mockReturnValue({ unwrap: async () => ({ id: 9 }) });
	mockEdit.mockReturnValue({ unwrap: async () => ({ id: 9 }) });
	await mockPaymentQuery.setResult({ currentData: payment, refetch: jest.fn() } as never);
	jest.mocked(router.canGoBack).mockReturnValue(true);
	await mockFacturesQuery.setResult({
		currentData: [invoice],
		isFetching: false,
		isError: false,
		refetch: jest.fn(),
	} as never);
});

const payment = {
	id: 9,
	company: 5,
	facture_client: 7,
	facture_client_numero: '001/26',
	client: 3,
	client_name: 'Atlas Client',
	mode_reglement: 2,
	mode_reglement_name: 'Virement',
	libelle: 'REF9',
	observations: 'Bank transfer',
	montant: '500.00',
	devise: 'MAD',
	date_reglement: '2026-10-23',
	statut: 'Valide',
	montant_facture: '1200.00',
	total_reglements_facture: '1200.00',
	reste_a_payer: '0.00',
};

it('edits a fully paid invoice payment without fetching eligible invoices or changing invoice/client', async () => {
	mockParams = { company_id: '5', id: '9' };
	await setup();
	expect(useGetReglementQuery).toHaveBeenCalledWith({ id: 9 }, expect.objectContaining({ skip: false }));
	expect(useGetFactureClientForPaymentQuery).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ skip: true }),
	);
	expect(screen.getByDisplayValue('Atlas Client')).toHaveProp('editable', false);
	expect(screen.getByDisplayValue('001/26 · Atlas Client')).toHaveProp('editable', false);
	expect(screen.queryByRole('button', { name: t.facturesClient.addTitle })).toBeNull();
	expect(screen.getByText(t.reglements.maxLabel('500,00 MAD'))).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '400,50');
	await submit();
	await waitFor(() =>
		expect(mockEdit).toHaveBeenCalledWith({
			id: 9,
			data: {
				facture_client: 7,
				mode_reglement: 2,
				libelle: 'REF9',
				observations: 'Bank transfer',
				montant: 400.5,
				date_reglement: '2026-10-23',
			},
		}),
	);
	expect(mockAdd).not.toHaveBeenCalled();
	expect(mockSuccess).toHaveBeenCalledWith(t.reglements.updateSuccess);
	expect(router.back).not.toHaveBeenCalled();
});

it('rejects an edited amount above the balance excluding this payment', async () => {
	mockParams = { company_id: '5', id: '9' };
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '501');
	await submit();
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.common.correctErrors));
	expect(mockEdit).not.toHaveBeenCalled();
});

it('keeps the edit and server error visible when payment update fails', async () => {
	mockParams = { company_id: '5', id: '9' };
	mockEdit.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { details: { montant: ['Balance changed'] } } }),
	});
	await setup();
	await submit();
	await screen.findByText('Balance changed');
	expect(mockSuccess).not.toHaveBeenCalled();
	expect(screen.getByLabelText(amountLabel)).toHaveProp('value', '500.00');
});

it('does not reveal an edit payment from another company', async () => {
	mockParams = { company_id: '5', id: '9' };
	await mockPaymentQuery.setResult({ currentData: { ...payment, company: 6 } } as never);
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByDisplayValue('REF9')).toBeNull();
});

it('prefills the invoice/client and submits all web payment fields without the UI error field', async () => {
	await setup();
	expect(useGetFactureClientForPaymentQuery).toHaveBeenCalledWith(
		{ company_id: 5, client_id: 3 },
		expect.objectContaining({ skip: false }),
	);
	expect(screen.getByDisplayValue('001/26 · Atlas Client')).toBeOnTheScreen();
	expect(screen.getByDisplayValue('Atlas Client')).toBeOnTheScreen();
	expect(screen.getByText(t.reglements.maxLabel('700,00 MAD'))).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '100,50');
	await toggleAutocomplete(t.reglements.fieldModeReglement);
	await fireEvent.press(screen.getByRole('radio', { name: 'Virement' }));
	await fireEvent.changeText(screen.getByLabelText(t.reglements.fieldLibelle), ' REF123 ');
	await fireEvent.changeText(screen.getByLabelText(t.reglements.fieldObservations), ' Bank transfer ');
	await submit();
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	expect(mockAdd).toHaveBeenCalledWith({
		data: {
			facture_client: 7,
			mode_reglement: 2,
			libelle: 'REF123',
			observations: 'Bank transfer',
			montant: 100.5,
			date_reglement: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
		},
	});
	expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('globalError');
	expect(mockSuccess).toHaveBeenCalledWith(t.reglements.addSuccess);
	expect(router.back).toHaveBeenCalledTimes(1);
});

it.each(['0', '-2', '701', 'not a number'])(
	'rejects invalid or excessive amount %s without a payment request',
	async (amount) => {
		await setup();
		await fireEvent.changeText(screen.getByLabelText(amountLabel), amount);
		await submit();
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.common.correctErrors));
		expect(mockAdd).not.toHaveBeenCalled();
		expect(router.back).not.toHaveBeenCalled();
	},
);

it('preserves the entered payment and maps server field errors when submission fails', async () => {
	mockAdd.mockReturnValue({
		unwrap: async () => Promise.reject({ status: 400, data: { details: { montant: ['Balance changed'] } } }),
	});
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '100');
	await submit();
	await screen.findByText('Balance changed');
	expect(screen.getByLabelText(amountLabel)).toHaveProp('value', '100');
	expect(mockError).toHaveBeenCalled();
	expect(router.back).not.toHaveBeenCalled();
	expect(mockSuccess).not.toHaveBeenCalled();
});

it('keeps the form disabled while a payment is pending and prevents double submission', async () => {
	let finish!: () => void;
	mockAdd.mockReturnValue({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	});
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '100');
	await submit();
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	expect(screen.getByLabelText(amountLabel)).toHaveProp('editable', false);
	await submit();
	expect(mockAdd).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
});

it('clears invoice and amount when the client filter changes and asks the server for eligible invoices', async () => {
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '100');
	await toggleAutocomplete(t.reglements.labelClient);
	await fireEvent.press(screen.getByRole('radio', { name: 'Other Client' }));
	expect(useGetFactureClientForPaymentQuery).toHaveBeenLastCalledWith(
		{ company_id: 5, client_id: 4 },
		expect.anything(),
	);
	expect(screen.getByLabelText(amountLabel)).toHaveProp('value', '');
	expect(screen.getByLabelText(amountLabel)).toHaveProp('editable', false);
	expect(screen.queryByDisplayValue('001/26 · Atlas Client')).toBeNull();
});

it('keeps unsaved edits after invoice data refreshes and enforces the updated remaining balance', async () => {
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '100');
	await fireEvent.changeText(screen.getByLabelText(t.reglements.fieldLibelle), 'Draft');
	await mockFacturesQuery.setResult({
		currentData: [{ ...invoice, remaining_amount: '50.00' }],
		isFetching: false,
		refetch: jest.fn(),
	} as never);
	expect(screen.getByLabelText(t.reglements.fieldLibelle)).toHaveProp('value', 'Draft');
	await submit();
	await screen.findByText(t.reglements.maxLabel('50,00 MAD'));
	expect(mockAdd).not.toHaveBeenCalled();
});

it('allows an exact remaining-balance payment and provides a direct-entry fallback to the invoice', async () => {
	jest.mocked(router.canGoBack).mockReturnValue(false);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(amountLabel), '700');
	await submit();
	await waitFor(() =>
		expect(router.replace).toHaveBeenCalledWith({
			pathname: '/facture-client/[id]',
			params: { id: '7', company_id: '5' },
		}),
	);
	expect(mockAdd.mock.calls[0][0].data.montant).toBe(700);
});

it('blocks a fully paid or otherwise ineligible invoice even when its ID is provided in the route', async () => {
	await mockFacturesQuery.setResult({ currentData: [], isFetching: false, refetch: jest.fn() } as never);
	await setup();
	expect(screen.getByLabelText(amountLabel)).toHaveProp('editable', false);
	await submit();
	await screen.findByText(t.reglements.noFacture);
	expect(mockAdd).not.toHaveBeenCalled();
});

it.each(['Comptable', 'Lecture', 'Logistique'])(
	'denies payment creation for role %s before fetching the invoice',
	async (role) => {
		mockRole = role;
		await setup();
		expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
		expect(useGetFactureClientQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: true }));
		expect(useGetFactureClientForPaymentQuery).not.toHaveBeenCalled();
		expect(mockAdd).not.toHaveBeenCalled();
	},
);

it('blocks a route whose invoice belongs to a different company', async () => {
	mockInvoice = { ...mockInvoice, company: 6 };
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(useGetFactureClientForPaymentQuery).not.toHaveBeenCalled();
});

it.each([undefined, '', '0', '../5', ['5']])(
	'rejects malformed company parameter %s without querying account memberships',
	async (company_id) => {
		mockParams.company_id = company_id;
		await setup();
		expect(screen.getByRole('alert')).toHaveTextContent(t.notFound.message);
		expect(useGetUserCompaniesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ skip: true }));
		expect(useGetFactureClientForPaymentQuery).not.toHaveBeenCalled();
	},
);

it('does not query company payment data before authentication', async () => {
	mockToken = undefined;
	await setup();
	expect(useGetUserCompaniesQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({ skip: true }));
	expect(useGetFactureClientForPaymentQuery).not.toHaveBeenCalled();
	expect(mockAdd).not.toHaveBeenCalled();
});

it('shows retry and blocks submission while the eligible-invoice request is unavailable', async () => {
	const refetch = jest.fn();
	await mockFacturesQuery.setResult({
		currentData: [invoice],
		isFetching: false,
		isError: true,
		error: { status: 503 },
		refetch,
	} as never);
	await setup();
	expect(within(screen.getByTestId('page-action-bar')).getByRole('button', { name: t.common.save })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(refetch).toHaveBeenCalledTimes(1);
	expect(mockAdd).not.toHaveBeenCalled();
});
