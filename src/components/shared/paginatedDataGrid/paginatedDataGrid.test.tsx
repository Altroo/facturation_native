import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';
import { FlatList, Platform, Pressable, Text } from 'react-native';
import { translations } from '@/translations';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	isDateRangeValue,
	getServerFilterOperators,
	mapOperatorToParam,
	type PaginatedDataGridProps,
	type DateRangeFilterValue,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';

type CustomFilterValue = string | DateRangeFilterValue;

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		language: 'fr',
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
	}),
	useToast: () => ({ onError: mockError }),
}));
const t = translations.fr;
type Row = { id: number; name: string };
const props = (overrides: Partial<PaginatedDataGridProps<Row>> = {}): PaginatedDataGridProps<Row> => ({
	searchTerm: '',
	setSearchTerm: jest.fn(),
	rows: [{ id: 1, name: 'Server result' }],
	columns: [{ field: 'name', headerName: 'Name' }],
	getRowId: (row) => String(row.id),
	renderRow: (row) => <Text>{row.name}</Text>,
	...overrides,
});

beforeEach(() => jest.clearAllMocks());

it('exposes only sortable original columns and emits a server sort model without reordering rows', async () => {
	const onSortModelChange = jest.fn();
	const rows = [
		{ id: 1, name: 'Alpha' },
		{ id: 2, name: 'Zulu' },
	];
	await render(
		<PaginatedDataGrid
			{...props({
				rows,
				columns: [
					{ field: 'name', headerName: 'Name' },
					{ field: 'avatar', headerName: 'Avatar', sortable: false },
					{ field: 'actions', headerName: 'Actions' },
				],
				sorting: { ordering: '', sortModel: [], onSortModelChange },
			})}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
	expect(screen.queryByRole('radio', { name: 'Avatar' })).toBeNull();
	expect(screen.queryByRole('radio', { name: 'Actions' })).toBeNull();
	await fireEvent.press(screen.getByRole('radio', { name: 'Name' }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
	await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
	expect(onSortModelChange).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(onSortModelChange).toHaveBeenCalledWith([{ field: 'name', sort: 'desc' }]);
	expect(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!.props.data).toBe(rows);

	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	expect(screen.getByTestId('sorting-sheet')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	expect(onSortModelChange).toHaveBeenCalledTimes(1);
});

it.each(['ios', 'android', 'web'] as const)(
	'renders one virtualized list of unchanged server rows on %s',
	async (platform) => {
		const os = jest.replaceProperty(Platform, 'OS', platform);
		try {
			await render(
				<PaginatedDataGrid
					{...props({
						title: 'Clients',
						header: <Text>Company tabs and cities</Text>,
						createAction: { label: 'Add client', onPress: jest.fn() },
						searchTerm: 'Does not match',
						filterModel: { items: [{ field: 'name', operator: 'equals', value: 'Other' }] },
					})}
				/>,
			);
			expect(screen.getAllByText('Server result')).toHaveLength(1);
			expect(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')).toHaveLength(1);
			const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
			expect(within(list).getByRole('header', { name: 'Clients' })).toBeOnTheScreen();
			expect(within(list).getByText('Company tabs and cities')).toBeOnTheScreen();
			expect(within(list).queryByText('Atlas')).toBeNull();
			expect(within(list).queryByRole('button', { name: t.common.search })).toBeNull();
			expect(within(screen.getByTestId('list-toolbar')).getByRole('button', { name: 'Add client' })).toBeOnTheScreen();
			expect(screen.queryByLabelText('Colonnes')).toBeNull();
			expect(screen.queryByText('Lignes par page')).toBeNull();
		} finally {
			os.restore();
		}
	},
);

it('resets the scroll on query changes without remounting the header, and preserves position when appending rows', async () => {
	const scroll = jest.spyOn(FlatList.prototype, 'scrollToOffset').mockImplementation(() => {});
	const Header = () => {
		const [selected, setSelected] = useState(false);
		return (
			<Pressable onPress={() => setSelected(true)}>
				<Text>{selected ? 'Header kept' : 'Choose company'}</Text>
			</Pressable>
		);
	};
	const base = props({ header: <Header /> });
	try {
		await render(<PaginatedDataGrid {...base} />);
		await fireEvent.press(screen.getByText('Choose company'));
		await screen.rerender(<PaginatedDataGrid {...base} searchTerm="Atlas" />);
		expect(screen.getByText('Header kept')).toBeOnTheScreen();
		expect(scroll).toHaveBeenLastCalledWith({ offset: 0, animated: false });
		scroll.mockClear();
		await screen.rerender(
			<PaginatedDataGrid {...base} searchTerm="Atlas" rows={[...base.rows, { id: 2, name: 'Next page' }]} />,
		);
		expect(scroll).not.toHaveBeenCalled();
		await screen.rerender(
			<PaginatedDataGrid
				{...base}
				searchTerm="Atlas"
				additionalFilters={{ count: 1, key: 'city:1', onClear: jest.fn() }}
			/>,
		);
		expect(scroll).toHaveBeenCalledTimes(1);
	} finally {
		scroll.mockRestore();
	}
});

it('shows the total filter count and clears page-specific filters along with the grid filters', async () => {
	const clear = jest.fn();
	const change = jest.fn();
	await render(
		<PaginatedDataGrid
			{...props({
				filterModel: { items: [{ field: 'name', operator: 'contains', value: 'Atlas' }] },
				onFilterModelChange: change,
				additionalFilters: { count: 1, key: 'city:1', onClear: clear },
			})}
		/>,
	);
	expect(within(screen.getByRole('button', { name: t.dataGrid.toolbarFilters })).getByText('2')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.clearAllFilters }));
	expect(change).toHaveBeenCalledWith({ items: [], logicOperator: 'and' });
	expect(clear).toHaveBeenCalledTimes(1);
});

it('only shows bulk actions with a selection and leaves more typing space while searching', async () => {
	const create = jest.fn();
	const base = props({
		createAction: { label: 'New client', onPress: create },
		selectionActions: <Text>Archive selection</Text>,
		sorting: { ordering: '', sortModel: [], onSortModelChange: jest.fn() },
	});
	await render(<PaginatedDataGrid {...base} />);
	expect(screen.queryByText('Archive selection')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: 'New client' }));
	expect(create).toHaveBeenCalledTimes(1);
	await screen.rerender(<PaginatedDataGrid {...base} selectedIds={[1]} />);
	expect(within(screen.getByTestId('list-toolbar')).getByText('Archive selection')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.search }));
	expect(screen.queryByRole('button', { name: 'New client' })).toBeNull();
	expect(screen.queryByRole('button', { name: t.dataGrid.toolbarSort })).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	expect(screen.getByRole('button', { name: 'New client' })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.dataGrid.toolbarSort })).toBeOnTheScreen();
});

