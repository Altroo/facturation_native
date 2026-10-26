import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

import { act } from '@testing-library/react-native';
import AddArticleModal from './addArticleModal';
import { useGetArticlesInfiniteListInfiniteQuery } from '@/store/services/article';
import { createQueryMock } from '@/store/setupQuery';
const article = (id: number) => ({
	id,
	reference: `ART${id}`,
	designation: `Article ${id}`,
	prix_vente: 100,
	devise_prix_vente: 'EUR',
});
const fetchNextPage = jest.fn();
const mockQuery = createQueryMock({
	currentData: { pages: [{ count: 2, results: [article(4)], next: 'next' as string | null }] },
	hasNextPage: true,
	isFetching: false,
	fetchNextPage,
	refetch: jest.fn(),
});
jest.mock('@/store/services/article', () => ({
	useGetArticlesInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetCategorieListQuery: () => ({ currentData: [{ id: 2, nom: 'Furniture' }] }),
	useGetEmplacementListQuery: () => ({ currentData: [] }),
	useGetMarqueListQuery: () => ({ currentData: [] }),
	useGetUniteListQuery: () => ({ currentData: [] }),
}));
beforeEach(async () => {
	jest.clearAllMocks();
	await mockQuery.setResult({
		currentData: { pages: [{ count: 2, results: [article(4), article(8)], next: 'next' }] },
		hasNextPage: true,
		isFetching: false,
		fetchNextPage,
		refetch: jest.fn(),
	});
});
it('uses server search and currency, appends on scroll, and retains selections across searches', async () => {
	const onAdd = jest.fn();
	const onClose = jest.fn();
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set([4])}
			onAdd={onAdd}
			onClose={onClose}
		/>,
	);
	expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({
			company_id: 5,
			archived: false,
			devise_prix_vente: 'EUR',
			search: '',
			prioritize_ids: '4',
		}),
	);
	expect(screen.getByText(t.addArticleModal.statusExisting)).toBeOnTheScreen();
	expect(screen.getByText(t.addArticleModal.statusNew)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART4' }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.search }));
	await fireEvent.changeText(screen.getByLabelText(t.common.search), 'Second');
	await fireEvent(screen.getByLabelText(t.common.search), 'submitEditing');
	expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ search: 'Second' }),
	);
	await act(() =>
		mockQuery.setResult({
			currentData: { pages: [{ count: 1, results: [article(8)], next: null }] },
			hasNextPage: true,
			isFetching: false,
			fetchNextPage,
			refetch: jest.fn(),
		}),
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART8' }));
	await fireEvent.press(screen.getByRole('button', { name: t.addArticleModal.addBtn(2) }));
	expect(onAdd).toHaveBeenCalledWith(
		[4, 8].map((articleId) => ({
			articleId,
			articleData: article(articleId),
			quantity: 1,
			remise_type: '',
			remise: 0,
		})),
	);
	expect(onClose).toHaveBeenCalledTimes(1);
});

it('starts from existing line quantities and discounts and returns the edits for selected articles', async () => {
	const onAdd = jest.fn();
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set([4])}
			existingArticleLineValues={{ 4: { quantity: 3, remise_type: 'Pourcentage', remise: 10 } }}
			onAdd={onAdd}
			onClose={jest.fn()}
		/>,
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART4' }));
	expect(screen.getByLabelText(`${t.addArticleModal.colQuantite} ART4`)).toHaveProp('value', '3,00');
	expect(screen.getByLabelText(`${t.addArticleModal.colRemise} ART4`)).toHaveProp('value', '10,00');
	await fireEvent.changeText(screen.getByLabelText(`${t.addArticleModal.colQuantite} ART4`), '4,5');
	await fireEvent.changeText(screen.getByLabelText(`${t.addArticleModal.colRemise} ART4`), '15');
	await fireEvent.press(screen.getByRole('button', { name: t.addArticleModal.addBtn(1) }));
	expect(onAdd).toHaveBeenCalledWith([
		{ articleId: 4, articleData: article(4), quantity: '4.5', remise_type: 'Pourcentage', remise: '15' },
	]);
});

it('omits discount controls and clears inherited discounts for Nectar documents', async () => {
	const onAdd = jest.fn();
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set([4])}
			existingArticleLineValues={{ 4: { quantity: 2, remise_type: 'Fixe', remise: 25 } }}
			disableRemise
			onAdd={onAdd}
			onClose={jest.fn()}
		/>,
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART4' }));
	expect(screen.queryByText(t.addArticleModal.colTypeRemise)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.addArticleModal.addBtn(1) }));
	expect(onAdd).toHaveBeenCalledWith([
		{ articleId: 4, articleData: article(4), quantity: 2, remise_type: '', remise: 0 },
	]);
});

it.each([
	[t.addArticleModal.statusExisting, 'ids'],
	[t.addArticleModal.statusNew, 'exclude_ids'],
])('sends the %s status filter to the API, without filtering only the loaded rows', async (label, field) => {
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set([4])}
			onAdd={jest.fn()}
			onClose={jest.fn()}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(within(screen.getByTestId('filters-sheet')).getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: label }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
	expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(expect.objectContaining({ [field]: '4' }));
	// Results are owned by the server; the picker never hides a loaded page itself.
	expect(screen.getByRole('checkbox', { name: 'ART4' })).toBeOnTheScreen();
	expect(screen.getByRole('checkbox', { name: 'ART8' })).toBeOnTheScreen();
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!, 'endReached');
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
});

it('sends sorting and classification IDs to the API while retaining the selection', async () => {
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set([4])}
			onAdd={jest.fn()}
			onClose={jest.fn()}
		/>,
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'ART8' }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
	expect(screen.queryByRole('radio', { name: t.addArticleModal.statusHeader })).toBeNull();
	await fireEvent.press(screen.getByRole('radio', { name: t.addArticleModal.colPrixVente }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
	await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
	expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ ordering: '-prix_vente' }),
	);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.addArticleModal.colCategorie }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Furniture' }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
	expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ categorie_ids: '2', ordering: '-prix_vente' }),
	);
	expect(screen.getByRole('checkbox', { name: 'ART8' })).toBeChecked();
});

it('uses an empty match for existing status on a new quote and excludes nothing for new status', async () => {
	await render(
		<AddArticleModal
			companyId={5}
			documentDevise="EUR"
			existingArticleIds={new Set()}
			onAdd={jest.fn()}
			onClose={jest.fn()}
		/>,
	);
	for (const [label, field] of [
		[t.addArticleModal.statusExisting, 'ids'],
		[t.addArticleModal.statusNew, 'exclude_ids'],
	]) {
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
		await fireEvent.press(screen.getByRole('radio', { name: label }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
		expect(useGetArticlesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(expect.objectContaining({ [field]: '0' }));
	}
});
