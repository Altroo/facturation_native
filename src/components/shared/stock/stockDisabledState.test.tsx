import { render, screen } from '@testing-library/react-native';
import StockDisabledState from './stockDisabledState';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('StockDisabledState', () => {
	it.each([false, true])('explains the disabled company setting, inventory=%s', async (inventory) => {
		await render(<StockDisabledState inventory={inventory} />);
		expect(
			screen.getByText(inventory ? translations.fr.stock.inventoryDisabledTitle : translations.fr.stock.disabledTitle),
		).toBeOnTheScreen();
	});
});
