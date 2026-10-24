import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import FactureClientViewPage from '@/app/(app)/(drawer)/facture-client/[id]/index';
import { useGetFactureClientQuery } from '@/store/services/factureClient';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockParams,
	router: { push: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => [
		{
			id: 5,
			role: mockRole,
			raison_sociale: 'Atlas',
			can_validate_factures: mockCanValidate,
			can_change_document_status: mockCanChangeStatus,
		},
	],
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/factureClient', () => ({
	useGetFactureClientQuery: jest.fn(() => mockQuery.useResult()),
	useDeleteFactureClientMutation: () => [mockRemove, {}],
	usePatchStatutMutation: () => [mockPatch, {}],
}));
jest.mock('@/store/services/reglement', () => ({ useGetReglementsListQuery: () => ({ currentData: [] }) }));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ currentData: [{ id: 4, reference: 'ART4', tva: 20 }] }),
}));
let mockParams: { id?: string; company_id?: string };
let mockRole: string;
let mockCanValidate = false;
let mockCanChangeStatus = false;
const mockRemove = jest.fn();
const mockPatch = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuery = createQueryMock<ReturnType<typeof useGetFactureClientQuery>>({} as never);
const t = translations.fr;
const quote = {
	id: 7,
	company: 5,
	numero_facture: '001/26',
	client_name: 'Atlas Client',
	date_facture: '2026-10-22',
	statut: 'Accepté',
	total_ht: 999,
	total_tva: 99,
	total_ttc: 1098,
	total_ttc_apres_remise: 1000,
	devise: 'MAD',
	remarque: 'Deliver Monday',
	fournisseur: 'Supplier',
	fournisseur_email: 'long.supplier@example.invalid',
	mode_paiement_name: 'Virement',
	numero_bon_commande_client: 'REQ-5',
	date_created: '2026-10-22',
	date_updated: '2026-10-22',
	created_by_user_name: 'Test User',
	lignes: [
		{
			id: 9,
			article: 4,
			designation: 'Desk',
			prix_achat: 50,
			devise_prix_achat: 'MAD',
			prix_vente: 100,
			devise_prix_vente: 'MAD',
			quantity: 2,
			remise_type: '',
			remise: 0,
		},
	],
};

it.each([
	[true, false],
	[false, true],
	[false, false],
])('requires both invoice validation and status permissions (%s, %s)', async (validate, changeStatus) => {
	mockCanValidate = validate;
	mockCanChangeStatus = changeStatus;
	await mockQuery.setResult({ currentData: { ...quote, statut: 'Envoyé' } } as never);
	await render(<FactureClientViewPage />);
	expect(screen.queryByRole('button', { name: t.facturesClient.validateInvoice })).toBeNull();
	expect(screen.getByRole('button', { name: t.facturesClient.printRequiresValidation })).toBeDisabled();
});

it('validates through the status mutation when both company permissions allow it', async () => {
	mockCanValidate = true;
	mockCanChangeStatus = true;
	await mockQuery.setResult({ currentData: { ...quote, statut: 'Envoyé' } } as never);
	await render(<FactureClientViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.facturesClient.validateInvoice }));
	await waitFor(() => expect(mockPatch).toHaveBeenCalledWith({ id: 7, data: { statut: 'Accepté' } }));
	expect(mockSuccess).toHaveBeenCalledWith(t.facturesClient.validateSuccess);
});

it('does not offer validation again for an accepted invoice', async () => {
	mockCanValidate = true;
	mockCanChangeStatus = true;
	await render(<FactureClientViewPage />);
	expect(screen.queryByRole('button', { name: t.facturesClient.validateInvoice })).toBeNull();
	expect(screen.getByRole('button', { name: t.common.print })).toBeEnabled();
});

it('reports a failed validation without a success toast', async () => {
	mockCanValidate = true;
	mockCanChangeStatus = true;
	mockPatch.mockReturnValue({ unwrap: () => Promise.reject({ detail: 'Validation denied' }) });
	await mockQuery.setResult({ currentData: { ...quote, statut: 'Envoyé' } } as never);
	await render(<FactureClientViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.facturesClient.validateInvoice }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(mockSuccess).not.toHaveBeenCalled();
});
beforeEach(async () => {
	jest.clearAllMocks();
	mockCanValidate = false;
	mockCanChangeStatus = false;
	mockParams = { id: '7', company_id: '5' };
	mockRole = 'Caissier';
	mockRemove.mockReturnValue({ unwrap: () => Promise.resolve() });
	mockPatch.mockReturnValue({ unwrap: () => Promise.resolve({ statut: 'Accepté' }) });
	await mockQuery.setResult({ currentData: quote, refetch: jest.fn() } as never);
});
it('shows server totals, document fields and shared compact line/detail cards', async () => {
	await render(<FactureClientViewPage />);
	for (const value of [
		'001/26',
		'Atlas Client',
		'Supplier',
		'long.supplier@example.invalid',
		'Virement',
		'REQ-5',
		'Deliver Monday',
		'999,00 MAD',
	])
		expect(screen.getByText(value)).toBeOnTheScreen();
	expect(within(screen.getByTestId('details-page')).queryByRole('button', { name: t.common.edit })).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/facture-client/form',
		params: { id: '7', company_id: '5' },
	});
});
it.each(['Lecture', 'Comptable', 'Commercial'])('honors detail/write/print permissions for %s', async (role) => {
	mockRole = role;
	await render(<FactureClientViewPage />);
	expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	expect(!!screen.queryByRole('button', { name: t.common.edit })).toBe(role === 'Commercial');
	expect(!!screen.queryByRole('button', { name: t.common.print })).toBe(role !== 'Lecture');
});
it('confirms deletion before mutating and only returns after success', async () => {
	await render(<FactureClientViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	expect(mockRemove).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockRemove).toHaveBeenCalledWith({ id: 7 }));
	expect(router.dismissTo).toHaveBeenCalledWith('/facture-client');
});
it('reports deletion failure without leaving the document', async () => {
	mockRemove.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'In use' } }) });
	await render(<FactureClientViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith('In use'));
	expect(router.dismissTo).not.toHaveBeenCalled();
});
it('does not reveal another company document through a forged company parameter', async () => {
	await mockQuery.setResult({ currentData: { ...quote, company: 11 } } as never);
	await render(<FactureClientViewPage />);
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByText('001/26')).toBeNull();
});