it('expands search inline, debounces server queries, and clears without reopening a modal', async () => {
	jest.useFakeTimers();
	try {
		const change = jest.fn();
		await render(<PaginatedDataGrid {...props({ searchTerm: 'Previous', setSearchTerm: change })} />);
		await fireEvent.press(screen.getByLabelText(t.common.search));
		expect(screen.queryByTestId('filters-sheet')).toBeNull();
		await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Next');
		await act(() => jest.advanceTimersByTime(300));
		expect(change).not.toHaveBeenCalled();
		await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Next result');
		await act(() => jest.advanceTimersByTime(499));
		expect(change).not.toHaveBeenCalled();
		await act(() => jest.advanceTimersByTime(1));
		expect(change).toHaveBeenCalledTimes(1);
		expect(change).toHaveBeenLastCalledWith('Next result');
		await screen.rerender(<PaginatedDataGrid {...props({ searchTerm: 'Next result', setSearchTerm: change })} />);
		expect(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder)).toHaveProp('value', 'Next result');
		await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'New draft');
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchClear }));
		expect(change).toHaveBeenLastCalledWith('');
		await screen.rerender(<PaginatedDataGrid {...props({ searchTerm: '', setSearchTerm: change })} />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
		await act(() => jest.advanceTimersByTime(1000));
		expect(change).toHaveBeenCalledTimes(2);
		expect(screen.queryByPlaceholderText(t.dataGrid.searchPlaceholder)).toBeNull();
		expect(screen.getByRole('button', { name: t.common.search })).toBeOnTheScreen();
	} finally {
		jest.useRealTimers();
	}
});

it('does not clear selection or restart the query when the same filters are applied again', async () => {
	const change = jest.fn();
	await render(
		<PaginatedDataGrid
			{...props({
				filterModel: { items: [{ field: 'name', operator: 'contains', value: 'Same' }], logicOperator: 'and' },
				onFilterModelChange: change,
				selectedIds: [1],
			})}
		/>,
	);
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(change).not.toHaveBeenCalled();
	expect(screen.queryByText(t.shared.clearSelection)).toBeNull();
});

