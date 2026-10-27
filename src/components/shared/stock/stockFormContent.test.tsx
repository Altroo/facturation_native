import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import StockFormContent from './stockFormContent';
import { stockBalance as mockStockBalance } from '@/__tests__/stockFixtures';
import { translations } from '@/translations';
import { STOCK_INVENTORY_VIEW, STOCK_RECEIPT_VIEW } from '@/utils/routes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import {
	AutocompleteDropdownContextProvider,
	toggleAutocomplete,
	flushAutocomplete,
} from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticlesInfiniteListInfiniteQuery: (...args: unknown[]) => mockArticlesQuery(...args),
	useGetArticleQuery: () => ({ currentData: mockArticle }),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetEmplacementListQuery: () => ({ currentData: [{ id: 2, nom: 'Dépôt Casablanca' }] }),
}));
jest.mock('@/store/services/logistique', () => ({
	useGetLogistiqueListQuery: () => ({
		currentData: { results: [mockOrder, { ...mockOrder, id: 42, statut: 'Clôture', numero_commande: 'EXCLU' }] },
	}),
	useGetLogistiqueQuery: () => ({ currentData: mockOrder }),
}));
jest.mock('@/store/services/stock', () => ({
	useGetStockBalanceQuery: () => ({ currentData: mockStockBalance }),
	useCreateStockAdjustmentMutation: () => [mockAdjust, {}],
	useCreateStockReceiptMutation: () => [mockCreateReceipt, {}],
	useValidateStockReceiptMutation: () => [mockValidateReceipt, {}],
	useCreateInventoryMutation: () => [mockCreateInventory, {}],
	useValidateInventoryMutation: () => [mockValidateInventory, {}],
}));
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockArticlesQuery = jest.fn();
const mockFetchNextPage = jest.fn();
const mockArticle = {
	id: 7,
	company: 5,
	reference: 'ART-007',
	designation: 'Bureau Atlas',
	type_article: 'Produit',
	emplacement: 2,
};
const mockArticlePage = {
	currentData: {
		pages: [
			{
				results: [mockArticle, { id: 8, reference: 'SERVICE', designation: 'Service exclu', type_article: 'Service' }],
			},
		],
	},
	hasNextPage: true,
	isFetching: false,
	isLoading: false,
	fetchNextPage: mockFetchNextPage,
};
const mockAdjust = jest.fn();
const mockCreateReceipt = jest.fn();
const mockValidateReceipt = jest.fn();
const mockCreateInventory = jest.fn();
const mockValidateInventory = jest.fn();
const mockOrder = {
	id: 41,
	company: 5,
	numero_commande: 'CMD-041',
	fournisseur: 'Fournisseur Atlas',
	statut_commande_lancement: 'Terminée',
	statut_global: 'En cours',
	statut: 'Acheminement',
	lignes: [
		{
			id: 61,
			article: 7,
			article_reference: 'ART-007',
			designation: 'Bureau Atlas',
			type_article: 'Produit',
			incoming_active: true,
			remaining_quantity: '2.500',
			expected_emplacement: 2,
		},
	],
};
const t = translations.fr;
const setup = (kind: 'adjustment' | 'receipt' | 'inventory') =>
	render(<StockFormContent company_id={5} kind={kind} balance_id={kind === 'adjustment' ? 11 : undefined} />, {
		wrapper: AutocompleteDropdownContextProvider,
	});
const submit = () =>
	fireEvent.press(within(screen.getByTestId('page-action-bar')).getByRole('button', { name: t.common.save }));
