import { render, screen } from '@testing-library/react-native';
import { ReglementClass } from '@/models/classes';
import { translations } from '@/translations';
import ReglementFinancialSummary from './reglementFinancialSummary';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
const t = translations.fr;
const payment = new ReglementClass(
	1,
	7,
	'FAC7',
	3,
	'Atlas',
	2,
	'Virement',
	'',
	500,
	'EUR',
	'2026-10-24',
	'2026-10-24',
	'Valide',
	'2026-10-24',
	'2026-10-24',
	2540390,
	2353460,
	186930,
);

describe('ReglementFinancialSummary', () => {
	it('formats all financial amounts in the invoice currency and keeps edit summary to three balances', async () => {
		await render(<ReglementFinancialSummary payment={payment} />);
		expect(screen.getByText('2 540 390,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('2 353 460,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('186 930,00 EUR')).toHaveProp('className', expect.stringContaining('text-red-600'));
		expect(screen.queryByText(t.reglements.ceReglement)).toBeNull();
	});

	it('includes the current payment on details and marks a cancelled amount as cancelled', async () => {
		await render(
			<ReglementFinancialSummary payment={{ ...payment, statut: 'Annulé', reste_a_payer: 0 }} showPayment />,
		);
		expect(screen.getByText('500,00 EUR')).toHaveProp('className', expect.stringContaining('text-red-600'));
		expect(screen.getByText('0,00 EUR')).toHaveProp('className', expect.not.stringContaining('text-red-600'));
	});
});
