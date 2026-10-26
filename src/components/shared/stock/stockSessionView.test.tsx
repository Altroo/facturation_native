import { render, screen } from '@testing-library/react-native';
import type { CompanyClass } from '@/models/classes';
import StockSessionView from './stockSessionView';
import { stockInventory as mockInventory, stockReceipt } from '@/__tests__/stockFixtures';
import { useGetInventoryQuery, useGetStockReceiptQuery } from '@/store/services/stock';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/store/services/stock', () => ({
	useGetStockReceiptQuery: jest.fn(() => ({ currentData: mockReceipt })),
	useGetInventoryQuery: jest.fn(() => ({ currentData: mockInventory })),
	useValidateStockReceiptMutation: () => [jest.fn(), {}],
	useCancelStockReceiptMutation: () => [jest.fn(), {}],
	useValidateInventoryMutation: () => [jest.fn(), {}],
}));
let mockReceipt = stockReceipt;
const company = { stock_management_enabled: true, inventory_management_enabled: true } as CompanyClass;
beforeEach(() => {
	jest.clearAllMocks();
	mockReceipt = stockReceipt;
});
it('renders receipt fields and lines, with the shared fixed actions for Logistique', async () => {
	await render(<StockSessionView id={31} company_id={5} kind="receipt" role="Logistique" company={company} />);
	expect(useGetStockReceiptQuery).toHaveBeenCalledWith(
		{ company_id: 5, id: 31 },
		expect.objectContaining({ skip: false }),
	);
	expect(useGetInventoryQuery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: true }));
	expect(screen.getByText('CMD-041')).toBeOnTheScreen();
	expect(screen.getByText('Livraison partielle')).toBeOnTheScreen();
	expect(screen.getByTestId('stock-line-51')).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.stock.validateReceiptTitle })).toBeOnTheScreen();
});
it('keeps historical inventory readable after management is disabled and offers no write action', async () => {
	await render(
		<StockSessionView
			id={32}
			company_id={5}
			kind="inventory"
			role="Caissier"
			company={{ ...company, inventory_management_enabled: false } as CompanyClass}
		/>,
	);
	expect(screen.getByText('-1,500')).toBeOnTheScreen();
	expect(screen.queryByTestId('page-action-bar')).toBeNull();
});
it('does not render another company receipt returned by a stale query', async () => {
	mockReceipt = { ...stockReceipt, company: 6 };
	await render(<StockSessionView id={31} company_id={5} kind="receipt" role="Logistique" company={company} />);
	expect(screen.getByText(translations.fr.noPermission.title)).toBeOnTheScreen();
	expect(screen.queryByText('CMD-041')).toBeNull();
});
