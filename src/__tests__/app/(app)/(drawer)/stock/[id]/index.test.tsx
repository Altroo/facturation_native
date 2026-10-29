import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/[id]/index';
import { useGetStockBalanceQuery, useGetStockMovementsInfiniteListInfiniteQuery } from '@/store/services/stock';
import { translations } from '@/translations';

beforeEach(resetStockScreen);

describe('StockViewPage', () => {
	it('shows authoritative quantities and requests article history in the same company', async () => {
		await render(<Page />);
		expect(useGetStockBalanceQuery).toHaveBeenCalledWith({ id: 11, company_id: 5 }, expect.anything());
		expect(useGetStockMovementsInfiniteListInfiniteQuery).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, article_id: 7 }),
			expect.objectContaining({ skip: false }),
		);
		expect(screen.getByText('13,500')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: translations.fr.stock.adjust })).toBeOnTheScreen();
	});

	it('keeps history readable without offering adjustment when stock is disabled', async () => {
		stockScreen.stockEnabled = false;
		await render(<Page />);
		expect(screen.getAllByText('ART-007').length).toBeGreaterThan(0);
		expect(screen.queryByRole('button', { name: translations.fr.stock.adjust })).toBeNull();
	});

	it('rejects an invalid balance identifier before requests', async () => {
		stockScreen.params.id = '-1';
		await render(<Page />);
		expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
		expect(useGetStockBalanceQuery).not.toHaveBeenCalled();
	});
});
