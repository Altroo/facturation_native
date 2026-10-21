import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ClientsListPage from '@/app/(app)/(drawer)/clients/index';
import { translations } from '@/translations';
import { createQueryMock } from '@/store/setupQuery';
import {
	useGetClientsInfiniteListInfiniteQuery,
	useLazyGetClientsListQuery,
	useDeleteClientMutation,
	usePatchArchiveMutation,
	useBulkDeleteClientsMutation,
	useBulkArchiveClientsMutation,
} from '@/store/services/client';
import { useGetCitiesListQuery } from '@/store/services/parameter';
import type { ClientClass } from '@/models/classes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-token' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const mockSuccess = jest.fn();
const mockError = jest.fn();
let mockRole = 'Caissier';
jest.mock('@/utils/hooks', () => ({
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
		children: (company: {
			company_id: number;
			raison_sociale: string;
			role: string;
			tabs: React.ReactNode;
		}) => React.ReactNode;
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
	return function Sheet(props: { visible: boolean; children: React.ReactNode; title: string }) {
		return props.visible ? (
			<View>
				<Text>{props.title}</Text>
				{props.children}
			</View>
		) : null;
	};
});
jest.mock('@/store/services/client', () => ({
	useGetClientsInfiniteListInfiniteQuery: jest.fn(),
	useLazyGetClientsListQuery: jest.fn(),
	useDeleteClientMutation: jest.fn(),
	usePatchArchiveMutation: jest.fn(),
	useBulkDeleteClientsMutation: jest.fn(),
	useBulkArchiveClientsMutation: jest.fn(),
}));
jest.mock('@/store/services/parameter', () => ({ useGetCitiesListQuery: jest.fn() }));

const client = (id: number) =>
	({
		id,
		code_client: `CLT${id}`,
		client_type: 'Personne physique',
		nom: `Nom ${id}`,
		prenom: 'Ali',
		raison_sociale: null,
		ville_name: 'Casablanca',
		date_created: '2026-10-01',
	}) as ClientClass;
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const initialQuery = {
	currentData: {
		pages: [{ count: 3, next: 'page2', previous: null, results: [client(7), client(8)] }],
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
beforeEach(() => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
	queryMock = createQueryMock(initialQuery);
	jest
		.mocked(useGetClientsInfiniteListInfiniteQuery)
		.mockImplementation(queryMock.useResult as typeof useGetClientsInfiniteListInfiniteQuery);
	jest.mocked(useGetCitiesListQuery).mockReturnValue({
		currentData: [
			{ id: 1, nom: 'Casablanca' },
			{ id: 2, nom: 'Rabat' },
		],
		refetch,
	} as ReturnType<typeof useGetCitiesListQuery>);
	jest
		.mocked(useLazyGetClientsListQuery)
		.mockReturnValue([fetchAll] as unknown as ReturnType<typeof useLazyGetClientsListQuery>);
	jest
		.mocked(useDeleteClientMutation)
		.mockReturnValue([deleteRecord] as unknown as ReturnType<typeof useDeleteClientMutation>);
	jest
		.mocked(usePatchArchiveMutation)
		.mockReturnValue([patchArchive] as unknown as ReturnType<typeof usePatchArchiveMutation>);
	jest
		.mocked(useBulkDeleteClientsMutation)
		.mockReturnValue([bulkDelete] as unknown as ReturnType<typeof useBulkDeleteClientsMutation>);
	jest
		.mocked(useBulkArchiveClientsMutation)
		.mockReturnValue([bulkArchive] as unknown as ReturnType<typeof useBulkArchiveClientsMutation>);
	deleteRecord.mockReturnValue({ unwrap: () => Promise.resolve() });
	patchArchive.mockReturnValue({ unwrap: () => Promise.resolve(client(7)) });
	bulkDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
	bulkArchive.mockReturnValue({ unwrap: () => Promise.resolve({ updated: 3 }) });
	fetchAll.mockReturnValue({ unwrap: () => Promise.resolve([{ id: 7 }, { id: 8 }, { id: 9 }]), abort, unsubscribe });
});

const confirm = async (name: string) =>
	fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name }));
