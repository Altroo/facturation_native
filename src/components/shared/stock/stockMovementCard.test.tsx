import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import StockMovementCard from './stockMovementCard';
import { stockMovement } from '@/__tests__/stockFixtures';
import { STOCK_MOVEMENT_VIEW } from '@/utils/routes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

it('keeps the signed movement and source visible and opens its company-scoped detail', async () => {
	await render(<StockMovementCard movement={stockMovement} company_id={5} />);
	expect(screen.getByText('-1,250')).toBeOnTheScreen();
	expect(screen.getByText(stockMovement.note)).toBeOnTheScreen();
	await fireEvent.press(screen.getByTestId('stock-movement-21'));
	expect(router.push).toHaveBeenCalledWith(STOCK_MOVEMENT_VIEW(21, 5));
});
