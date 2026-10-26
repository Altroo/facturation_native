import { stockScreen, resetStockScreen } from '@/__tests__/stockScreenSetup';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Page from '@/app/(app)/(drawer)/stock/movements/[id]/index';
import { useGetStockMovementQuery } from '@/store/services/stock';
import { STOCK_VIEW } from '@/utils/routes';
import { translations } from '@/translations';

beforeEach(resetStockScreen);
it('reads an immutable movement and links back to its company balance', async () => {
	stockScreen.params.id = '21';
	await render(<Page />);
	expect(useGetStockMovementQuery).toHaveBeenCalledWith({ id: 21, company_id: 5 }, expect.anything());
	expect(screen.getByText('-1,250')).toBeOnTheScreen();
	expect(screen.getByText('Service IT')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.stock.viewBalance }));
	expect(router.push).toHaveBeenCalledWith(STOCK_VIEW(11, 5));
	expect(screen.queryByRole('button', { name: translations.fr.common.edit })).toBeNull();
});
it('requires a valid company before reading a movement', async () => {
	stockScreen.params.company_id = '0';
	await render(<Page />);
	expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
	expect(useGetStockMovementQuery).not.toHaveBeenCalled();
});
