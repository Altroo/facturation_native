import type { ReactNode } from 'react';
import {
	stockBalance as mockBalance,
	stockInventory as mockInventory,
	stockMovement as mockMovement,
	stockReceipt as mockReceipt,
} from './stockFixtures';

const mockStockScreen = {
	params: {} as { id?: string; company_id?: string; balance_id?: string },
	role: 'Caissier',
	stockEnabled: true,
	inventoryEnabled: true,
};
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockStockScreen.params, router: { push: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { Text } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: ({ children }: { children: (args: { company_id: number; role: string; tabs: ReactNode }) => ReactNode }) =>
			children({ company_id: 5, role: mockStockScreen.role, tabs: <Text>Company tabs</Text> }),
	};
});
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: () => ({ currentData: [{ id: 5, role: mockStockScreen.role }] }),
	useGetCompanyQuery: () => ({
		currentData: {
			id: 5,
			stock_management_enabled: mockStockScreen.stockEnabled,
			inventory_management_enabled: mockStockScreen.inventoryEnabled,
		},
	}),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetEmplacementListQuery: () => ({ currentData: [{ id: 2, nom: 'Dépôt Casablanca' }] }),
}));
jest.mock('@/store/services/stock', () => ({
	useGetStockBalancesInfiniteListInfiniteQuery: jest.fn(() => mockStockQuery(mockBalance)),
	useGetStockMovementsInfiniteListInfiniteQuery: jest.fn(() => mockStockQuery(mockMovement)),
	useGetStockReceiptsInfiniteListInfiniteQuery: jest.fn(() => mockStockQuery(mockReceipt)),
	useGetInventoriesInfiniteListInfiniteQuery: jest.fn(() => mockStockQuery(mockInventory)),
	useGetStockBalanceQuery: jest.fn(() => ({ currentData: mockBalance })),
	useGetStockMovementQuery: jest.fn(() => ({ currentData: mockMovement })),
	useGetStockReceiptQuery: jest.fn(() => ({ currentData: mockReceipt })),
	useGetInventoryQuery: jest.fn(() => ({ currentData: mockInventory })),
	useValidateStockReceiptMutation: () => [jest.fn(), {}],
	useCancelStockReceiptMutation: () => [jest.fn(), {}],
	useValidateInventoryMutation: () => [jest.fn(), {}],
}));
jest.mock('@/components/shared/stock/stockList', () => ({
	...jest.requireActual('@/components/shared/stock/stockList'),
	__esModule: true,
	default: jest.fn(() => null),
}));
jest.mock('@/components/shared/stock/stockFormContent', () => ({ __esModule: true, default: jest.fn(() => null) }));
jest.mock('@/components/shared/stock/stockSessionView', () => ({ __esModule: true, default: jest.fn(() => null) }));

// Route tests check arguments and guards here; shared component tests exercise
// the real controls, queries, validation and write/recovery workflows.
const mockStockQuery = <T,>(row: T) => ({
	currentData: { pages: [{ count: 1, next: null, previous: null, results: [row] }] },
	isFetching: false,
	isLoading: false,
	isError: false,
});
export { mockStockScreen as stockScreen };
export const resetStockScreen = () => {
	jest.clearAllMocks();
	mockStockScreen.params = { company_id: '5', id: '11' };
	mockStockScreen.role = 'Caissier';
	mockStockScreen.stockEnabled = true;
	mockStockScreen.inventoryEnabled = true;
};
