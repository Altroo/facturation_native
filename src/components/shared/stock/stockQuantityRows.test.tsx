import { render, screen } from '@testing-library/react-native';
import StockQuantityRows from './stockQuantityRows';
import { stockBalance } from '@/__tests__/stockFixtures';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('StockQuantityRows', () => {
	it('shows all six server quantities with three decimals, including incoming and projected', async () => {
		await render(<StockQuantityRows balance={stockBalance} />);
		for (const label of ['physical', 'reserved', 'available', 'incoming', 'projected', 'minimum'] as const)
			expect(screen.getByText(translations.fr.stock[label])).toBeOnTheScreen();
		for (const value of ['12,500', '3,000', '9,500', '4,000', '13,500', '5,000'])
			expect(screen.getByText(value)).toBeOnTheScreen();
	});
});
