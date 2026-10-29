import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ReglementViewPage from '@/app/(app)/(drawer)/reglements/[id]/index';
import { useGetReglementQuery } from '@/store/services/reglement';
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
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => [{ id: 5, role: mockRole }],
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/reglement', () => ({
	useGetReglementQuery: jest.fn(() => mockQuery.useResult()),
	useDeleteReglementMutation: () => [mockDelete, {}],
}));
let mockParams: { id?: string; company_id?: string };
let mockRole: string;
let mockToken: string | undefined;
const mockDelete = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuery = createQueryMock<ReturnType<typeof useGetReglementQuery>>({} as never);
const payment = {
	id: 9,
	company: 5,
	facture_client: 7,
	facture_client_numero: 'FAC7',
	client: 3,
	client_name: 'Atlas Client',
	mode_reglement: 2,
	mode_reglement_name: 'Virement',
	libelle: 'REF9',
	observations: 'Bank transfer',
	montant: 500,
	devise: 'MAD',
	date_reglement: '2026-10-24',
	date_created: '2026-10-24',
	date_updated: '2026-10-24',
	statut: 'Valide',
	montant_facture: 1200,
	total_reglements_facture: 500,
	reste_a_payer: 700,
};
const t = translations.fr;
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { id: '9', company_id: '5' };
	mockRole = 'Caissier';
	mockToken = 'access';
	await mockQuery.setResult({ currentData: payment, refetch: jest.fn() } as never);
	mockDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
});

describe('ReglementViewPage', () => {
	it('shows invoice financial information, receipt details and company-scoped links without an ID field', async () => {
		await render(<ReglementViewPage />);
		expect(useGetReglementQuery).toHaveBeenCalledWith({ id: 9 }, expect.objectContaining({ skip: false }));
		expect(screen.getByText('1 200,00 MAD')).toBeOnTheScreen();
		expect(screen.getByText('700,00 MAD')).toBeOnTheScreen();
		expect(screen.getByText('Bank transfer')).toBeOnTheScreen();
		expect(screen.queryByText('ID')).toBeNull();
		await fireEvent.press(screen.getByRole('link', { name: 'FAC7' }));
		expect(router.push).toHaveBeenCalledWith({
			pathname: '/facture-client/[id]',
			params: { id: '7', company_id: '5' },
		});
		await fireEvent.press(screen.getByRole('link', { name: 'Atlas Client' }));
		expect(router.push).toHaveBeenLastCalledWith({ pathname: '/clients/[id]', params: { id: '3', company_id: '5' } });
		await fireEvent.press(
			within(screen.getByTestId('details-page-actions')).getByRole('button', { name: t.common.edit }),
		);
		expect(router.push).toHaveBeenLastCalledWith({
			pathname: '/reglements/form',
			params: { id: '9', company_id: '5' },
		});
	});

	it('deletes after the shared confirmation and returns to the payment list', async () => {
		await render(<ReglementViewPage />);
		await fireEvent.press(
			within(screen.getByTestId('details-page-actions')).getByRole('button', { name: t.common.delete }),
		);
		expect(mockDelete).not.toHaveBeenCalled();
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(router.dismissTo).toHaveBeenCalledWith('/reglements'));
		expect(mockDelete).toHaveBeenCalledWith({ id: 9 });
		expect(mockSuccess).toHaveBeenCalledWith(t.reglements.deleteSuccess);
	});

	it('shows a deletion error and stays on the detail', async () => {
		mockDelete.mockReturnValue({ unwrap: () => Promise.reject({ status: 500 }) });
		await render(<ReglementViewPage />);
		await fireEvent.press(
			within(screen.getByTestId('details-page-actions')).getByRole('button', { name: t.common.delete }),
		);
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(mockError).toHaveBeenCalled());
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it.each(['Lecture', 'Commercial', 'Comptable'])('enforces %s view actions', async (role) => {
		mockRole = role;
		await render(<ReglementViewPage />);
		expect(screen.queryByTestId('details-page-actions')).toBeNull();
		if (role === 'Lecture') expect(screen.queryByRole('button', { name: t.reglements.printReceipt })).toBeNull();
		else expect(screen.getByRole('button', { name: t.reglements.printReceipt })).toBeOnTheScreen();
	});

	it('does not offer editing a cancelled payment', async () => {
		await mockQuery.setResult({ currentData: { ...payment, statut: 'Annulé' } } as never);
		await render(<ReglementViewPage />);
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
		expect(screen.getByRole('button', { name: t.common.delete })).toBeOnTheScreen();
	});

	it('does not reveal another company payment even to a member of both companies', async () => {
		await mockQuery.setResult({ currentData: { ...payment, company: 6 } } as never);
		await render(<ReglementViewPage />);
		expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
		expect(screen.queryByText('REF9')).toBeNull();
	});

	it('blocks unauthenticated requests and malformed IDs before reading a payment', async () => {
		mockToken = undefined;
		const view = await render(<ReglementViewPage />);
		expect(useGetReglementQuery).toHaveBeenCalledWith({ id: 9 }, expect.objectContaining({ skip: true }));
		expect(screen.queryByText('REF9')).toBeNull();
		await view.unmount();
		jest.clearAllMocks();
		mockParams.id = '0';
		await render(<ReglementViewPage />);
		expect(screen.getByRole('alert')).toHaveTextContent(t.notFound.message);
		expect(useGetReglementQuery).not.toHaveBeenCalled();
	});

	it('supports retrying failed detail requests', async () => {
		const refetch = jest.fn();
		await mockQuery.setResult({ isError: true, error: { status: 500 }, refetch } as never);
		await render(<ReglementViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});
});
