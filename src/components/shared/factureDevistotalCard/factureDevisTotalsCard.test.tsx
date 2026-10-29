import { render, screen } from '@testing-library/react-native';
import { translations } from '@/translations';
import FactureDevisTotalsCard from './factureDevisTotalsCard';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

const totals = {
	totalHT: 100,
	totalPrixAchat: 50,
	totalPrixAchatDevise: 'MAD',
	totalTVA: 20,
	totalTTC: 120,
	totalTTCApresRemise: 108,
};

describe('FactureDevisTotalsCard', () => {
	it('keeps purchase currency distinct from document currency', async () => {
		await render(<FactureDevisTotalsCard totals={totals} devise="EUR" />);
		expect(screen.getByText('50,00 MAD')).toBeOnTheScreen();
		expect(screen.getByText('108,00 EUR')).toBeOnTheScreen();
	});

	it('hides purchase and discount summaries for Nectar without leaving empty rows', async () => {
		await render(<FactureDevisTotalsCard totals={totals} showPurchaseTotal={false} showDiscountTotal={false} />);
		expect(screen.queryByText(t.totalsCard.totalPrixAchat)).toBeNull();
		expect(screen.queryByText(t.totalsCard.totalTTCApresRemise)).toBeNull();
		expect(screen.getByText(t.totalsCard.totalTTC)).toBeOnTheScreen();
	});

	it('keeps TTC and TTC after discount visible even when both amounts are equal, like the web', async () => {
		await render(<FactureDevisTotalsCard totals={{ ...totals, totalTTCApresRemise: totals.totalTTC }} />);
		expect(screen.getAllByText('120,00 MAD')).toHaveLength(2);
		expect(screen.getByText(t.totalsCard.totalTTCApresRemise)).toBeOnTheScreen();
		expect(screen.getByText(t.totalsCard.totalTTC)).toBeOnTheScreen();
		expect(screen.getByText(t.totalsCard.totalHT)).toBeOnTheScreen();
		expect(screen.getByText(t.totalsCard.totalTVA)).toBeOnTheScreen();
	});
});
