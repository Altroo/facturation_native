import { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ArticlesListLayout from './articlesList';
import ArticlesListPage from '@/app/(app)/(drawer)/articles/index';
import ArticlesArchivedPage from '@/app/(app)/(drawer)/articles/archived';
import { translations } from '@/translations';
import { createQueryMock } from '@/store/setupQuery';
import {
	useGetArticlesInfiniteListInfiniteQuery,
	useLazyGetArticlesListQuery,
	useDeleteArticleMutation,
	usePatchArchiveMutation,
	useBulkDeleteArticlesMutation,
	useBulkArchiveArticlesMutation,
} from '@/store/services/article';
import { useGetCategorieListQuery } from '@/store/services/parameter';
import * as DocumentPicker from 'expo-document-picker';
import type { ArticleClass } from '@/models/classes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
let mockToken: string | null = 'test-token';
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const mockSuccess = jest.fn();
const mockError = jest.fn();
let mockRole = 'Caissier';
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => 0,
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { useState } = jest.requireActual<typeof import('react')>('react');
	const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Wrapper(props: {
		children: (company: { company_id: number; raison_sociale: string; role: string; tabs: ReactNode }) => ReactNode;
	}) {
		const [id, setId] = useState(5);
		return (
			<View>
				{props.children({
					company_id: id,
					raison_sociale: 'Atlas',
					role: mockRole,
					tabs: (
						<Pressable onPress={() => setId(11)}>
							<Text>Switch company</Text>
						</Pressable>
					),
				})}
			</View>
		);
	};
});
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Sheet(props: { visible: boolean; children: ReactNode; title: string }) {
		return props.visible ? (
			<View>
				<Text>{props.title}</Text>
				{props.children}
			</View>
		) : null;
	};
});
jest.mock('@/store/services/article', () => ({
	useGetArticlesInfiniteListInfiniteQuery: jest.fn(),
	useLazyGetArticlesListQuery: jest.fn(),
	useDeleteArticleMutation: jest.fn(),
	usePatchArchiveMutation: jest.fn(),
	useBulkDeleteArticlesMutation: jest.fn(),
	useBulkArchiveArticlesMutation: jest.fn(),
	useImportArticlesMutation: () => [mockImport],
	useSendCSVExampleEmailMutation: () => [mockSendEmail, {}],
}));
jest.mock('@/store/services/parameter', () => ({
	useGetCategorieListQuery: jest.fn(),
	useGetEmplacementListQuery: () => ({}),
	useGetUniteListQuery: () => ({}),
	useGetMarqueListQuery: () => ({}),
}));
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { uses_foreign_currency: false } }),
}));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const article = (id: number) =>
	({
		id,
		reference: `ART${id}`,
		type_article: 'Produit',
		designation: `Article ${id}`,
		prix_achat: 10,
		prix_vente: 20,
		devise_prix_achat: 'MAD',
		devise_prix_vente: 'MAD',
		date_created: '2026-10-01',
	}) as ArticleClass;
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const initialQuery = {
	currentData: {
		pages: [{ count: 3, next: 'page2' as string | null, previous: null, results: [article(7), article(8)] }],
		pageParams: [1],
	},
	data: undefined,
	refetch,
	fetchNextPage,
	hasNextPage: true,
	isLoading: false,
	isFetching: false,
	isFetchingNextPage: false,
	isFetchNextPageError: false,
	error: undefined as unknown,
};
let queryMock: ReturnType<typeof createQueryMock<typeof initialQuery>>;
const deleteRecord = jest.fn();
const patchArchive = jest.fn();
const bulkDelete = jest.fn();
const bulkArchive = jest.fn();
const fetchAll = jest.fn();
const abort = jest.fn();
const unsubscribe = jest.fn();
const t = translations.fr;
const mockImport = jest.fn();
const mockSendEmail = jest.fn();

// Run the common interactions through both real routes, so their action
// callbacks and the shared UI stay covered together.
const ArticlesList = (props: { archived: boolean }) =>
	props.archived ? <ArticlesArchivedPage /> : <ArticlesListPage />;