it('shows invalid dates inside the modal, clears feedback on changes, and submits a corrected retry', async () => {
	const change = jest.fn();
	await render(
		<PaginatedDataGrid
			{...props({
				columns: [{ field: 'date_created', headerName: 'Created', type: 'date' }],
				onFilterModelChange: change,
			})}
		/>,
	);
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-02-30');
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(change).not.toHaveBeenCalled();
	expect(mockError).toHaveBeenCalledWith(t.dataGrid.invalidDate);
	expect(within(screen.getByTestId('filters-sheet')).getByRole('alert')).toHaveTextContent(t.dataGrid.invalidDate);
	expect(screen.getByPlaceholderText('YYYY-MM-DD').props.value).toBe('2026-02-30');
	await fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-02-28');
	expect(screen.queryByRole('alert')).toBeNull();
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(change).toHaveBeenCalledTimes(1);
	expect(change.mock.calls[0][0].items[0].value).toBe('2026-02-28');
	expect(screen.queryByTestId('filters-sheet')).toBeNull();
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	expect(screen.queryByRole('alert')).toBeNull();
	await fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-02-30');
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(within(screen.getByTestId('filters-sheet')).getByRole('alert')).toHaveTextContent(t.dataGrid.invalidDate);
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(within(screen.getByTestId('filters-sheet')).getAllByRole('alert')).toHaveLength(1);
	expect(change).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	expect(screen.getByPlaceholderText('YYYY-MM-DD').props.value).toBe('');
	expect(screen.queryByRole('alert')).toBeNull();
});

it('keeps loaded cards and places the retry action inside the list footer', async () => {
	const retry = jest.fn();
	const end = jest.fn();
	await render(
		<PaginatedDataGrid
			{...props({ hasNextPage: true, loadMoreError: true, onRetryLoadMore: retry, onEndReached: end })}
		/>,
	);
	expect(screen.getByText('Server result')).toBeOnTheScreen();
	expect(screen.getByRole('alert')).toHaveTextContent(t.dataGrid.loadMoreError);
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!, 'endReached');
	expect(end).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByText(t.common.retry));
	expect(retry).toHaveBeenCalledTimes(1);
});

it.each([{ disabled: true }, { isLoading: true }, { refreshing: true }, { isFetchingNextPage: true }])(
	'prevents duplicate loading/refresh while busy: %j',
	async (state) => {
		const end = jest.fn();
		const refresh = jest.fn();
		await render(
			<PaginatedDataGrid {...props({ hasNextPage: true, onEndReached: end, onRefresh: refresh, ...state })} />,
		);
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!,
			'endReached',
		);
		await fireEvent(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!, 'refresh');
		expect(end).not.toHaveBeenCalled();
		expect(refresh).not.toHaveBeenCalled();
	},
);

it('dispatches next-page and refresh events without duplicating the page selection controls', async () => {
	const end = jest.fn();
	const refresh = jest.fn();
	await render(
		<PaginatedDataGrid
			{...props({
				hasNextPage: true,
				onEndReached: end,
				onRefresh: refresh,
				selectedIds: [1],
			})}
		/>,
	);
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!, 'endReached');
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!, 'refresh');
	expect(screen.queryByText(t.shared.clearSelection)).toBeNull();
	expect(end).toHaveBeenCalledTimes(1);
	expect(refresh).toHaveBeenCalledTimes(1);
});
it('keeps one card per ID across shifting server page boundaries, without filtering server results', () => {
	expect(
		getInfiniteRows([
			{
				count: 3,
				next: 'page2',
				previous: null,
				results: [
					{ id: 1, name: 'First' },
					{ id: 2, name: 'Before' },
				],
			},
			{
				count: 3,
				next: null,
				previous: 'page1',
				results: [
					{ id: 2, name: 'Updated' },
					{ id: 3, name: 'Last' },
				],
			},
		]),
	).toEqual([
		{ id: 1, name: 'First' },
		{ id: 2, name: 'Updated' },
		{ id: 3, name: 'Last' },
	]);
	expect(getInfiniteRows(undefined)).toEqual([]);
});
it.each(['2026-02-30', '31/12/2026', 'tomorrow'])('rejects invalid ISO date %s before querying Django', (value) => {
	expect(extractCustomFilterParams({ items: [{ field: 'date_created', operator: 'onOrAfter', value }] }).error).toBe(
		'invalidDate',
	);
});

