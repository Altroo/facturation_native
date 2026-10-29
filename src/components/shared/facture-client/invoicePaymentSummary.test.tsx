import { render, screen } from '@testing-library/react-native';
import InvoicePaymentSummary from './invoicePaymentSummary';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
const t = translations.fr;

describe('InvoicePaymentSummary', () => {
	it('shows server payment totals and the outstanding amount without recalculating them from loaded payments', async () => {
		await render(
			<InvoicePaymentSummary
				document={{
					nombre_paiements: 3,
					total_paye: '1500.25',
					reste_a_payer: '499.75',
					statut_paiement: 'Partiellement payée',
					devise: 'EUR',
				}}
			/>,
		);
		expect(screen.getByText(t.facturesClient.paymentStatusPartial)).toBeOnTheScreen();
		expect(screen.getByText('1 500,25 EUR')).toBeOnTheScreen();
		expect(screen.getByText('499,75 EUR')).toBeOnTheScreen();
		expect(screen.getByText('3')).toBeOnTheScreen();
	});

	it('shows a paid invoice and handles zero remaining balance', async () => {
		await render(
			<InvoicePaymentSummary
				document={{ nombre_paiements: 1, total_paye: 100, reste_a_payer: 0, statut_paiement: 'Payée', devise: 'MAD' }}
				dense
			/>,
		);
		expect(screen.getByText(t.facturesClient.paymentStatusPaid)).toBeOnTheScreen();
		expect(screen.getByText('0,00 MAD')).toBeOnTheScreen();
	});

	it('uses unpaid defaults when an invoice has no payment metadata', async () => {
		await render(<InvoicePaymentSummary document={{ devise: 'MAD' }} />);
		expect(screen.getByText(t.facturesClient.paymentStatusUnpaid)).toBeOnTheScreen();
		expect(screen.getAllByText('0,00 MAD')).toHaveLength(2);
	});
});
