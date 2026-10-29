import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/movements/index';
import StockList from '@/components/shared/stock/stockList';
import { useGetStockMovementsInfiniteListInfiniteQuery } from '@/store/services/stock';
import { translations } from '@/translations';

beforeEach(resetStockScreen);

describe('StockMovementsPage', () => {
	it('opens company-scoped movements with server controls and the correct write permission', async () => {
		stockScreen.role = 'Commercial';
		await render(<Page />);
		expect(useGetStockMovementsInfiniteListInfiniteQuery).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, search: '', filters: {} }),
			expect.anything(),
		);
		const props = jest.mocked(StockList).mock.calls.at(-1)![0];
		expect(!!props.createAction).toBe(false);
	});

	it('rejects a malformed company parameter without starting the list request', async () => {
		stockScreen.params = { company_id: 'invalid' };
		await render(<Page />);
		expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
		expect(useGetStockMovementsInfiniteListInfiniteQuery).not.toHaveBeenCalled();
	});
});