it('preserves the web text, boolean, empty and date query parameter contracts', () => {
	expect(
		extractCustomFilterParams({
			items: [
				{ field: 'first_name', operator: 'contains', value: 'Sara' },
				{ field: 'email', operator: 'endsWith', value: '@example.invalid' },
				{ field: 'is_active', operator: 'is', value: false },
				{ field: 'last_name', operator: 'isEmpty' },
				{ field: 'date_joined', operator: 'onOrAfter', value: '2026-01-01' },
				{ field: 'date_joined', operator: 'onOrBefore', value: '2026-10-01' },
			],
		}),
	).toEqual({
		params: {
			first_name__icontains: 'Sara',
			email__iendswith: '@example.invalid',
			is_active: 'false',
			last_name__isempty: 'true',
			date_joined_after: '2026-01-01',
			date_joined_before: '2026-10-01',
		},
	});
	expect(mapOperatorToParam('raison_sociale', 'startsWith', 'Demo')).toEqual({ raison_sociale__istartswith: 'Demo' });
	expect(mapOperatorToParam('nbr_employe', 'equals', '1 à 5')).toEqual({ nbr_employe: '1 à 5' });
});
it('does not silently turn OR into AND or overwrite contradictory filters', () => {
	const items = [
		{ field: 'email', operator: 'contains', value: 'a' },
		{ field: 'email', operator: 'contains', value: 'b' },
	];
	expect(extractCustomFilterParams({ items, logicOperator: 'or' }).error).toBe('andOnly');
	expect(extractCustomFilterParams({ items }).error).toBe('duplicateFilter');
	expect(extractCustomFilterParams({ items: [items[0], items[0]] })).toEqual({ params: { email__icontains: 'a' } });
});
it('skips incomplete values and rejects unimplemented operators', () => {
	expect(extractCustomFilterParams({ items: [{ field: 'email', operator: 'contains', value: '  ' }] })).toEqual({
		params: {},
	});
	expect(extractCustomFilterParams({ items: [{ field: 'email', operator: 'doesNotContain', value: 'a' }] }).error).toBe(
		'unsupportedFilter',
	);
});
it('offers only operators implemented by the existing Django APIs', () => {
	const operators = getServerFilterOperators();
	expect(operators.string.map(({ value }) => value)).toEqual([
		'contains',
		'equals',
		'startsWith',
		'endsWith',
		'isEmpty',
		'isNotEmpty',
	]);
	expect(operators.boolean.map(({ value }) => value)).toEqual(['is']);
	expect(operators.date.map(({ value }) => value).sort()).toEqual(['onOrAfter', 'onOrBefore']);
});

describe('mapOperatorToParam', () => {
	it('maps "contains" to icontains', () => {
		expect(mapOperatorToParam('name', 'contains', 'test')).toEqual({ name__icontains: 'test' });
	});

	it('maps "equals" to direct field', () => {
		expect(mapOperatorToParam('status', 'equals', 'active')).toEqual({ status: 'active' });
	});

	it('maps "=" to direct field', () => {
		expect(mapOperatorToParam('status', '=', 'active')).toEqual({ status: 'active' });
	});

	it('maps "is" to direct field', () => {
		expect(mapOperatorToParam('status', 'is', 'active')).toEqual({ status: 'active' });
	});

	it('maps "startsWith" to istartswith', () => {
		expect(mapOperatorToParam('name', 'startsWith', 'abc')).toEqual({ name__istartswith: 'abc' });
	});

	it('maps "endsWith" to iendswith', () => {
		expect(mapOperatorToParam('name', 'endsWith', 'xyz')).toEqual({ name__iendswith: 'xyz' });
	});

	it('maps "isEmpty" to isempty true', () => {
		expect(mapOperatorToParam('email', 'isEmpty', '')).toEqual({ email__isempty: 'true' });
	});

	it('maps "isNotEmpty" to isempty false', () => {
		expect(mapOperatorToParam('email', 'isNotEmpty', '')).toEqual({ email__isempty: 'false' });
	});

	it('maps "numEquals" to direct field', () => {
		expect(mapOperatorToParam('amount', 'numEquals', '100')).toEqual({ amount: '100' });
	});

	it('maps "numNotEquals" to __ne', () => {
		expect(mapOperatorToParam('amount', 'numNotEquals', '50')).toEqual({ amount__ne: '50' });
	});

	it('maps "!=" to __ne', () => {
		expect(mapOperatorToParam('amount', '!=', '50')).toEqual({ amount__ne: '50' });
	});

	it('maps "ne" to __ne', () => {
		expect(mapOperatorToParam('amount', 'ne', '50')).toEqual({ amount__ne: '50' });
	});

	it('maps "not" to __ne', () => {
		expect(mapOperatorToParam('amount', 'not', '50')).toEqual({ amount__ne: '50' });
	});

	it('maps "numGreaterThan" to __gt', () => {
		expect(mapOperatorToParam('price', 'numGreaterThan', '10')).toEqual({ price__gt: '10' });
	});

	it('maps ">" to __gt', () => {
		expect(mapOperatorToParam('price', '>', '10')).toEqual({ price__gt: '10' });
	});

	it('maps "gt" to __gt', () => {
		expect(mapOperatorToParam('price', 'gt', '10')).toEqual({ price__gt: '10' });
	});

	it('maps "numGreaterThanOrEqual" to __gte', () => {
		expect(mapOperatorToParam('price', 'numGreaterThanOrEqual', '10')).toEqual({ price__gte: '10' });
	});

	it('maps ">=" to __gte', () => {
		expect(mapOperatorToParam('price', '>=', '10')).toEqual({ price__gte: '10' });
	});

	it('maps "gte" to __gte', () => {
		expect(mapOperatorToParam('price', 'gte', '10')).toEqual({ price__gte: '10' });
	});

	it('maps "numLessThan" to __lt', () => {
		expect(mapOperatorToParam('price', 'numLessThan', '5')).toEqual({ price__lt: '5' });
	});

	it('maps "<" to __lt', () => {
		expect(mapOperatorToParam('price', '<', '5')).toEqual({ price__lt: '5' });
	});

	it('maps "lt" to __lt', () => {
		expect(mapOperatorToParam('price', 'lt', '5')).toEqual({ price__lt: '5' });
	});

	it('maps "numLessThanOrEqual" to __lte', () => {
		expect(mapOperatorToParam('price', 'numLessThanOrEqual', '5')).toEqual({ price__lte: '5' });
	});

	it('maps "<=" to __lte', () => {
		expect(mapOperatorToParam('price', '<=', '5')).toEqual({ price__lte: '5' });
	});

	it('maps "lte" to __lte', () => {
		expect(mapOperatorToParam('price', 'lte', '5')).toEqual({ price__lte: '5' });
	});

	it('uses fallback for unknown operators', () => {
		expect(mapOperatorToParam('field', 'customOp', 'val')).toEqual({ field__customOp: 'val' });
	});
});

