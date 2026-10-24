import type { ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import CompanyDocumentViewContent from './companyDocumentsWrapperView';
import { useGetArticlesListQuery } from '@/store/services/article';
import { translations } from '@/translations';
import type { DocumentData } from '@/types/companyDocumentsTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), dismissTo: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => [{ id: 5, role: mockRole, raison_sociale: 'Atlas' }],
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: jest.fn(() => ({ currentData: [] })),
}));
type Props = ComponentProps<typeof CompanyDocumentViewContent>;
const t = translations.fr;
const mockSuccess = jest.fn();
const mockError = jest.fn();
let mockRole = 'Caissier';
const document: DocumentData = {
	id: 7,
	company: 5,
	numero_devis: 'DEV7/26',
	numero_facture: 'PRO7/26',
	date_devis: '2026-10-22',
	date_facture: '2026-10-22',
	statut: 'Envoyé',
	client_name: 'Atlas Client',
	client: 3,
	date_echeance: null,
	mode_paiement: 2,
	date_created: '2026-10-22',
	date_updated: '2026-10-22',
	created_by_user_id: 1,
	created_by_user_name: 'Test User',
	lignes_count: 0,
	remise_type: '',
	remise: 0,
	fournisseur: 'Supplier',
	fournisseur_email: 'supplier@example.invalid',
	numero_demande_prix_client: 'REQ-7',
	numero_bon_commande_client: 'ORDER-7',
	mode_paiement_name: 'Virement',
	total_ht: 100,
	total_tva: 20,
	total_ttc: 120,
	total_ttc_apres_remise: 120,
	devise: 'MAD',
	lignes: [],
	remarque: 'Deliver Monday',
};
const props = (): Props => ({
	id: 7,
	company_id: 5,
	documentType: 'devis',
	query: { currentData: document, isError: false, isFetching: false, refetch: jest.fn() },
	deleteRecord: jest.fn(() => ({ unwrap: async () => undefined })),
	deleting: false,
	openPdf: jest.fn(async () => true),
});
beforeEach(() => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
});

it.each(['devis', 'facture-pro-forma', 'facture-client'] as const)(
	'renders and edits %s using the matching route and fields',
	async (documentType) => {
		await render(<CompanyDocumentViewContent {...props()} documentType={documentType} />);
		expect(screen.getByText(documentType === 'devis' ? 'DEV7/26' : 'PRO7/26')).toBeOnTheScreen();
		expect(screen.getByText(documentType === 'devis' ? 'REQ-7' : 'ORDER-7')).toBeOnTheScreen();
		expect(screen.getByText('Atlas Client')).toBeOnTheScreen();
		expect(screen.getByText('Deliver Monday')).toBeOnTheScreen();
		expect(screen.getAllByText('120,00 MAD').length).toBeGreaterThan(0);
		await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
		expect(router.push).toHaveBeenCalledWith({
			pathname: `/${documentType}/form`,
			params: { id: '7', company_id: '5' },
		});
	},
);
it.each(['Lecture', 'Comptable', 'Commercial'])('applies the shared detail permissions for %s', async (role) => {
	mockRole = role;
	await render(<CompanyDocumentViewContent {...props()} />);
	expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	expect(!!screen.queryByRole('button', { name: t.common.edit })).toBe(role === 'Commercial');
	expect(!!screen.queryByRole('button', { name: t.common.print })).toBe(role !== 'Lecture');
});
it('rejects a document belonging to another company without requesting its articles', async () => {
	const data = props();
	await render(
		<CompanyDocumentViewContent {...data} query={{ ...data.query, currentData: { ...document, company: 11 } }} />,
	);
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
	expect(useGetArticlesListQuery).toHaveBeenLastCalledWith(expect.anything(), { skip: true });
});
it('requires confirmation before deleting and navigates only after success', async () => {
	const data = props();
	await render(<CompanyDocumentViewContent {...data} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	expect(data.deleteRecord).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(data.deleteRecord).toHaveBeenCalledWith({ id: 7 }));
	expect(router.dismissTo).toHaveBeenCalledWith('/devis');
});
it('keeps the document open and reports a failed deletion', async () => {
	const data = props();
	data.deleteRecord = jest.fn(() => ({ unwrap: async () => Promise.reject({ details: 'Cannot delete' }) }));
	await render(<CompanyDocumentViewContent {...data} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(router.dismissTo).not.toHaveBeenCalled();
});
it('offers retry when the document query fails', async () => {
	const data = props();
	await render(
		<CompanyDocumentViewContent
			{...data}
			query={{ ...data.query, currentData: undefined, isError: true, error: { status: 500 } }}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(data.query.refetch).toHaveBeenCalledTimes(1);
});
