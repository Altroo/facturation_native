import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import BonDeLivraisonFormPage from '@/app/(app)/(drawer)/bon-de-livraison/form';
import { useGetBonDeLivraisonQuery, useGetNumBonDeLivraisonQuery } from '@/store/services/bonDeLivraison';
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
	useGetUserCompaniesQuery: () => ({
		currentData: [
			{ id: 5, raison_sociale: mockCompanyName, role: mockRole, can_change_document_status: mockCanChangeStatus },
		],
	}),
	useGetCompanyQuery: () => ({ currentData: { id: 5, raison_sociale: mockCompanyName, uses_foreign_currency: true } }),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({
		currentData: [{ id: 3, company: 5, raison_sociale: 'Client Atlas', archived: false }],
	}),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ data: [{ id: 4, reference: 'ART4', tva: 20 }] }),
}));
jest.mock('@/store/services/bonDeLivraison', () => ({
	useGetBonDeLivraisonQuery: jest.fn(() => mockQuoteQuery.useResult()),
	useGetNumBonDeLivraisonQuery: jest.fn(() => mockNumberQuery.useResult()),
	useAddBonDeLivraisonMutation: () => [mockAdd, {}],
	useEditBonDeLivraisonMutation: () => [mockEdit, {}],
	usePatchBonDeLivraisonStatutMutation: () => [mockPatch, {}],
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
	useAddModePaiementMutation: () => [jest.fn(), {}],
	useEditModePaiementMutation: () => [jest.fn(), {}],
	useDeleteModePaiementMutation: () => [jest.fn(), {}],
	useGetLivreParListQuery: () => ({ currentData: [{ id: 6, nom: 'Atlas livraison' }] }),
	useAddLivreParMutation: () => [jest.fn(), {}],
	useEditLivreParMutation: () => [jest.fn(), {}],
	useDeleteLivreParMutation: () => [jest.fn(), {}],
}));
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockPatch = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuoteQuery = createQueryMock<ReturnType<typeof useGetBonDeLivraisonQuery>>({} as never);
const mockNumberQuery = createQueryMock<ReturnType<typeof useGetNumBonDeLivraisonQuery>>({} as never);
const mockReset = jest.fn();
let mockParams: { id?: string; company_id?: string };
let mockRole: string;
let mockCompanyName: string;
let mockCanChangeStatus: boolean;
const t = translations.fr;
const quote = {
	id: 7,
	company: 5,
	numero_bon_livraison: '001/26',
	client: 3,
	date_bon_livraison: '2026-10-22',
	statut: 'Brouillon',
	devise: 'MAD',
	fournisseur: 'Supplier',
	fournisseur_email: 'supplier@example.invalid',
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
const setup = () => render(<BonDeLivraisonFormPage />, { wrapper: AutocompleteDropdownContextProvider });
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { company_id: '5' };
	mockRole = 'Caissier';
	mockCompanyName = 'Atlas';
	mockCanChangeStatus = true;
	mockAdd.mockReturnValue({ unwrap: () => Promise.resolve({ id: 8 }) });
	mockEdit.mockReturnValue({ unwrap: () => Promise.resolve(quote) });
	mockPatch.mockReturnValue({ unwrap: () => Promise.resolve({ statut: 'Envoyé' }) });
	mockReset.mockReturnValue({ unwrap: () => Promise.resolve({ numero_bon_livraison: '002/26' }) });
	await mockQuoteQuery.setResult({ currentData: undefined } as never);
	await mockNumberQuery.setResult({ currentData: { numero_bon_livraison: '001/26' }, refetch: mockReset } as never);
});

