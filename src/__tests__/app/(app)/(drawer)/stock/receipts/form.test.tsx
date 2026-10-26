import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { render, screen } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/stock/receipts/form';
import StockFormContent from '@/components/shared/stock/stockFormContent';
import { translations } from '@/translations';

beforeEach(resetStockScreen);
it('opens the receipt form with validated company parameters', async () => {
	stockScreen.params = { company_id: '5' };
	stockScreen.role = 'Logistique';
	await render(<Page />);
	expect(StockFormContent).toHaveBeenCalledWith(expect.objectContaining({ company_id: 5, kind: 'receipt' }), undefined);
});
it('blocks another role before mounting the form', async () => {
	stockScreen.role = 'Commercial';
	await render(<Page />);
	expect(screen.getByText(translations.fr.noPermission.title)).toBeOnTheScreen();
	expect(StockFormContent).not.toHaveBeenCalled();
});
it('rejects a malformed company before mounting the form', async () => {
	stockScreen.params = { company_id: '0' };
	await render(<Page />);
	expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
	expect(StockFormContent).not.toHaveBeenCalled();
});