const pressCardAction = async (label: string, index = 0) => {
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[index]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: label }));
	await act(() => modal.props.onDismiss());
};
const pressImportAction = async (label: string) => {
	await fireEvent.press(screen.getByRole('button', { name: t.articles.importMenu }));
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: label }));
	await act(() => modal.props.onDismiss());
};
beforeEach(() => {
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(200, 200, 44, 44));

	jest.clearAllMocks();
	mockImport.mockReturnValue({
		unwrap: () => Promise.resolve({ total: 2, created: 1, errors: [{ row: 3, message: 'Référence existe' }] }),
	});
	mockSendEmail.mockReturnValue({ unwrap: () => Promise.resolve({ message: 'Sent' }) });
	jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null });
	mockRole = 'Caissier';
	mockToken = 'test-token';
	queryMock = createQueryMock(initialQuery);
	jest
		.mocked(useGetArticlesInfiniteListInfiniteQuery)
		.mockImplementation(queryMock.useResult as typeof useGetArticlesInfiniteListInfiniteQuery);
	jest.mocked(useGetCategorieListQuery).mockReturnValue({
		currentData: [
			{ id: 1, nom: 'Casablanca' },
			{ id: 2, nom: 'Rabat' },
		],
		refetch,
	} as ReturnType<typeof useGetCategorieListQuery>);
	jest
		.mocked(useLazyGetArticlesListQuery)
		.mockReturnValue([fetchAll] as unknown as ReturnType<typeof useLazyGetArticlesListQuery>);
	jest
		.mocked(useDeleteArticleMutation)
		.mockReturnValue([deleteRecord] as unknown as ReturnType<typeof useDeleteArticleMutation>);
	jest
		.mocked(usePatchArchiveMutation)
		.mockReturnValue([patchArchive] as unknown as ReturnType<typeof usePatchArchiveMutation>);
	jest
		.mocked(useBulkDeleteArticlesMutation)
		.mockReturnValue([bulkDelete] as unknown as ReturnType<typeof useBulkDeleteArticlesMutation>);
	jest
		.mocked(useBulkArchiveArticlesMutation)
		.mockReturnValue([bulkArchive] as unknown as ReturnType<typeof useBulkArchiveArticlesMutation>);
	deleteRecord.mockReturnValue({ unwrap: () => Promise.resolve() });
	patchArchive.mockReturnValue({ unwrap: () => Promise.resolve(article(7)) });
	bulkDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
	bulkArchive.mockReturnValue({ unwrap: () => Promise.resolve({ updated: 3 }) });
	fetchAll.mockReturnValue({ unwrap: () => Promise.resolve([{ id: 7 }, { id: 8 }, { id: 9 }]), abort, unsubscribe });
});

const confirm = async (name: string) =>
	fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name }));
const getLastArgs = () => jest.mocked(useGetArticlesInfiniteListInfiniteQuery).mock.calls.at(-1)?.[0];

