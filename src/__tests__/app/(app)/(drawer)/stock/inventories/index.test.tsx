import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/inventories/index';
import StockList from '@/components/shared/stock/stockList';
import { useGetInventoriesInfiniteListInfiniteQuery } from '@/store/services/stock';
import { translations } from '@/translations';

beforeEach(resetStockScreen);
it('opens company-scoped inventories with server controls and the correct write permission', async () => {
	stockScreen.role = 'Caissier';
	await render(<Page />);
	expect(useGetInventoriesInfiniteListInfiniteQuery).toHaveBeenCalledWith(
		expect.objectContaining({ company_id: 5, search: '', filters: {} }),
		expect.anything(),
	);
	const props = jest.mocked(StockList).mock.calls.at(-1)![0];
	expect(!!props.createAction).toBe(true);
});
it('rejects a malformed company parameter without starting the list request', async () => {
	stockScreen.params = { company_id: 'invalid' };
	await render(<Page />);
	expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
	expect(useGetInventoriesInfiniteListInfiniteQuery).not.toHaveBeenCalled();
});
