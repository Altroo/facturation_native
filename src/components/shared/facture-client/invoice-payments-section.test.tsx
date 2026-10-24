import { fireEvent, render, screen } from '@testing-library/react-native';
import InvoicePaymentsSection from './invoice-payments-section';
import { useGetReglementsListQuery } from '@/store/services/reglement';
import { ReglementClass } from '@/models/classes';
import { translations } from '@/translations';
import { router } from 'expo-router';
import { REGLEMENTS_ADD } from '@/utils/routes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
jest.mock('@/store/services/reglement', () => ({ useGetReglementsListQuery: jest.fn(() => mockQuery) }));
const t = translations.fr;
const payment = new ReglementClass(
	1,
	7,
	'INV7/26',
	3,
	'Atlas Client',
	2,
	'Virement',
	'Acompte',
	500,
	'MAD',
	'2026-10-23',
	'2026-10-30',
	'Valide',
	'2026-10-23',
	'2026-10-23',
	1200,
	500,
	700,
	'Bank transfer',
);
let mockQuery: {
	currentData?: ReglementClass[] | { results: ReglementClass[] };
	isLoading: boolean;
	isError: boolean;
	error?: unknown;
	refetch: jest.Mock;
};
beforeEach(() => {
	jest.clearAllMocks();
	mockQuery = { currentData: [payment], isLoading: false, isError: false, refetch: jest.fn() };
});

it('scopes payment history to the current invoice and company', async () => {
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} token="access" canManagePayments={false} />);
	expect(useGetReglementsListQuery).toHaveBeenCalledWith(
		{ company_id: 5, facture_client: 7, with_pagination: false },
		{ skip: false },
	);
	expect(screen.getByText('Acompte')).toBeOnTheScreen();
	expect(screen.getByText('500,00 MAD')).toBeOnTheScreen();
	expect(screen.getByText('Virement')).toBeOnTheScreen();
	expect(screen.getByText('Bank transfer')).toBeOnTheScreen();
});
it('handles an enveloped payment response and cancelled payments', async () => {
	mockQuery.currentData = { results: [{ ...payment, statut: 'Annulé' }] };
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} token="access" canManagePayments={false} />);
	expect(screen.getByText(t.rawData.documentStatuses.cancelled)).toBeOnTheScreen();
});
it('does not fetch payment history without authentication', async () => {
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} canManagePayments={false} />);
	expect(useGetReglementsListQuery).toHaveBeenCalledWith(expect.anything(), { skip: true });
});
it('uses the shared empty state when the invoice has no payments', async () => {
	mockQuery.currentData = [];
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} token="access" canManagePayments={false} />);
	expect(screen.getByText(t.facturesClient.noPayments)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: t.facturesClient.addPayment })).toBeNull();
});
it('opens the payment form with the current invoice and company for authorized managers', async () => {
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} token="access" canManagePayments />);
	const button = screen.getByRole('button', { name: t.facturesClient.addPayment });
	expect(button).toBeEnabled();
	await fireEvent.press(button);
	expect(router.push).toHaveBeenCalledWith(REGLEMENTS_ADD(5, 7));
});
it('blocks payment navigation without a session even if an old permission flag remains', async () => {
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} canManagePayments />);
	const button = screen.getByRole('button', { name: t.facturesClient.addPayment });
	expect(button).toBeDisabled();
	await fireEvent.press(button);
	expect(router.push).not.toHaveBeenCalled();
});
it('shows retry rather than an empty history when the server fails', async () => {
	mockQuery.currentData = [];
	mockQuery.isError = true;
	mockQuery.error = { status: 500 };
	await render(<InvoicePaymentsSection companyId={5} factureClientId={7} token="access" canManagePayments={false} />);
	expect(screen.queryByText(t.facturesClient.noPayments)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(mockQuery.refetch).toHaveBeenCalledTimes(1);
});