it('shows native cards and passes company and article IDs to the existing routes', async () => {
	await render(<ArticlesList archived={false} />);
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	expect(within(list).queryByRole('header', { name: t.articles.listTitle })).toBeNull();
	expect(within(list).getByText('Switch company')).toBeOnTheScreen();
	expect(within(list).queryByRole('button', { name: t.articles.filterCategorie })).toBeNull();
	expect(within(screen.getByTestId('list-toolbar')).queryByText('Atlas')).toBeNull();
	expect(
		within(screen.getByTestId('list-toolbar')).getByRole('checkbox', { name: t.shared.selectAllMatching(3) }),
	).toBeOnTheScreen();
	expect(within(list).queryByRole('checkbox', { name: t.shared.selectAllMatching(3) })).toBeNull();
	expect(screen.getByText('ART7')).toBeTruthy();
	expect(screen.getAllByText(t.articles.typeProduit)).toHaveLength(2);
	await fireEvent.press(screen.getByRole('button', { name: t.articles.newArticle }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/articles/form', params: { company_id: '5' } });
	await fireEvent.press(
		within(screen.getByTestId('article-card-7')).getByRole('button', { name: new RegExp('^' + t.common.view + ' ') }),
	);
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/articles/[id]', params: { id: '7', company_id: '5' } });
	await pressCardAction(t.common.edit);
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/articles/form', params: { id: '7', company_id: '5' } });
});

it('keeps company switching available when the current company role cannot access articles', async () => {
	mockRole = 'Unknown';
	await render(<ArticlesList archived={false} />);
	expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
	await fireEvent.press(screen.getByText('Switch company'));
	expect(getLastArgs()).toMatchObject({ company_id: 11 });
	expect(jest.mocked(useGetArticlesInfiniteListInfiniteQuery).mock.calls.at(-1)?.[1]).toMatchObject({ skip: true });
});

it.each([false, true])(
	'includes category filters in the toolbar count and clears them, archived=%s',
	async (archived) => {
		await render(<ArticlesList archived={archived} />);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
		await fireEvent.press(screen.getByRole('radio', { name: t.articles.filterCategorie }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
		await fireEvent.press(screen.getByRole('radio', { name: 'Casablanca' }));
		await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
		expect(getLastArgs()).toMatchObject({ archived, categorie_ids: '1' });
		expect(within(screen.getByRole('button', { name: t.dataGrid.toolbarFilters })).getByText('1')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.common.clearAllFilters }));
		expect(getLastArgs()).not.toHaveProperty('categorie_ids');
	},
);

it.each(['Lecture', 'Comptable'])('keeps %s read-only, as on the web', async (role) => {
	mockRole = role;
	await render(<ArticlesList archived={false} />);
	expect(screen.queryByRole('button', { name: t.articles.newArticle })).toBeNull();
	expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	expect(screen.queryByRole('checkbox')).toBeNull();
	expect(screen.getAllByRole('button', { name: new RegExp('^' + t.common.view + ' ') })).toHaveLength(2);
});

it('allows Commercial to archive in bulk but not delete in bulk', async () => {
	mockRole = 'Commercial';
	await render(<ArticlesList archived={false} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(screen.getByRole('button', { name: t.articles.bulkArchiveBtn(3) })).toBeTruthy();
	expect(screen.queryByRole('button', { name: t.articles.bulkDeleteBtn(3) })).toBeNull();
});

it.each([false, true])(
	'requires confirmation before deleting and preserves selection on failure, archived=%s',
	async (archived) => {
		deleteRecord.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Article used by an invoice' } }) });
		await render(<ArticlesList archived={archived} />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') }));
		await pressCardAction(t.common.delete);
		expect(deleteRecord).not.toHaveBeenCalled();
		expect(within(screen.getByTestId('action-modal')).getByText('ART7')).toBeOnTheScreen();
		await confirm(t.common.delete);
		expect(deleteRecord).toHaveBeenCalledWith({ id: 7 });
		expect(mockError).toHaveBeenCalledWith('Article used by an invoice');
		expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7'), checked: true })).toBeTruthy();
	},
);

it('archives immediately and offers undo using the same article ID', async () => {
	await render(<ArticlesList archived={false} />);
	await pressCardAction(t.common.archive);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(patchArchive).toHaveBeenCalledWith({ id: 7, data: { archived: true } });
	expect(mockSuccess).toHaveBeenCalledWith(t.articles.archiveSuccess, {
		label: t.common.undo,
		onPress: expect.any(Function),
	});
	const undo = mockSuccess.mock.calls.at(-1)![1].onPress;
	await act(() => undo());
	expect(patchArchive).toHaveBeenLastCalledWith({ id: 7, data: { archived: false } });
	expect(mockSuccess).toHaveBeenLastCalledWith(t.articles.unarchiveSuccess);
});

it('reports archive failures without offering an undo for an unsuccessful request', async () => {
	patchArchive.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Archive unavailable' } }) });
	await render(<ArticlesList archived={false} />);
	await pressCardAction(t.common.archive);
	expect(mockError).toHaveBeenCalledWith('Archive unavailable');
	expect(mockSuccess).not.toHaveBeenCalled();
	expect(screen.queryByTestId('action-modal')).toBeNull();
});

it('reports an undo failure through the error toast', async () => {
	await render(<ArticlesList archived={false} />);
	await pressCardAction(t.common.archive);
	const undo = mockSuccess.mock.calls.at(-1)![1].onPress;
	patchArchive.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Restore unavailable' } }) });
	await act(() => undo());
	expect(mockError).toHaveBeenCalledWith('Restore unavailable');
});

it('can undo after changing company without using the new company selection', async () => {
	await render(<ArticlesList archived={false} />);
	await pressCardAction(t.common.archive);
	const undo = mockSuccess.mock.calls.at(-1)![1].onPress;
	await fireEvent.press(screen.getByText('Switch company'));
	await act(() => undo());
	expect(patchArchive).toHaveBeenLastCalledWith({ id: 7, data: { archived: false } });
});

it('confirms the bulk archive count and undoes exactly that selection', async () => {
	await render(<ArticlesList archived={false} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkArchiveBtn(3) }));
	expect(bulkArchive).not.toHaveBeenCalled();
	expect(screen.getByRole('header', { name: t.articles.bulkArchiveModalTitle(3) })).toBeOnTheScreen();
	await confirm(t.common.archive);
	expect(bulkArchive).toHaveBeenCalledWith({ ids: [7, 8, 9], archived: true });
	expect(mockSuccess).toHaveBeenCalledWith(
		t.articles.bulkArchiveSuccess(3),
		expect.objectContaining({ label: t.common.undo }),
	);
	const undo = mockSuccess.mock.calls.at(-1)![1].onPress;
	await act(() => undo());
	expect(bulkArchive).toHaveBeenLastCalledWith({ ids: [7, 8, 9], archived: false });
	expect(mockSuccess).toHaveBeenLastCalledWith(t.articles.bulkUnarchiveSuccess(3));
});

it('clears a partial selection with the toolbar checkbox without an extra clear button', async () => {
	await render(<ArticlesList archived={false} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') }));
	expect(screen.queryByRole('button', { name: t.shared.clearSelection })).toBeNull();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.clearSelection }));
	expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') })).not.toBeChecked();
	expect(fetchAll).not.toHaveBeenCalled();
});

