import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import StockBalanceCard from './stockBalanceCard';
import { stockBalance } from '@/__tests__/stockFixtures';
import { STOCK_ADD, STOCK_VIEW } from '@/utils/routes';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
	'@react-native/jest-preset/jest/MockNativeMethods',
).default;
beforeEach(() => {
	jest.clearAllMocks();
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 180, 44, 44));
});

describe('StockBalanceCard', () => {
	it('opens the balance and only offers adjustment to an authorized cashier', async () => {
		const view = await render(<StockBalanceCard balance={stockBalance} company_id={5} canAdjust={false} />);
		await fireEvent.press(screen.getByTestId('stock-balance-11'));
		expect(router.push).toHaveBeenCalledWith(STOCK_VIEW(11, 5));
		expect(screen.queryByRole('button', { name: translations.fr.common.moreActions })).toBeNull();
		await view.rerender(<StockBalanceCard balance={stockBalance} company_id={5} canAdjust />);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.moreActions }));
		const menu = screen.getByTestId('custom-menu');
		await fireEvent.press(screen.getByRole('menuitem', { name: translations.fr.stock.adjust }));
		await act(() => menu.props.onDismiss());
		expect(router.push).toHaveBeenLastCalledWith(STOCK_ADD(5, 11));
	});
});