it('creates only the header, omits frontend-only fields, then opens editing for article lines', async () => {
	await setup();
	await toggleAutocomplete(t.documentForm.fieldClientLabel);
	await fireEvent.press(screen.getByRole('radio', { name: 'Client Atlas' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	const data = mockAdd.mock.calls[0][0].data;
	expect(data).toMatchObject({ numero_bon_livraison: '001/26', client: 3, devise: 'MAD' });
	expect(data).not.toHaveProperty('lignes');
	expect(data).not.toHaveProperty('globalError');
	expect(data).not.toHaveProperty('numero_part');
	expect(router.replace).toHaveBeenCalledWith({
		pathname: '/bon-de-livraison/form',
		params: { id: '8', company_id: '5', scrollToLines: 'true' },
	});
});
it('edits and normalizes line decimal commas through the mutation hook', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: quote } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.documentForm.colQuantite), '1,5');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockEdit).toHaveBeenCalled());
	expect(mockEdit).toHaveBeenCalledWith({
		id: 7,
		data: expect.objectContaining({
			fournisseur: 'Supplier',
			fournisseur_email: 'supplier@example.invalid',
			lignes: [expect.objectContaining({ id: 9, article: 4, quantity: 1.5 })],
		}),
	});
});
it('saves the delivery person and purchase-order reference without invoice-only terms', async () => {
	await setup();
	await toggleAutocomplete(t.documentForm.fieldClientLabel);
	await fireEvent.press(screen.getByRole('radio', { name: 'Client Atlas' }));
	await toggleAutocomplete(t.documentForm.livrePar);
	await fireEvent.press(screen.getByRole('radio', { name: 'Atlas livraison' }));
	await fireEvent.changeText(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande), 'BC-2026');
	expect(screen.queryByLabelText(t.documentForm.fieldTermesPaiementLabel)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
	expect(mockAdd.mock.calls[0][0].data).toMatchObject({ livre_par: 6, numero_bon_commande_client: 'BC-2026' });
	expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('termes_paiement');
});
it('keeps an invoice-derived supplier snapshot read-only', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: { ...quote, source_facture_client: 11 } } as never);
	await setup();
	expect(screen.getByLabelText(t.logistique.fieldFournisseur)).toHaveProp('editable', false);
	expect(screen.getByLabelText(t.logistique.fieldSupplierEmail)).toHaveProp('editable', false);
});
it.each(['Accepté', 'Facturé'])(
	'keeps %s delivery lines read-only and omits them when saving header changes',
	async (statut) => {
		mockParams.id = '7';
		await mockQuoteQuery.setResult({ currentData: { ...quote, statut } } as never);
		await setup();
		expect(screen.queryByLabelText(t.documentForm.colQuantite)).toBeNull();
		expect(screen.queryByRole('button', { name: t.documentForm.addArticlesBtn })).toBeNull();
		expect(screen.getByText(t.bonsLivraison.stockPostedLinesHint)).toBeOnTheScreen();
		await fireEvent.changeText(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande), 'BC-UPDATED');
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(mockEdit).toHaveBeenCalled());
		expect(mockEdit.mock.calls[0][0].data).toMatchObject({ numero_bon_commande_client: 'BC-UPDATED' });
		expect(mockEdit.mock.calls[0][0].data).not.toHaveProperty('lignes');
	},
);
it('restores editable lines only after the backend accepts a non-posted status', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: { ...quote, statut: 'Accepté' } } as never);
	mockPatch.mockReturnValue({ unwrap: () => Promise.resolve({ statut: 'Envoyé' }) });
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.bonsLivraison.fieldStatut }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Envoyé' }));
	await waitFor(() => expect(screen.getByLabelText(t.documentForm.colQuantite)).toBeOnTheScreen());
});
it('keeps unsaved inputs when status invalidation refreshes the quote', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: quote } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande), 'UNSAVED');
	await fireEvent.press(screen.getByRole('button', { name: t.bonsLivraison.fieldStatut }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Envoyé' }));
	await waitFor(() => expect(mockPatch).toHaveBeenCalledWith({ id: 7, data: { statut: 'Envoyé' } }));
	await mockQuoteQuery.setResult({ currentData: { ...quote, statut: 'Envoyé' } } as never);
	expect(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande)).toHaveProp('value', 'UNSAVED');
});
it('refreshes the suggested number without erasing draft fields', async () => {
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande), 'REQ-5');
	await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
	await waitFor(() => expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('value', '002'));
	expect(screen.getByLabelText(t.bonsLivraison.fieldNumeroBonCommande)).toHaveProp('value', 'REQ-5');
});
it('requires article lines in edit mode and never sends an empty edit', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: { ...quote, lignes: [] } } as never);
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(screen.getByText(t.documentForm.noArticlesError)).toBeOnTheScreen());
	expect(mockEdit).not.toHaveBeenCalled();
});
it('enforces membership status permissions and locks Commercial unit prices', async () => {
	mockParams.id = '7';
	mockRole = 'Commercial';
	mockCanChangeStatus = false;
	await mockQuoteQuery.setResult({ currentData: quote } as never);
	await setup();
	expect(screen.getByRole('button', { name: t.bonsLivraison.fieldStatut })).toBeDisabled();
	expect(screen.getByLabelText(`${t.documentForm.colPrixUnitaire} (MAD)`)).toBeDisabled();
});
it('rejects an edit whose company does not match the URL tenant', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: { ...quote, company: 11 } } as never);
	await setup();
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByLabelText(t.documentForm.fieldNumeroLabel)).toBeNull();
});
it('preserves Nectar fields, hides discounts and clears unsupported values in the payload', async () => {
	mockParams.id = '7';
	mockCompanyName = jest.requireActual('@/utils/rawData').NECTAR_RAISON_SOCIALE;
	await mockQuoteQuery.setResult({
		currentData: { ...quote, remise_type: 'Pourcentage', remise: 10, remarque: 'Old' },
	} as never);
	await setup();
	expect(screen.queryByText(t.documentForm.remarqueSection)).toBeNull();
	expect(screen.queryByText(t.documentForm.remiseGlobaleSection)).toBeNull();
	expect(screen.getByRole('button', { name: t.documentForm.fieldDateEcheanceLabel })).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() =>
		expect(mockEdit).toHaveBeenCalledWith({
			id: 7,
			data: expect.objectContaining({ remarque: null, remise_type: '', remise: 0 }),
		}),
	);
});

it('requires saving changed lines before booking stock through a status change', async () => {
	mockParams.id = '7';
	await mockQuoteQuery.setResult({ currentData: quote } as never);
	await setup();
	await fireEvent.changeText(screen.getByLabelText(t.documentForm.colQuantite), '3');
	await fireEvent.press(screen.getByRole('button', { name: t.bonsLivraison.fieldStatut }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Accepté' }));
	expect(mockPatch).not.toHaveBeenCalled();
	expect(mockError).toHaveBeenCalledWith(t.bonsLivraison.saveLinesBeforePosting);
});
