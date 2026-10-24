import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import FactureAvoirFormPage from '@/app/(app)/(drawer)/facture-avoir/form';
import { useGetFactureAvoirQuery, useGetNumFactureAvoirQuery } from '@/store/services/factureAvoir';
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
	router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { id: 5, raison_sociale: 'Atlas', uses_foreign_currency: true } }),
	useGetUserCompaniesQuery: () => ({
		currentData: [{ id: 5, raison_sociale: 'Atlas', role: mockRole, can_change_document_status: mockCanChangeStatus }],
	}),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({
		currentData: mockClientAvailable ? [{ id: 3, company: 5, raison_sociale: 'Client Atlas' }] : [],
	}),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ currentData: [{ id: 4, reference: 'ART4', designation: 'Desk', tva: 20 }] }),
}));
jest.mock('@/store/services/factureClient', () => ({
	useGetFactureClientListQuery: () => ({
		currentData: [{ id: 12, company: 5, numero_facture: 'FAC12/26', client_name: 'Client Atlas' }],
	}),
	useGetFactureClientQuery: () => ({ currentData: { id: 12, company: mockOriginCompany } }),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
}));
jest.mock('@/store/services/factureAvoir', () => ({
	useGetFactureAvoirQuery: jest.fn(() => mockDocumentQuery.useResult()),
	useGetNumFactureAvoirQuery: jest.fn(() => mockNumberQuery.useResult()),
	useGetFactureAvoirFromFactureQuery: (_args: unknown, options: { skip: boolean }) => ({
		currentData: options.skip ? undefined : mockOrigin,
	}),
	useLazyGetFactureAvoirFromFactureQuery: () => [mockLoadOrigin, {}],
	useAddFactureAvoirMutation: () => [mockAdd, {}],
	useEditFactureAvoirMutation: () => [mockEdit, {}],
	usePatchFactureAvoirStatutMutation: () => [mockPatch, {}],
}));
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockPatch = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockReset = jest.fn();
const mockLoadOrigin = jest.fn();
const mockAbort = jest.fn();
const mockUnsubscribe = jest.fn();
const mockDocumentQuery = createQueryMock<ReturnType<typeof useGetFactureAvoirQuery>>({} as never);
const mockNumberQuery = createQueryMock<ReturnType<typeof useGetNumFactureAvoirQuery>>({} as never);
let mockParams: { id?: string; company_id?: string; facture_origine_id?: string };
let mockRole: string;
let mockCanChangeStatus: boolean;
let mockOriginCompany: number;
let mockClientAvailable: boolean;
const t = translations.fr;
const line = {
	id: 9,
	article: 4,
	designation: 'Desk',
	prix_achat: 80,
	devise_prix_achat: 'MAD',
	prix_vente: 60,
	devise_prix_vente: 'EUR',
	quantity: 2,
	remise_type: '',
	remise: 0,
};
const mockOrigin = {
	facture_origine: 12,
	facture_origine_numero: 'FAC12/26',
	facture_origine_date: '2026-10-22',
	client: 3,
	client_name: 'Client Atlas',
	date_avoir: '2026-10-24',
	mode_paiement: 2,
	numero_bon_commande_client: 'BC12',
	fournisseur: 'Supplier',
	fournisseur_email: 'supplier@example.invalid',
	devise: 'EUR',
	remise_type: 'Pourcentage',
	remise: '5.00',
	lignes: [line],
};
const credit = {
	...mockOrigin,
	id: 7,
	company: 5,
	numero_avoir: '001/26',
	motif_avoir: 'remise',
	statut: 'Brouillon',
	remarque: 'Keep packaging',
};
const setup = () => render(<FactureAvoirFormPage />, { wrapper: AutocompleteDropdownContextProvider });
const selectOrigin = async () => {
	await toggleAutocomplete(t.facturesAvoir.selectOrigin);
	await fireEvent.press(screen.getByRole('radio', { name: 'FAC12/26 - Client Atlas' }));
};
const selectReason = async () => {
	await fireEvent.press(screen.getByRole('button', { name: t.facturesAvoir.fieldMotif }));
	await fireEvent.press(screen.getByRole('radio', { name: t.facturesAvoir.motifRemise }));
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { company_id: '5' };
	mockRole = 'Caissier';
	mockCanChangeStatus = true;
	mockOriginCompany = 5;
	mockClientAvailable = true;
	mockAdd.mockReturnValue({ unwrap: () => Promise.resolve({ id: 8 }) });
	mockEdit.mockReturnValue({ unwrap: () => Promise.resolve(credit) });
	mockPatch.mockReturnValue({ unwrap: () => Promise.resolve({ statut: 'Envoyé' }) });
	mockReset.mockReturnValue({ unwrap: () => Promise.resolve({ numero_avoir: '002/26' }) });
	mockLoadOrigin.mockReturnValue({
		unwrap: () => Promise.resolve(mockOrigin),
		abort: mockAbort,
		unsubscribe: mockUnsubscribe,
	});
	await mockDocumentQuery.setResult({ currentData: undefined } as never);
	await mockNumberQuery.setResult({ currentData: { numero_avoir: '001/26' }, refetch: mockReset } as never);
});

