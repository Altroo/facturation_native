import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import CompanyDocumentFormContent from './companyDocumentFormContent';
import { translations } from '@/translations';
import type { CompanyClass } from '@/models/classes';
import type { DocumentData } from '@/types/companyDocumentsTypes';
import {
	AutocompleteDropdownContextProvider,
	toggleAutocomplete,
} from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({
		currentData: [{ id: 3, company: 5, raison_sociale: 'Atlas Client', archived: false }],
	}),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ data: mockArticles }),
	useGetArticlesInfiniteListInfiniteQuery: () => ({
		currentData: { pages: [{ count: 1, results: mockArticles, next: null }] },
	}),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [] }),
	useAddModePaiementMutation: () => [jest.fn(), {}],
	useEditModePaiementMutation: () => [jest.fn(), {}],
	useDeleteModePaiementMutation: () => [jest.fn(), {}],
	useGetCategorieListQuery: () => ({ currentData: [] }),
	useGetEmplacementListQuery: () => ({ currentData: [] }),
	useGetMarqueListQuery: () => ({ currentData: [] }),
	useGetUniteListQuery: () => ({ currentData: [] }),
}));
type Props = ComponentProps<typeof CompanyDocumentFormContent>;
const t = translations.fr;
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockArticles = [
	{
		id: 4,
		reference: 'ART4',
		designation: 'Desk',
		prix_achat: 40,
		prix_vente: 100,
		devise_prix_achat: 'MAD',
		devise_prix_vente: 'MAD',
		tva: 20,
	},
];
const document: DocumentData = {
	id: 7,
	company: 5,
	client: 3,
	client_name: 'Atlas Client',
	statut: 'Brouillon',
	lignes: [],
	date_echeance: null,
	mode_paiement: null,
	mode_paiement_name: null,
	remarque: null,
	date_created: '2026-10-22',
	date_updated: '2026-10-22',
	created_by_user_id: 1,
	created_by_user_name: 'Test User',
	lignes_count: 0,
	remise_type: '',
	remise: 0,
	total_ht: 0,
	total_tva: 0,
	total_ttc: 0,
	total_ttc_apres_remise: 0,
	devise: 'MAD',
};
const props = (): Props => ({
	documentType: 'devis',
	initialNumber: '001/26',
	company: { id: 5, raison_sociale: 'Atlas', uses_foreign_currency: false } as CompanyClass,
	role: 'Caissier',
	canChangeStatus: true,
	mutationLoading: false,
	scrollToLines: false,
	addData: jest.fn(() => ({ unwrap: async () => ({ id: 8 }) })),
	updateData: jest.fn(() => ({ unwrap: async () => undefined })),
	patchStatut: jest.fn(({ data }) => ({ unwrap: async () => data })),
	numberQuery: {
		isError: false,
		refetch: jest.fn(() => ({ unwrap: async () => ({ numero_devis: '002/26', numero_facture: '002/26' }) })),
	},
});
const setup = (data: Props) =>
	render(<CompanyDocumentFormContent {...data} />, { wrapper: AutocompleteDropdownContextProvider });
const selectClient = async () => {
	await toggleAutocomplete(t.documentForm.fieldClientLabel);
	await fireEvent.press(screen.getByRole('radio', { name: 'Atlas Client' }));
};
beforeEach(() => jest.clearAllMocks());

it.each(['devis', 'facture-pro-forma', 'facture-client'] as const)(
	'creates %s with the correct API fields and destination',
	async (documentType) => {
		const data = { ...props(), documentType };
		await setup(data);
		await selectClient();
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(data.addData).toHaveBeenCalledTimes(1));
		expect(data.addData).toHaveBeenCalledWith({
			data: expect.objectContaining({
				[documentType === 'devis' ? 'numero_devis' : 'numero_facture']: '001/26',
				client: 3,
				devise: 'MAD',
			}),
		});
		const payload = jest.mocked(data.addData).mock.calls[0]![0].data;
		expect(payload).not.toHaveProperty('numero_part');
		expect(payload).not.toHaveProperty('globalError');
		expect(payload).not.toHaveProperty('lignes');
		expect(router.replace).toHaveBeenCalledWith({
			pathname: `/${documentType}/form`,
			params: { id: '8', company_id: '5', scrollToLines: 'true' },
		});
	},
);
it('refreshes the document number without erasing unsaved fields', async () => {
	const data = props();
	await setup(data);
	await fireEvent.changeText(screen.getByLabelText(t.devis.fieldNumeroDemandePrix), 'REQ-DRAFT');
	await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
	await waitFor(() => expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('value', '002'));
	expect(screen.getByLabelText(t.devis.fieldNumeroDemandePrix)).toHaveProp('value', 'REQ-DRAFT');
	expect(data.numberQuery.refetch).toHaveBeenCalledTimes(1);
});
it('keeps user edits when a background status refresh supplies a new document object', async () => {
	const rawData = {
		...document,
		numero_demande_prix_client: 'OLD',
	};
	const data = { ...props(), id: 7, rawData };
	const view = await setup(data);
	await fireEvent.changeText(screen.getByLabelText(t.devis.fieldNumeroDemandePrix), 'UNSAVED');
	await view.rerender(<CompanyDocumentFormContent {...data} rawData={{ ...rawData, statut: 'Envoyé' }} />);
	expect(screen.getByLabelText(t.devis.fieldNumeroDemandePrix)).toHaveProp('value', 'UNSAVED');
});
it('requires article lines before updating an existing document', async () => {
	const data = props();
	await setup({
		...data,
		id: 7,
		rawData: document,
	});
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await screen.findByText(t.documentForm.noArticlesError);
	expect(data.updateData).not.toHaveBeenCalled();
});
it('reports a failed creation and preserves the form without navigating', async () => {
	const data = props();
	data.addData = jest.fn(() => ({ unwrap: async () => Promise.reject({ details: 'Cannot create' }) }));
	await setup(data);
	await selectClient();
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(router.replace).not.toHaveBeenCalled();
	expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('value', '001');
});

it('updates an existing article from the picker without duplicating it or resetting its negotiated price', async () => {
	const data = props();
	await setup({
		...data,
		id: 7,
		rawData: {
			...document,
			lignes: [
				{
					id: 1,
					article: 4,
					designation: 'Desk',
					article_designation: 'Desk',
					quantity: 2,
					prix_achat: 40,
					prix_vente: 125,
					devise_prix_achat: 'MAD',
					devise_prix_vente: 'MAD',
					remise_type: 'Pourcentage',
					remise: 5,
				},
			],
		} as DocumentData,
	});
	await fireEvent.press(screen.getByRole('button', { name: t.documentForm.addArticlesBtn }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART4' }));
	await fireEvent.changeText(screen.getByLabelText(`${t.addArticleModal.colQuantite} ART4`), '5');
	await fireEvent.changeText(screen.getByLabelText(`${t.addArticleModal.colRemise} ART4`), '10');
	await fireEvent.press(screen.getByRole('button', { name: t.addArticleModal.addBtn(1) }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(data.updateData).toHaveBeenCalledTimes(1));
	expect(data.updateData).toHaveBeenCalledWith({
		id: 7,
		data: expect.objectContaining({
			lignes: [
				expect.objectContaining({ article: 4, quantity: 5, prix_vente: 125, remise_type: 'Pourcentage', remise: 10 }),
			],
		}),
	});
});