const getLastArgs = () => jest.mocked(useGetClientsInfiniteListInfiniteQuery).mock.calls.at(-1)?.[0];

it('shows native cards and passes company and client IDs to the existing routes', async () => {
	await render(<ClientsListPage />);
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	expect(within(list).getByRole('header', { name: t.clients.listTitle })).toBeOnTheScreen();
	expect(within(list).getByText('Switch company')).toBeOnTheScreen();
	expect(within(list).getByRole('button', { name: t.clients.filterVille })).toBeOnTheScreen();
	expect(within(screen.getByTestId('list-toolbar')).getByText('Atlas')).toBeOnTheScreen();
	expect(
		within(screen.getByTestId('list-toolbar')).getByRole('checkbox', { name: t.shared.selectAllMatching(3) }),
	).toBeOnTheScreen();
	expect(within(list).queryByRole('checkbox', { name: t.shared.selectAllMatching(3) })).toBeNull();
	expect(screen.getByText('CLT7')).toBeTruthy();
	expect(screen.getAllByText(t.clients.typePersonnePhysique)).toHaveLength(2);
	await fireEvent.press(screen.getByRole('button', { name: t.clients.newClient }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/clients/form', params: { company_id: '5' } });
	await fireEvent.press(within(screen.getByTestId('client-card-7')).getByRole('button', { name: t.common.view }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/clients/[id]', params: { id: '7', company_id: '5' } });
	await fireEvent.press(within(screen.getByTestId('client-card-7')).getByRole('button', { name: t.common.edit }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/clients/form', params: { id: '7', company_id: '5' } });
});

it('keeps company switching available when the current company role cannot access clients', async () => {
	mockRole = 'Unknown';
	await render(<ClientsListPage />);
	expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
	await fireEvent.press(screen.getByText('Switch company'));
	expect(getLastArgs()).toMatchObject({ company_id: 11 });
	expect(jest.mocked(useGetClientsInfiniteListInfiniteQuery).mock.calls.at(-1)?.[1]).toMatchObject({ skip: true });
});

it('includes city filters in the toolbar count and clears them with the other filters', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.clients.filterVille }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Casablanca' }));
	expect(getLastArgs()).toMatchObject({ ville_ids: '1' });
	expect(within(screen.getByRole('button', { name: t.dataGrid.toolbarFilters })).getByText('1')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.clearAllFilters }));
	expect(getLastArgs()).not.toHaveProperty('ville_ids');
});

it.each(['Lecture', 'Comptable'])('keeps %s read-only, as on the web', async (role) => {
	mockRole = role;
	await render(<ClientsListPage />);
	expect(screen.queryByRole('button', { name: t.clients.newClient })).toBeNull();
	expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	expect(screen.queryByRole('checkbox')).toBeNull();
	expect(screen.getAllByRole('button', { name: t.common.view })).toHaveLength(2);
});

it('allows Commercial to archive in bulk but not delete in bulk', async () => {
	mockRole = 'Commercial';
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(screen.getByRole('button', { name: t.clients.bulkArchiveBtn(3) })).toBeTruthy();
	expect(screen.queryByRole('button', { name: t.clients.bulkDeleteBtn(3) })).toBeNull();
});

it('requires confirmation before deleting and keeps selection when the server rejects it', async () => {
	deleteRecord.mockReturnValue({ unwrap: () => Promise.reject({ data: { message: 'Client used by an invoice' } }) });
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.clients.selectClient('Nom 7 Ali') }));
	await fireEvent.press(within(screen.getByTestId('client-card-7')).getByRole('button', { name: t.common.delete }));
	expect(deleteRecord).not.toHaveBeenCalled();
	await confirm(t.common.delete);
	expect(deleteRecord).toHaveBeenCalledWith({ id: 7 });
	expect(mockError).toHaveBeenCalledWith('Client used by an invoice');
	expect(screen.getByRole('checkbox', { name: t.clients.selectClient('Nom 7 Ali'), checked: true })).toBeTruthy();
});