it('requires an original invoice, a reason and lines before creating a credit note', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(screen.getByText(t.facturesAvoir.originRequired)).toBeOnTheScreen());
	expect(screen.getByText(t.facturesAvoir.motifRequired)).toBeOnTheScreen();
	expect(mockAdd).not.toHaveBeenCalled();
});

it('copies the invoice snapshot, locks inherited fields and creates the complete credit with its lines', async () => {
	await setup();
	await selectOrigin();
	await waitFor(() => expect(screen.getByLabelText(t.logistique.fieldFournisseur)).toHaveProp('value', 'Supplier'));
	expect(screen.getByLabelText(t.logistique.fieldFournisseur)).toHaveProp('editable', false);
	expect(screen.getByLabelText(t.logistique.fieldSupplierEmail)).toHaveProp('editable', false);
	await selectReason();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	const data = mockAdd.mock.calls[0][0].data;
	expect(data).toMatchObject({
		facture_origine: 12,
		client: 3,
		fournisseur: 'Supplier',
		fournisseur_email: 'supplier@example.invalid',
		devise: 'EUR',
		mode_paiement: 2,
		motif_avoir: 'remise',
		numero_bon_commande_client: 'BC12',
		remise_type: 'Pourcentage',
		remise: 5,
		lignes: [expect.objectContaining({ article: 4, prix_achat: 80, prix_vente: 60, quantity: 2 })],
	});
	expect(data).not.toHaveProperty('numero_avoir');
	expect(data).not.toHaveProperty('numero_part');
	expect(data).not.toHaveProperty('statut');
	expect(data).not.toHaveProperty('globalError');
	expect(router.replace).toHaveBeenCalledWith({
		pathname: '/facture-avoir/form',
		params: { id: '8', company_id: '5' },
	});
});

it('keeps an inherited archived client visible when it is absent from the client choices', async () => {
	mockClientAvailable = false;
	await setup();
	await selectOrigin();
	await waitFor(() => expect(screen.getByDisplayValue('Client Atlas')).toBeOnTheScreen());
	expect(screen.getByRole('button', { name: t.documentForm.fieldClientLabel })).toBeDisabled();
});

it('accepts prefill parameters from an invoice and normalizes decimal commas when saving', async () => {
	mockParams.facture_origine_id = '12';
	await setup();
	await selectReason();
	await fireEvent.changeText(screen.getByLabelText(t.documentForm.colQuantite), '1,5');
	await fireEvent.changeText(screen.getByLabelText(`${t.documentForm.colPrixUnitaire} (EUR)`), '55,5');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	expect(mockAdd.mock.calls[0][0].data.lignes).toEqual([expect.objectContaining({ quantity: 1.5, prix_vente: 55.5 })]);
});