it.each([false, true])(
	'selects unloaded matching IDs and handles the backend 204 bulk delete response, archived=%s',
	async (archived) => {
		await render(<ArticlesList archived={archived} />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		expect(fetchAll).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, archived, with_pagination: false }),
			false,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkDeleteBtn(3) }));
		await confirm(t.common.delete);
		expect(bulkDelete).toHaveBeenCalledWith({ ids: [7, 8, 9] });
		expect(mockSuccess).toHaveBeenCalledWith(t.articles.bulkDeleteSuccess(3));
	},
);

it('moves classification into the filter sheet and applies server IDs to the list and select-all', async () => {
	await render(<ArticlesList archived={false} />);
	expect(screen.queryByRole('button', { name: t.articles.filterCategorie })).toBeNull();
	expect(
		within(screen.getByTestId('list-toolbar')).getByRole('button', { name: t.articles.importMenu }),
	).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.articles.filterCategorie }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Rabat' }));
	expect(getLastArgs()).not.toHaveProperty('categorie_ids');
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(getLastArgs()).toMatchObject({ categorie_ids: '2' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(fetchAll).toHaveBeenCalledWith(expect.objectContaining({ categorie_ids: '2' }), false);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Casablanca' }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(getLastArgs()).toMatchObject({ categorie_ids: '1' });
	expect(screen.queryByRole('button', { name: t.articles.bulkDeleteBtn(3) })).toBeNull();
});

it.each([false, true])(
	'cancels pending selection when changing company and ignores its late response, archived=%s',
	async (archived) => {
		let resolve!: (value: Array<{ id: number }>) => void;
		const promise = new Promise<Array<{ id: number }>>((done) => {
			resolve = done;
		});
		fetchAll.mockReturnValue({ unwrap: () => promise, abort, unsubscribe });
		await render(<ArticlesList archived={archived} />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		await fireEvent.press(screen.getByText('Switch company'));
		expect(abort).toHaveBeenCalled();
		expect(getLastArgs()).toMatchObject({ company_id: 11 });
		await act(async () => {
			resolve([{ id: 99 }]);
			await promise;
		});
		expect(screen.queryByRole('button', { name: t.articles.bulkDeleteBtn(1) })).toBeNull();
	},
);

it.each([false, true])(
	'loads the next page once allowed and clears selection on pull-to-refresh, archived=%s',
	async (archived) => {
		await render(<ArticlesList archived={archived} />);
		const list = () => screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
		await fireEvent(list(), 'endReached', { distanceFromEnd: 0 });
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
		await queryMock.setResult({ ...initialQuery, isFetching: true, isFetchingNextPage: true });
		await fireEvent(list(), 'endReached', { distanceFromEnd: 0 });
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
		await queryMock.setResult(initialQuery);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		await fireEvent(list(), 'refresh');
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('button', { name: t.articles.bulkDeleteBtn(3) })).toBeNull();
	},
);

it.each([false, true])('sends the submitted search to Django and to select-all, archived=%s', async (archived) => {
	await render(<ArticlesList archived={archived} />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Ali');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(getLastArgs()).toMatchObject({ archived, search: 'Ali' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(fetchAll).toHaveBeenCalledWith(expect.objectContaining({ archived, search: 'Ali' }), false);
});

it.each([false, true])(
	'sends text filters and sorting to Django instead of filtering the loaded cards, archived=%s',
	async (archived) => {
		await render(<ArticlesList archived={archived} />);
		await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
		await fireEvent.changeText(screen.getByPlaceholderText(t.common.value), 'CLT');
		await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
		expect(getLastArgs()).toMatchObject({ reference__icontains: 'CLT' });
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
		await fireEvent.press(screen.getByRole('radio', { name: t.articles.colDesignation }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
		await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
		await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
		expect(getLastArgs()).toMatchObject({ archived, ordering: '-designation', reference__icontains: 'CLT' });
	},
);

it('keeps a failed next page from triggering automatic retries', async () => {
	await render(<ArticlesList archived={false} />);
	await queryMock.setResult({ ...initialQuery, isFetchNextPageError: true, error: { status: 503 } });
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	await fireEvent(list, 'endReached', { distanceFromEnd: 0 });
	expect(fetchNextPage).not.toHaveBeenCalled();
	expect(screen.getByText(t.dataGrid.loadMoreError)).toBeTruthy();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
});

describe('archived articles', () => {
	it('requests archived articles and exposes restore instead of archive or create', async () => {
		await render(<ArticlesList archived />);
		expect(getLastArgs()).toMatchObject({ archived: true, company_id: 5 });
		expect(screen.queryByRole('button', { name: t.articles.newArticle })).toBeNull();
		expect(screen.getByTestId('article-card-7')).toBeOnTheScreen();
		await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
		expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
			t.common.edit,
			t.common.unarchive,
			t.common.delete,
		]);
		expect(screen.queryByRole('menuitem', { name: t.common.archive })).toBeNull();
	});

	it('restores one article and preserves the other selected cards', async () => {
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') }));
		await fireEvent.press(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART8') }));
		await pressCardAction(t.common.unarchive);
		expect(patchArchive).toHaveBeenCalledWith({ id: 7, data: { archived: false } });
		expect(mockSuccess).toHaveBeenCalledWith(t.articles.unarchiveSuccess);
		expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') })).not.toBeChecked();
		expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART8') })).toBeChecked();
		expect(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(1) })).toBeOnTheScreen();
		expect(screen.queryByTestId('action-modal')).toBeNull();
	});

	it('reports a restore failure without clearing selection or displaying success', async () => {
		patchArchive.mockReturnValue({ unwrap: () => Promise.reject({ status: 503 }) });
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') }));
		await pressCardAction(t.common.unarchive);
		expect(mockError).toHaveBeenCalledWith(t.articles.unarchiveError);
		expect(mockSuccess).not.toHaveBeenCalled();
		expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') })).toBeChecked();
	});

	it('confirms bulk restore, including unloaded matching articles, and clears selection after success', async () => {
		bulkArchive.mockReturnValue({ unwrap: () => Promise.resolve({ updated: 2 }) });
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		expect(fetchAll).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, archived: true, with_pagination: false }),
			false,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) }));
		expect(bulkArchive).not.toHaveBeenCalled();
		expect(screen.getByRole('header', { name: t.articles.bulkUnarchiveModalTitle(3) })).toBeOnTheScreen();
		expect(screen.getByText(t.articles.bulkUnarchiveModalBody(3))).toBeOnTheScreen();
		await confirm(t.common.unarchive);
		expect(bulkArchive).toHaveBeenCalledWith({ ids: [7, 8, 9], archived: false });
		// Django returns the actual number updated, which may differ from the selection.
		expect(mockSuccess).toHaveBeenCalledWith(t.articles.bulkUnarchiveSuccess(2));
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(screen.queryByRole('button', { name: t.articles.bulkUnarchiveBtn(3) })).toBeNull();
		expect(screen.getByRole('checkbox', { name: t.articles.selectArticle('ART7') })).not.toBeChecked();
	});

	it('cancels bulk restore without mutating articles', async () => {
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) }));
		await confirm(t.common.cancel);
		expect(bulkArchive).not.toHaveBeenCalled();
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) })).toBeOnTheScreen();
	});

	it('reports bulk restore failures with the correct message and allows retry', async () => {
		bulkArchive.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 503 }) });
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) }));
		await confirm(t.common.unarchive);
		expect(mockError).toHaveBeenCalledWith(t.articles.bulkUnarchiveError);
		expect(mockSuccess).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) })).toBeEnabled();
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) }));
		await confirm(t.common.unarchive);
		expect(bulkArchive).toHaveBeenCalledTimes(2);
		expect(mockSuccess).toHaveBeenCalledWith(t.articles.bulkUnarchiveSuccess(3));
	});

	it('allows Commercial to restore in bulk and delete singly, but not delete in bulk', async () => {
		mockRole = 'Commercial';
		await render(<ArticlesList archived />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
		expect(screen.queryByRole('button', { name: t.articles.bulkDeleteBtn(3) })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.articles.bulkUnarchiveBtn(3) }));
		await confirm(t.common.unarchive);
		expect(bulkArchive).toHaveBeenCalledWith({ ids: [7, 8, 9], archived: false });
		await pressCardAction(t.common.delete);
		await confirm(t.common.delete);
		expect(deleteRecord).toHaveBeenCalledWith({ id: 7 });
	});

	it.each(['Lecture', 'Comptable'])('keeps %s read-only while allowing article details', async (role) => {
		mockRole = role;
		await render(<ArticlesList archived />);
		expect(screen.queryByRole('checkbox')).toBeNull();
		expect(screen.queryByRole('button', { name: t.common.moreActions })).toBeNull();
		await fireEvent.press(
			within(screen.getByTestId('article-card-7')).getByRole('button', { name: new RegExp('^' + t.common.view + ' ') }),
		);
		expect(router.push).toHaveBeenCalledWith({ pathname: '/articles/[id]', params: { id: '7', company_id: '5' } });
	});

	it('keeps company switching available when the role cannot access articles', async () => {
		mockRole = 'Unknown';
		await render(<ArticlesList archived />);
		expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
		await fireEvent.press(screen.getByText('Switch company'));
		expect(getLastArgs()).toMatchObject({ company_id: 11, archived: true });
		expect(jest.mocked(useGetArticlesInfiniteListInfiniteQuery).mock.calls.at(-1)?.[1]).toMatchObject({ skip: true });
	});

	it('hides the empty counter and keeps filters accessible', async () => {
		await render(<ArticlesList archived />);
		await queryMock.setResult({
			...initialQuery,
			currentData: { pages: [{ count: 0, next: null, previous: null, results: [] }], pageParams: [1] },
		});
		expect(screen.getByText(t.common.noResults)).toBeOnTheScreen();
		expect(screen.queryByText(t.dataGrid.loadedCount(0, 0))).toBeNull();
		expect(screen.getByRole('button', { name: t.dataGrid.toolbarFilters })).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.articles.filterCategorie })).toBeNull();
	});
});

