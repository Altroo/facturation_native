import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import StockSessionCard from './stockSessionCard';
import { stockInventory, stockReceipt } from '@/__tests__/stockFixtures';
import { STOCK_INVENTORY_VIEW, STOCK_RECEIPT_VIEW } from '@/utils/routes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('StockSessionCard', () => {
	it('shows receipt totals and opens the selected company receipt', async () => {
		await render(<StockSessionCard kind="receipt" record={stockReceipt} company_id={5} />);
		expect(screen.getByText('CMD-041')).toBeOnTheScreen();
		expect(screen.getByText('2,500')).toBeOnTheScreen();
		await fireEvent.press(screen.getByTestId('stock-receipt-31'));
		expect(router.push).toHaveBeenCalledWith(STOCK_RECEIPT_VIEW(31, 5));
	});

	it('uses the inventory reference fallback and location', async () => {
		await render(<StockSessionCard kind="inventory" record={{ ...stockInventory, reference: '' }} company_id={5} />);
		expect(screen.getByText('INV-32')).toBeOnTheScreen();
		expect(screen.getByText('Dépôt Casablanca')).toBeOnTheScreen();
		await fireEvent.press(screen.getByTestId('stock-inventory-32'));
		expect(router.push).toHaveBeenCalledWith(STOCK_INVENTORY_VIEW(32, 5));
	});
});