it('edits a draft before updating its status and then opens its details', async () => {
	mockParams.id = '7';
	await mockDocumentQuery.setResult({ currentData: credit } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande), 'BC-UPDATED');
	await fireEvent.press(screen.getByRole('button', { name: t.facturesAvoir.fieldStatut }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Envoyé' }));
	expect(mockPatch).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockPatch).toHaveBeenCalledWith({ id: 7, data: { statut: 'Envoyé' } }));
	expect(mockEdit).toHaveBeenCalledWith({
		id: 7,
		data: expect.objectContaining({ numero_bon_commande_client: 'BC-UPDATED' }),
	});
	expect(mockEdit.mock.invocationCallOrder[0]).toBeLessThan(mockPatch.mock.invocationCallOrder[0]);
	expect(router.replace).toHaveBeenCalledWith({
		pathname: '/facture-avoir/[id]',
		params: { id: '7', company_id: '5' },
	});
});

it('does not allow an edit to change its original invoice and preserves unsaved values during refetch', async () => {
	mockParams.id = '7';
	await mockDocumentQuery.setResult({ currentData: credit } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande), 'UNSAVED');
	await mockDocumentQuery.setResult({ currentData: { ...credit, numero_bon_commande_client: 'SERVER' } } as never);
	expect(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande)).toHaveProp('value', 'UNSAVED');
	expect(screen.getByRole('button', { name: t.facturesAvoir.selectOrigin })).toBeDisabled();
});

it('locks finalized credit notes and enforces Commercial price and status permissions', async () => {
	mockParams.id = '7';
	mockRole = 'Commercial';
	mockCanChangeStatus = false;
	await mockDocumentQuery.setResult({ currentData: credit } as never);
	await setup();
	expect(screen.getByLabelText(`${t.documentForm.colPrixUnitaire} (EUR)`)).toBeDisabled();
	expect(screen.getByRole('button', { name: t.facturesAvoir.fieldStatut })).toBeDisabled();
	await mockDocumentQuery.setResult({ currentData: { ...credit, statut: 'Accepté' } } as never);
	expect(screen.getByText(t.facturesAvoir.onlyDraftEditable)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.common.save })).toBeDisabled();
	expect(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande)).toHaveProp('editable', false);
});

it('keeps legacy free draft credits editable without allowing new free credit creation', async () => {
	mockParams.id = '7';
	await mockDocumentQuery.setResult({ currentData: { ...credit, facture_origine: null } } as never);
	await setup();
	expect(screen.getByLabelText(t.logistique.fieldFournisseur)).toHaveProp('editable', true);
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockEdit).toHaveBeenCalledTimes(1));
	expect(mockEdit.mock.calls[0][0].data.facture_origine).toBeNull();
});

it('refreshes the suggested number without resetting draft inputs', async () => {
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande), 'KEEP');
	await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
	await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));
	expect(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande)).toHaveProp('value', 'KEEP');
});

it('keeps current draft fields on an invoice-load failure and reports the error', async () => {
	mockLoadOrigin.mockReturnValue({
		unwrap: () => Promise.reject({ data: { message: 'Invoice unavailable' } }),
		abort: mockAbort,
		unsubscribe: mockUnsubscribe,
	});
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande), 'KEEP');
	await selectOrigin();
	await waitFor(() => expect(mockError).toHaveBeenCalledWith('Invoice unavailable'));
	expect(screen.getByLabelText(t.facturesAvoir.fieldNumeroBonCommande)).toHaveProp('value', 'KEEP');
	expect(mockUnsubscribe).toHaveBeenCalled();
});

it('cancels the invoice-prefill subscription when the form is left', async () => {
	let resolve!: (value: typeof mockOrigin) => void;
	const result = new Promise<typeof mockOrigin>((done) => {
		resolve = done;
	});
	mockLoadOrigin.mockReturnValue({ unwrap: () => result, abort: mockAbort, unsubscribe: mockUnsubscribe });
	const view = await setup();
	await selectOrigin();
	await view.unmount();
	expect(mockAbort).toHaveBeenCalled();
	await act(() => resolve(mockOrigin));
	expect(mockError).not.toHaveBeenCalled();
	expect(mockAdd).not.toHaveBeenCalled();
});

it.each(['Lecture', 'Comptable'])('blocks creation for the %s role', async (role) => {
	mockRole = role;
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
});

it('rejects a forged tenant in both edit and original-invoice parameters', async () => {
	mockParams.facture_origine_id = '12';
	mockOriginCompany = 11;
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: t.common.save })).toBeNull();
});
