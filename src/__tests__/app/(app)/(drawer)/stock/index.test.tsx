import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/index';
import StockList from '@/components/shared/stock/stockList';
import { useGetStockBalancesInfiniteListInfiniteQuery } from '@/store/services/stock';
import { translations } from '@/translations';

beforeEach(resetStockScreen);
it('opens company-scoped balances with server controls and the correct write permission', async () => {
	stockScreen.role = 'Caissier';
	await render(<Page />);
	expect(useGetStockBalancesInfiniteListInfiniteQuery).toHaveBeenCalledWith(
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
	expect(useGetStockBalancesInfiniteListInfiniteQuery).not.toHaveBeenCalled();
});
it('explains disabled stock before starting balance requests', async () => {
	stockScreen.stockEnabled = false;
	await render(<Page />);
	expect(screen.getByText(translations.fr.stock.disabledTitle)).toBeOnTheScreen();
	expect(screen.getByText('Company tabs')).toBeOnTheScreen();
	expect(useGetStockBalancesInfiniteListInfiniteQuery).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ skip: true }),
	);
	expect(StockList).not.toHaveBeenCalled();
});
