import { render, screen } from '@testing-library/react-native';
import StockStatus from './stockStatus';
import { translations } from '@/translations';

describe('StockStatus', () => {
	it.each([
		['balance', 'disponible', 'availableState'],
		['balance', 'minimum', 'minimumState'],
		['balance', 'a_approvisionner', 'supplyState'],
		['receipt', 'validated', 'validatedReceipt'],
		['inventory', 'validated', 'validated'],
		['receipt', 'cancelled', 'cancelledReceipt'],
		['movement', 'reversal', 'reversal'],
		['movement', 'delivery', 'delivery'],
		['inventory', 'draft', 'draft'],
	] as const)('translates %s status %s', async (kind, value, label) => {
		await render(<StockStatus kind={kind} value={value} />);
		expect(screen.getByText(translations.fr.stock[label])).toBeOnTheScreen();
	});
});
