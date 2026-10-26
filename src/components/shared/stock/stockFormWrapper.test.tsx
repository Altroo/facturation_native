import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import StockFormWrapper from './stockFormWrapper';
import { useGetCompanyQuery } from '@/store/services/company';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: () => ({ currentData: mockMemberships }),
	useGetCompanyQuery: jest.fn(() => ({ currentData: mockCompany })),
}));
let mockMemberships: { id: number; role: string }[];
let mockCompany: { id: number; stock_management_enabled: boolean; inventory_management_enabled: boolean };
beforeEach(() => {
	jest.clearAllMocks();
	mockMemberships = [{ id: 5, role: 'Caissier' }];
	mockCompany = { id: 5, stock_management_enabled: true, inventory_management_enabled: true };
});
it('does not render write forms for an unauthorized role or another company', async () => {
	const child = jest.fn(() => <Text>Write form</Text>);
	const view = await render(
		<StockFormWrapper company_id={5} allowedRoles={['Logistique']}>
			{child}
		</StockFormWrapper>,
	);
	expect(screen.getByText(translations.fr.noPermission.title)).toBeOnTheScreen();
	expect(child).not.toHaveBeenCalled();
	await view.rerender(<StockFormWrapper company_id={6}>{child}</StockFormWrapper>);
	expect(child).not.toHaveBeenCalled();
	expect(useGetCompanyQuery).toHaveBeenLastCalledWith({ id: 6 }, { skip: true });
});
it('blocks disabled stock/inventory writes but still renders historical reads', async () => {
	mockCompany.stock_management_enabled = false;
	const child = jest.fn(() => <Text>History</Text>);
	const view = await render(<StockFormWrapper company_id={5}>{child}</StockFormWrapper>);
	expect(screen.getByText(translations.fr.stock.disabledTitle)).toBeOnTheScreen();
	expect(child).not.toHaveBeenCalled();
	await view.rerender(
		<StockFormWrapper company_id={5} requireStock={false}>
			{child}
		</StockFormWrapper>,
	);
	expect(screen.getByText('History')).toBeOnTheScreen();
	mockCompany.stock_management_enabled = true;
	mockCompany.inventory_management_enabled = false;
	await view.rerender(
		<StockFormWrapper company_id={5} requireInventory>
			{child}
		</StockFormWrapper>,
	);
	expect(screen.getByText(translations.fr.stock.inventoryDisabledTitle)).toBeOnTheScreen();
});
