import { render, screen } from '@testing-library/react-native';
import StockLineCard from './stockLineCard';
import { stockInventory, stockReceipt } from '@/__tests__/stockFixtures';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('StockLineCard', () => {
	it('shows received article, location and quantity without invented fields', async () => {
		await render(<StockLineCard line={stockReceipt.lines[0]!} />);
		expect(screen.getByText('Bureau Atlas')).toBeOnTheScreen();
		expect(screen.getByText('Dépôt Casablanca')).toBeOnTheScreen();
		expect(screen.getByText('2,500')).toBeOnTheScreen();
		expect(screen.queryByText(translations.fr.stock.difference)).toBeNull();
	});

	it('compares expected and counted quantities using the server difference', async () => {
		await render(<StockLineCard line={stockInventory.lines[0]!} />);
		for (const value of ['12,500', '11,000', '-1,500']) expect(screen.getByText(value)).toBeOnTheScreen();
	});
});
