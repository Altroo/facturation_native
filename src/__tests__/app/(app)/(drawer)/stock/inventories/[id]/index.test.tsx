import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/inventories/[id]/index';
import StockSessionView from '@/components/shared/stock/stockSessionView';
import { translations } from '@/translations';

beforeEach(resetStockScreen);

describe('StockInventoryPage', () => {
	it('keeps historical inventory readable with its validated identifiers', async () => {
		stockScreen.stockEnabled = false;
		stockScreen.inventoryEnabled = false;
		await render(<Page />);
		expect(StockSessionView).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, id: 11, kind: 'inventory' }),
			undefined,
		);
	});

	it('rejects invalid detail identifiers before fetching or rendering the record', async () => {
		stockScreen.params = { id: 'bad', company_id: '5' };
		await render(<Page />);
		expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
		expect(StockSessionView).not.toHaveBeenCalled();
	});
});
