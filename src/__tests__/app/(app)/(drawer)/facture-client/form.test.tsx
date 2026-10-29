import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import FactureClientFormPage from '@/app/(app)/(drawer)/facture-client/form';
import { useGetFactureClientQuery, useGetNumFactureClientQuery } from '@/store/services/factureClient';
import { createQueryMock } from '@/__tests__/setupQuery';
import { translations } from '@/translations';
import { AutocompleteDropdownContextProvider, toggleAutocomplete } from '@/__tests__/setupAutocomplete';

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
jest.mock('@/store/services/reglement', () => ({ useGetReglementsListQuery: () => ({ currentData: [] }) }));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ data: [{ id: 4, reference: 'ART4', tva: 20 }] }),
}));
jest.mock('@/store/services/factureClient', () => ({
	useGetFactureClientQuery: jest.fn(() => mockQuoteQuery.useResult()),
	useGetNumFactureClientQuery: jest.fn(() => mockNumberQuery.useResult()),
	useAddFactureClientMutation: () => [mockAdd, {}],
	useEditFactureClientMutation: () => [mockEdit, {}],
	usePatchStatutMutation: () => [mockPatch, {}],
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
	useAddModePaiementMutation: () => [jest.fn(), {}],
	useEditModePaiementMutation: () => [jest.fn(), {}],
	useDeleteModePaiementMutation: () => [jest.fn(), {}],
}));
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockPatch = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuoteQuery = createQueryMock<ReturnType<typeof useGetFactureClientQuery>>({} as never);
const mockNumberQuery = createQueryMock<ReturnType<typeof useGetNumFactureClientQuery>>({} as never);
const mockReset = jest.fn();
let mockParams: { id?: string; company_id?: string };
let mockRole: string;
let mockCompanyName: string;
let mockCanChangeStatus: boolean;
const t = translations.fr;
const quote = {
	id: 7,
	company: 5,
	numero_facture: '001/26',
	client: 3,
	date_facture: '2026-10-22',
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
const setup = () => render(<FactureClientFormPage />, { wrapper: AutocompleteDropdownContextProvider });
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { company_id: '5' };
	mockRole = 'Caissier';
	mockCompanyName = 'Atlas';
	mockCanChangeStatus = true;
	mockAdd.mockReturnValue({ unwrap: () => Promise.resolve({ id: 8 }) });
	mockEdit.mockReturnValue({ unwrap: () => Promise.resolve(quote) });
	mockPatch.mockReturnValue({ unwrap: () => Promise.resolve({ statut: 'Envoyé' }) });
	mockReset.mockReturnValue({ unwrap: () => Promise.resolve({ numero_facture: '002/26' }) });
	await mockQuoteQuery.setResult({ currentData: undefined } as never);
	await mockNumberQuery.setResult({ currentData: { numero_facture: '001/26' }, refetch: mockReset } as never);
});

describe('FactureClientFormPage', () => {
	it('creates only the header, omits frontend-only fields, then opens editing for article lines', async () => {
		await setup();
		await toggleAutocomplete(t.documentForm.fieldClientLabel);
		await fireEvent.press(screen.getByRole('radio', { name: 'Client Atlas' }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
		const data = mockAdd.mock.calls[0][0].data;
		expect(data).toMatchObject({ numero_facture: '001/26', client: 3, devise: 'MAD' });
		expect(data).not.toHaveProperty('lignes');
		expect(data).not.toHaveProperty('globalError');
		expect(data).not.toHaveProperty('numero_part');
		expect(router.replace).toHaveBeenCalledWith({
			pathname: '/facture-client/form',
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

	it('saves payment terms and the purchase-order number without Devis-only fields', async () => {
		await setup();
		await toggleAutocomplete(t.documentForm.fieldClientLabel);
		await fireEvent.press(screen.getByRole('radio', { name: 'Client Atlas' }));
		await fireEvent.changeText(screen.getByLabelText(t.documentForm.fieldTermesPaiementLabel), '30 jours');
		await fireEvent.changeText(screen.getByLabelText(t.facturesClient.fieldNumeroBonCommande), 'BC-2026');
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
		expect(mockAdd.mock.calls[0][0].data).toMatchObject({
			termes_paiement: '30 jours',
			numero_bon_commande_client: 'BC-2026',
		});
		expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('numero_devis');
		expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('date_devis');
		expect(mockAdd.mock.calls[0][0].data).not.toHaveProperty('numero_demande_prix_client');
	});

	it('locks inherited supplier name and email when the invoice comes from a pro-forma', async () => {
		mockParams.id = '7';
		await mockQuoteQuery.setResult({ currentData: { ...quote, source_proforma: 12 } } as never);
		await setup();
		expect(screen.getByLabelText(t.logistique.fieldFournisseur)).toHaveProp('editable', false);
		expect(screen.getByLabelText(t.logistique.fieldSupplierEmail)).toHaveProp('editable', false);
	});

	it('keeps unsaved inputs when status invalidation refreshes the quote', async () => {
		mockParams.id = '7';
		await mockQuoteQuery.setResult({ currentData: quote } as never);
		await setup();
		await fireEvent.changeText(screen.getByLabelText(t.facturesClient.fieldNumeroBonCommande), 'UNSAVED');
		await fireEvent.press(screen.getByRole('button', { name: t.facturesClient.fieldStatut }));
		await fireEvent.press(screen.getByRole('radio', { name: 'Envoyé' }));
		await waitFor(() => expect(mockPatch).toHaveBeenCalledWith({ id: 7, data: { statut: 'Envoyé' } }));
		await mockQuoteQuery.setResult({ currentData: { ...quote, statut: 'Envoyé' } } as never);
		expect(screen.getByLabelText(t.facturesClient.fieldNumeroBonCommande)).toHaveProp('value', 'UNSAVED');
	});

	it('refreshes the suggested number without erasing draft fields', async () => {
		await setup();
		await fireEvent.changeText(screen.getByLabelText(t.facturesClient.fieldNumeroBonCommande), 'REQ-5');
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
		await waitFor(() => expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('value', '002'));
		expect(screen.getByLabelText(t.facturesClient.fieldNumeroBonCommande)).toHaveProp('value', 'REQ-5');
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
		expect(screen.getByRole('button', { name: t.facturesClient.fieldStatut })).toBeDisabled();
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
});