it.each([false, true])('skips article and category requests without a session, archived=%s', async (archived) => {
	mockToken = null;
	await render(<ArticlesList archived={archived} />);
	expect(jest.mocked(useGetArticlesInfiniteListInfiniteQuery).mock.calls.at(-1)?.[1]).toMatchObject({ skip: true });
	expect(jest.mocked(useGetCategorieListQuery).mock.calls.at(-1)?.[1]).toMatchObject({ skip: true });
});

it('discards the active list selection and aborts its pending request when changing archive mode', async () => {
	let resolve!: (value: Array<{ id: number }>) => void;
	const promise = new Promise<Array<{ id: number }>>((done) => {
		resolve = done;
	});
	fetchAll.mockReturnValue({ unwrap: () => promise, abort, unsubscribe });
	await render(<ArticlesList archived={false} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await screen.rerender(<ArticlesList archived />);
	expect(abort).toHaveBeenCalled();
	expect(getLastArgs()).toMatchObject({ archived: true });
	await act(async () => {
		resolve([{ id: 99 }]);
		await promise;
	});
	expect(screen.queryByRole('button', { name: t.articles.bulkUnarchiveBtn(1) })).toBeNull();
	expect(bulkArchive).not.toHaveBeenCalled();
});

it("runs the operation supplied by its page and uses that page's bulk confirmation", async () => {
	const onConfirm = jest.fn<Promise<void>, [number[], boolean]>().mockResolvedValue(undefined);
	await render(
		<ArticlesListLayout
			archived
			archiveAction={{
				label: 'Restore articles',
				bulkLabel: (count) => `Restore (${count})`,
				bulkTitle: (count) => `Restore ${count} selected articles?`,
				bulkBody: (count) => `${count} articles will return to the active list.`,
				error: 'Restore failed',
				bulkError: 'Bulk restore failed',
				onConfirm,
			}}
		/>,
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByRole('button', { name: 'Restore (3)' }));
	expect(screen.getByRole('header', { name: 'Restore 3 selected articles?' })).toBeOnTheScreen();
	expect(screen.getByText('3 articles will return to the active list.')).toBeOnTheScreen();
	expect(onConfirm).not.toHaveBeenCalled();
	await confirm('Restore articles');
	expect(onConfirm).toHaveBeenCalledWith([7, 8, 9], true);
	expect(patchArchive).not.toHaveBeenCalled();
	expect(bulkArchive).not.toHaveBeenCalled();
});

it('imports a selected Excel file for the current company and displays partial row errors', async () => {
	const file = {
		uri: 'file:///cache/articles.xlsx',
		name: 'articles.xlsx',
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		lastModified: 0,
	};
	jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [file] });
	await render(<ArticlesList archived={false} />);
	await pressImportAction(t.articles.importTooltip);
	expect(mockImport).toHaveBeenCalledWith({ file, company_id: 5 });
	expect(mockSuccess).toHaveBeenCalledWith(t.articles.importSuccess(1));
	expect(screen.getByRole('alert')).toHaveTextContent(/Ligne 3 : Référence existe/);
});

