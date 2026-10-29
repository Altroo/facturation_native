import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import StockSessionActions from './stockSessionActions';
import { stockInventory, stockReceipt } from '@/__tests__/stockFixtures';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/stock', () => ({
	useValidateStockReceiptMutation: () => [mockValidateReceipt, {}],
	useCancelStockReceiptMutation: () => [mockCancelReceipt, {}],
	useValidateInventoryMutation: () => [mockValidateInventory, {}],
}));
const mockValidateReceipt = jest.fn();
const mockCancelReceipt = jest.fn();
const mockValidateInventory = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const t = translations.fr;
beforeEach(() => {
	jest.clearAllMocks();
	mockValidateReceipt.mockReturnValue({ unwrap: async () => stockReceipt });
	mockCancelReceipt.mockReturnValue({ unwrap: async () => stockReceipt });
	mockValidateInventory.mockReturnValue({ unwrap: async () => stockInventory });
});

describe('StockSessionActions', () => {
	it.each(['Caissier', 'Commercial', 'Responsable'])('does not offer receipt validation to %s', async (role) => {
		await render(
			<StockSessionActions record={stockReceipt} kind="receipt" company_id={5} role={role} presentation="bar" />,
		);
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});

	it('validates a receipt only after confirmation and submits the company-scoped command', async () => {
		await render(
			<StockSessionActions record={stockReceipt} kind="receipt" company_id={5} role="Logistique" presentation="bar" />,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.stock.validateReceiptTitle }));
		expect(mockValidateReceipt).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.stock.validate }));
		await waitFor(() => expect(mockValidateReceipt).toHaveBeenCalledWith({ company_id: 5, id: 31 }));
		expect(mockSuccess).toHaveBeenCalledWith(t.stock.receiptValidateSuccess);
	});

	it('offers cancellation for a validated receipt and reports a server refusal without a success toast', async () => {
		mockCancelReceipt.mockReturnValue({
			unwrap: () => Promise.reject({ status: 400, data: { details: 'Stock insuffisant' } }),
		});
		await render(
			<StockSessionActions
				record={{ ...stockReceipt, status: 'validated' }}
				kind="receipt"
				company_id={5}
				role="Logistique"
				presentation="bar"
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.stock.cancelReceiptTitle }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith('Stock insuffisant'));
		expect(mockSuccess).not.toHaveBeenCalled();
	});

	it('validates inventory only for a cashier with inventory enabled', async () => {
		const view = await render(
			<StockSessionActions
				record={stockInventory}
				kind="inventory"
				company_id={5}
				role="Caissier"
				presentation="bar"
			/>,
		);
		expect(screen.queryAllByRole('button')).toHaveLength(0);
		await view.rerender(
			<StockSessionActions
				record={stockInventory}
				kind="inventory"
				company_id={5}
				role="Caissier"
				inventoryEnabled
				presentation="bar"
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.stock.validateInventoryTitle }));
		await fireEvent.press(screen.getByRole('button', { name: t.stock.validate }));
		await waitFor(() => expect(mockValidateInventory).toHaveBeenCalledWith({ company_id: 5, id: 32 }));
		await view.rerender(
			<StockSessionActions
				record={stockInventory}
				kind="inventory"
				company_id={6}
				role="Caissier"
				inventoryEnabled
				presentation="bar"
			/>,
		);
		expect(screen.queryAllByRole('button')).toHaveLength(0);
	});
});