it('archives a single client only after confirmation', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(within(screen.getByTestId('client-card-7')).getByRole('button', { name: t.common.archive }));
	expect(patchArchive).not.toHaveBeenCalled();
	await confirm(t.common.archive);
	expect(patchArchive).toHaveBeenCalledWith({ id: 7, data: { archived: true } });
	expect(mockSuccess).toHaveBeenCalledWith(t.clients.archiveSuccess);
});

it('selects unloaded matching IDs and handles the backend 204 bulk delete response', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(fetchAll).toHaveBeenCalledWith(
		expect.objectContaining({ company_id: 5, archived: false, with_pagination: false }),
		false,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.clients.bulkDeleteBtn(3) }));
	await confirm(t.common.delete);
	expect(bulkDelete).toHaveBeenCalledWith({ ids: [7, 8, 9] });
	expect(mockSuccess).toHaveBeenCalledWith(t.clients.bulkDeleteSuccess(3));
});

it('sends multiple city IDs to the list and to select-all, and resets selection when they change', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.clients.filterVille }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Rabat' }));
	expect(getLastArgs()).toMatchObject({ ville_ids: '2' });
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Casablanca' }));
	expect(getLastArgs()).toMatchObject({ ville_ids: '2,1' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(fetchAll).toHaveBeenCalledWith(expect.objectContaining({ ville_ids: '2,1' }), false);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Casablanca' }));
	expect(screen.queryByRole('button', { name: t.clients.bulkDeleteBtn(3) })).toBeNull();
});

it('cancels pending selection when changing company and ignores its late response', async () => {
	let resolve!: (value: Array<{ id: number }>) => void;
	const promise = new Promise<Array<{ id: number }>>((done) => {
		resolve = done;
	});
	fetchAll.mockReturnValue({ unwrap: () => promise, abort, unsubscribe });
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByText('Switch company'));
	expect(abort).toHaveBeenCalled();
	expect(getLastArgs()).toMatchObject({ company_id: 11 });
	await act(async () => {
		resolve([{ id: 99 }]);
		await promise;
	});
	expect(screen.queryByRole('button', { name: t.clients.bulkDeleteBtn(1) })).toBeNull();
});

it('loads the next page once allowed and clears selection on pull-to-refresh', async () => {
	await render(<ClientsListPage />);
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
	expect(screen.queryByRole('button', { name: t.clients.bulkDeleteBtn(3) })).toBeNull();
});

it('sends the submitted search to Django and to select-all', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Ali');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(getLastArgs()).toMatchObject({ search: 'Ali' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(fetchAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'Ali' }), false);
});

it('sends text filters and sorting to Django instead of filtering the loaded cards', async () => {
	await render(<ClientsListPage />);
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText(t.common.value), 'CLT');
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(getLastArgs()).toMatchObject({ code_client__icontains: 'CLT' });
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
	await fireEvent.press(screen.getByRole('radio', { name: t.clients.colNom }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
	await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(getLastArgs()).toMatchObject({ ordering: '-nom', code_client__icontains: 'CLT' });
});

it('keeps a failed next page from triggering automatic retries', async () => {
	await render(<ClientsListPage />);
	await queryMock.setResult({ ...initialQuery, isFetchNextPageError: true, error: { status: 503 } });
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	await fireEvent(list, 'endReached', { distanceFromEnd: 0 });
	expect(fetchNextPage).not.toHaveBeenCalled();
	expect(screen.getByText(t.dataGrid.loadMoreError)).toBeTruthy();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
});