it('cancels file selection without making a request and reports import failures', async () => {
	await render(<ArticlesList archived={false} />);
	await pressImportAction(t.articles.importTooltip);
	expect(mockImport).not.toHaveBeenCalled();
	jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
		canceled: false,
		assets: [{ uri: 'file:///cache/file.csv', name: 'file.csv', lastModified: 0 }],
	});
	mockImport.mockReturnValue({ unwrap: () => Promise.reject({ message: 'Invalid CSV' }) });
	await pressImportAction(t.articles.importTooltip);
	expect(mockError).toHaveBeenCalled();
	expect(screen.queryByText(t.articles.importSuccess(1))).toBeNull();
});

it('shows row failures without a success toast when no articles were imported, like the web', async () => {
	jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/articles.csv', name: 'articles.csv', lastModified: 0 }] });
	mockImport.mockReturnValue({ unwrap: () => Promise.resolve({ total: 1, created: 0, errors: [{ row: 2, message: 'Référence existe' }] }) });
	await render(<ArticlesList archived={false} />);
	await pressImportAction(t.articles.importTooltip);
	expect(screen.getByRole('alert')).toHaveTextContent(/Ligne 2 : Référence existe/);
	expect(mockSuccess).not.toHaveBeenCalled();
});

it('emails the import guide to the selected company and hides imports in the archive', async () => {
	await render(<ArticlesList archived={false} />);
	await fireEvent.press(screen.getByText('Switch company'));
	await pressImportAction(t.articles.emailTooltip);
	expect(mockSendEmail).toHaveBeenCalledWith({ company_id: 11 });
	expect(mockSuccess).toHaveBeenCalledWith(t.articles.emailSuccess);
	await screen.rerender(<ArticlesList archived />);
	expect(screen.queryByRole('button', { name: t.articles.importMenu })).toBeNull();
	expect(screen.queryByRole('button', { name: t.articles.importTooltip })).toBeNull();
	expect(screen.queryByRole('button', { name: t.articles.emailTooltip })).toBeNull();
});