const select = async (label: string, option: RegExp) => {
	await toggleAutocomplete(label);
	await fireEvent.press(screen.getByRole('radio', { name: option }));
};
beforeEach(() => {
	jest.clearAllMocks();
	mockArticlesQuery.mockReturnValue(mockArticlePage);
	mockAdjust.mockReturnValue({ unwrap: async () => ({ id: 21 }) });
	mockCreateReceipt.mockReturnValue({ unwrap: async () => ({ id: 31 }) });
	mockValidateReceipt.mockReturnValue({ unwrap: async () => ({ id: 31 }) });
	mockCreateInventory.mockReturnValue({ unwrap: async () => ({ id: 32 }) });
	mockValidateInventory.mockReturnValue({ unwrap: async () => ({ id: 32 }) });
});
it('searches products on the server without replacing the form with a loading screen', async () => {
	const view = await setup('inventory');
	await toggleAutocomplete(t.stock.article);
	await fireEvent.changeText(screen.getByRole('combobox', { name: t.stock.article }), 'Bureau');
	await flushAutocomplete();
	expect(mockArticlesQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({
			company_id: 5,
			archived: false,
			type_article: 'Produit',
			search: 'Bureau',
			pageSize: MODULES_PAGE_SIZE,
		}),
		{ skip: false },
	);
	mockArticlesQuery.mockReturnValue({ ...mockArticlePage, currentData: undefined, isFetching: true, isLoading: true });
	await view.rerender(<StockFormContent company_id={5} kind="inventory" />);
	expect(screen.getByRole('combobox', { name: t.stock.article })).toHaveProp('value', 'Bureau');
	expect(screen.getAllByLabelText(t.common.loading).length).toBeGreaterThan(0);
});
it('loads the next article page when suggestions reach the end, and prevents duplicate loading', async () => {
	const view = await setup('inventory');
	await toggleAutocomplete(t.stock.article);
	mockFetchNextPage.mockClear();
	await fireEvent(screen.getByTestId('article-suggestions'), 'endReached');
	expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
	mockArticlesQuery.mockReturnValue({ ...mockArticlePage, isFetching: true });
	await view.rerender(<StockFormContent company_id={5} kind="inventory" />);
	await flushAutocomplete();
	await fireEvent(screen.getByTestId('article-suggestions'), 'endReached');
	expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
});
it('prefills and saves a balance whose article is not on the first suggestions page', async () => {
	mockArticlesQuery.mockReturnValue({ ...mockArticlePage, currentData: { pages: [{ results: [] }] } });
	await setup('adjustment');
	expect(screen.getByDisplayValue('ART-007 - Bureau Atlas')).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.stock.signedQuantity), '1');
	await fireEvent.changeText(screen.getByLabelText(t.stock.reason), 'Comptage');
	await submit();
	await waitFor(() => expect(mockAdjust).toHaveBeenCalledWith(expect.objectContaining({ article: 7, quantity: 1 })));
});
it('keeps a selected search result when the suggestions return to the first page', async () => {
	const searchedArticle = { ...mockArticle, id: 99, reference: 'ART-099', designation: 'Chaise Atlas' };
	mockArticlesQuery.mockReturnValue({ ...mockArticlePage, currentData: { pages: [{ results: [searchedArticle] }] } });
	const view = await setup('inventory');
	await select(t.stock.article, /ART-099/);
	mockArticlesQuery.mockReturnValue(mockArticlePage);
	await view.rerender(<StockFormContent company_id={5} kind="inventory" />);
	expect(screen.getByDisplayValue('ART-099 - Chaise Atlas')).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.stock.countedQuantity), '2');
	await submit();
	await waitFor(() =>
		expect(mockCreateInventory).toHaveBeenCalledWith(
			expect.objectContaining({ lines: [{ article: 99, counted_quantity: 2 }] }),
		),
	);
});
it('prefills an adjustment, excludes services and sends a negative quantity with its required reason', async () => {
	await setup('adjustment');
	expect(screen.getByDisplayValue('ART-007 - Bureau Atlas')).toBeOnTheScreen();
	await toggleAutocomplete(t.stock.article);
	expect(screen.queryByText('SERVICE - Service exclu')).toBeNull();
	await fireEvent.press(screen.getByRole('radio', { name: /ART-007/ }));
	await fireEvent.changeText(screen.getByLabelText(t.stock.signedQuantity), '-1,250');
	await fireEvent.changeText(screen.getByLabelText(t.stock.reason), 'Correction');
	await submit();
	await waitFor(() =>
		expect(mockAdjust).toHaveBeenCalledWith({
			company_id: 5,
			article: 7,
			emplacement: 2,
			movement_type: 'adjustment',
			quantity: -1.25,
			reason: 'Correction',
		}),
	);
	expect(router.back).toHaveBeenCalledTimes(1);
});
it('requires nonzero quantity and a reason before creating an adjustment', async () => {
	await setup('adjustment');
	await fireEvent.changeText(screen.getByLabelText(t.stock.signedQuantity), '0');
	await submit();
	expect(mockError).toHaveBeenCalledWith(t.common.correctErrors);
	expect(mockAdjust).not.toHaveBeenCalled();
});
it('creates then validates a receipt from an eligible order and auto-selects the expected location', async () => {
	await setup('receipt');
	await select(t.stock.logisticsOrder, /CMD-041/);
	await select(t.stock.incomingArticle, /ART-007/);
	expect(screen.getByDisplayValue('Dépôt Casablanca')).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.stock.quantity), '2,500');
	await fireEvent.changeText(screen.getByLabelText(t.stock.reference), 'REC');
	await submit();
	await waitFor(() => expect(mockValidateReceipt).toHaveBeenCalledWith({ company_id: 5, id: 31 }));
	expect(mockCreateReceipt).toHaveBeenCalledWith({
		company_id: 5,
		logistics_order: 41,
		reference: 'REC',
		note: '',
		lines: [{ logistics_line: 61, article: 7, emplacement: 2, quantity: 2.5 }],
	});
	expect(router.replace).toHaveBeenCalledWith(STOCK_RECEIPT_VIEW(31, 5));
});
it('refuses receiving more than the selected line still has incoming', async () => {
	await setup('receipt');
	await select(t.stock.logisticsOrder, /CMD-041/);
	await select(t.stock.incomingArticle, /ART-007/);
	await fireEvent.changeText(screen.getByLabelText(t.stock.quantity), '3');
	await submit();
	expect(mockCreateReceipt).not.toHaveBeenCalled();
});
it.each(['receipt', 'inventory'] as const)(
	'opens the saved %s draft when validation fails, instead of creating another record',
	async (kind) => {
		const validate = kind === 'receipt' ? mockValidateReceipt : mockValidateInventory;
		validate.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { details: 'Stock changed' } }) });
		await setup(kind);
		if (kind === 'receipt') {
			await select(t.stock.logisticsOrder, /CMD-041/);
			await select(t.stock.incomingArticle, /ART-007/);
			await fireEvent.changeText(screen.getByLabelText(t.stock.quantity), '1');
		} else {
			await select(t.stock.emplacement, /Dépôt Casablanca/);
			await select(t.stock.article, /ART-007/);
			await fireEvent.changeText(screen.getByLabelText(t.stock.countedQuantity), '0');
		}
		await submit();
		await waitFor(() =>
			expect(mockError).toHaveBeenCalledWith(
				kind === 'receipt' ? t.stock.receiptDraftSaved : t.stock.inventoryDraftSaved,
			),
		);
		expect(kind === 'receipt' ? mockCreateReceipt : mockCreateInventory).toHaveBeenCalledTimes(1);
		expect(router.replace).toHaveBeenCalledWith(
			kind === 'receipt' ? STOCK_RECEIPT_VIEW(31, 5) : STOCK_INVENTORY_VIEW(32, 5),
		);
		expect(mockSuccess).not.toHaveBeenCalled();
	},
);