describe('isDateRangeValue', () => {
	it('returns true for object with from property', () => {
		expect(isDateRangeValue({ from: '2025-01-01' })).toBe(true);
	});

	it('returns true for object with from and to properties', () => {
		expect(isDateRangeValue({ from: '2025-01-01', to: '2025-12-31' })).toBe(true);
	});

	it('returns false for string value', () => {
		expect(isDateRangeValue('test')).toBe(false);
	});

	it('returns false for null-like value cast to CustomFilterValue', () => {
		expect(isDateRangeValue(null as unknown as CustomFilterValue)).toBe(false);
	});

	it('returns false for object without from', () => {
		expect(isDateRangeValue({ to: '2025-12-31' } as unknown as CustomFilterValue)).toBe(false);
	});
});

describe('PaginatedDataGrid', () => {
	it('renders rows when data is returned', async () => {
		await render(
			<PaginatedDataGrid
				{...props({
					rows: [
						{ id: 1, name: 'Alice' },
						{ id: 2, name: 'Bob' },
					],
				})}
			/>,
		);
		expect(screen.getByText('Alice')).toBeOnTheScreen();
		expect(screen.getByText('Bob')).toBeOnTheScreen();
	});
	it('shows loading indicator when isLoading is true', async () => {
		await render(<PaginatedDataGrid {...props({ rows: [], isLoading: true })} />);
		expect(screen.getByText(t.common.loading)).toBeOnTheScreen();
		expect(screen.queryByText(t.common.noResults)).toBeNull();
	});
	it('renders filter button in toolbar', async () => {
		await render(<PaginatedDataGrid {...props()} />);
		expect(screen.getByRole('button', { name: t.dataGrid.toolbarFilters })).toBeOnTheScreen();
	});
	it('handles onFilterModelChange callback', async () => {
		const mockFilterChange = jest.fn();
		await render(<PaginatedDataGrid {...props({ onFilterModelChange: mockFilterChange })} />);
		expect(mockFilterChange).not.toHaveBeenCalled();
	});
	it('displays correct row count', async () => {
		await render(<PaginatedDataGrid {...props({ rowCount: 100 })} />);
		expect(screen.getByText('1 / 100')).toBeOnTheScreen();
	});
	it('handles empty results gracefully', async () => {
		await render(<PaginatedDataGrid {...props({ rows: [] })} />);
		expect(screen.getByText(t.common.noResults)).toBeOnTheScreen();
		expect(screen.queryByText(t.common.loading)).toBeNull();
	});
});
