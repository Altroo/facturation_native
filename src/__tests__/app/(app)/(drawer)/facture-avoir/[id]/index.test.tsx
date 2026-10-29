import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import FactureAvoirViewPage from '@/app/(app)/(drawer)/facture-avoir/[id]/index';
import { useGetFactureAvoirQuery } from '@/store/services/factureAvoir';
import { createQueryMock } from '@/__tests__/setupQuery';
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
	useAppSelector: () => [{ id: 5, role: mockRole, raison_sociale: 'Atlas' }],
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/factureAvoir', () => ({
	useGetFactureAvoirQuery: jest.fn(() => mockQuery.useResult()),
	useDeleteFactureAvoirMutation: () => [mockRemove, {}],
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesListQuery: () => ({ currentData: [{ id: 4, reference: 'ART4', tva: 20 }] }),
}));
let mockParams: { id?: string; company_id?: string };
let mockRole: string;
const mockRemove = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuery = createQueryMock<ReturnType<typeof useGetFactureAvoirQuery>>({} as never);
const t = translations.fr;
const quote = {
	id: 7,
	company: 5,
	numero_avoir: '001/26',
	client_name: 'Atlas Client',
	date_avoir: '2026-10-22',
	statut: 'Brouillon',
	facture_origine: 12,
	facture_origine_numero: 'FAC12/26',
	motif_avoir: 'retour_marchandise',
	motif_avoir_label: 'Retour marchandise',
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
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { id: '7', company_id: '5' };
	mockRole = 'Caissier';
	mockRemove.mockReturnValue({ unwrap: () => Promise.resolve() });
	await mockQuery.setResult({ currentData: quote, refetch: jest.fn() } as never);
});

describe('FactureAvoirViewPage', () => {
	it('shows server totals, document fields and shared compact line/detail cards', async () => {
		await render(<FactureAvoirViewPage />);
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
		expect(screen.getByText(t.totalsCard.totalTTC)).toBeOnTheScreen();
		expect(screen.getByText(t.totalsCard.totalTTCApresRemise)).toBeOnTheScreen();
		expect(screen.getByText('1 000,00 MAD')).toBeOnTheScreen();
		expect(within(screen.getByTestId('details-page')).queryByRole('button', { name: t.common.edit })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/facture-avoir/form',
			params: { id: '7', company_id: '5' },
		});
	});

	it.each(['Lecture', 'Comptable', 'Commercial'])('honors detail/write/print permissions for %s', async (role) => {
		mockRole = role;
		await render(<FactureAvoirViewPage />);
		expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
		expect(!!screen.queryByRole('button', { name: t.common.edit })).toBe(role === 'Commercial');
		expect(!!screen.queryByRole('button', { name: t.common.print })).toBe(role !== 'Lecture');
	});

	it('confirms deletion before mutating and only returns after success', async () => {
		await render(<FactureAvoirViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		expect(mockRemove).not.toHaveBeenCalled();
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(mockRemove).toHaveBeenCalledWith({ id: 7 }));
		expect(router.dismissTo).toHaveBeenCalledWith('/facture-avoir');
	});

	it('reports deletion failure without leaving the document', async () => {
		mockRemove.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'In use' } }) });
		await render(<FactureAvoirViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith('In use'));
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('does not reveal another company document through a forged company parameter', async () => {
		await mockQuery.setResult({ currentData: { ...quote, company: 11 } } as never);
		await render(<FactureAvoirViewPage />);
		expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
		expect(screen.queryByText('001/26')).toBeNull();
	});

	it('hides editing on a finalized credit note and links the original invoice', async () => {
		await mockQuery.setResult({ currentData: { ...quote, statut: 'Accepté' } } as never);
		await render(<FactureAvoirViewPage />);
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
		expect(screen.getByText('Retour marchandise')).toBeOnTheScreen();
		await fireEvent.press(screen.getByText('FAC12/26'));
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/facture-client/[id]',
			params: { id: '12', company_id: '5' },
		});
	});
});
