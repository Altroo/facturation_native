import { act, render, renderHook } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import type PaginatedDataGrid from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import StockList, { useStockListControls } from './stockList';

let mockGridProps: ComponentProps<typeof PaginatedDataGrid>;
jest.mock('@/components/shared/paginatedDataGrid/paginatedDataGrid', () => ({
	...jest.requireActual('@/components/shared/paginatedDataGrid/paginatedDataGrid'),
	__esModule: true,
	default: (props: ComponentProps<typeof PaginatedDataGrid>) => {
		mockGridProps = props;
		return null;
	},
}));

it('serializes search, sorting and OR filters for the API rather than filtering loaded cards', async () => {
	const { result } = await renderHook(() => useStockListControls(5, 7));
	await act(() => {
		result.current.setSearchTerm('Atlas');
		result.current.sorting.onSortModelChange([{ field: 'quantity', sort: 'desc' }]);
		result.current.setFilterModel({
			items: [
				{ id: '1', field: 'quantity', operator: '>', value: '2' },
				{ id: '2', field: 'note', operator: 'contains', value: 'Correction' },
			],
			logicOperator: 'or',
		});
	});
	expect(result.current.queryArgs).toMatchObject({
		company_id: 5,
		article_id: 7,
		search: 'Atlas',
		ordering: '-quantity',
	});
	expect(JSON.parse(result.current.queryArgs.filters.filter_groups!)).toEqual([
		{ quantity__gt: '2' },
		{ note__icontains: 'Correction' },
	]);
});
it('uses one scrolling list with guarded infinite loading and pull-to-refresh', async () => {
	const { result } = await renderHook(() => useStockListControls(5));
	const query = {
		currentData: { pages: [{ results: [{ id: 1 }], count: 3, next: '?page=2', previous: null }] },
		isLoading: false,
		isFetching: false,
		isError: false,
		hasNextPage: true,
		isFetchingNextPage: false,
		isFetchNextPageError: false,
		refetch: jest.fn(),
		fetchNextPage: jest.fn(),
	};
	const props = {
		query,
		controls: result.current,
		columns: [{ field: 'id', headerName: 'ID', type: 'number' as const }],
		header: <Text>Companies</Text>,
		renderRow: () => <Text>Row</Text>,
		testID: 'stock',
	};
	const view = await render(<StockList {...props} />);
	expect(mockGridProps.rows).toEqual([{ id: 1 }]);
	mockGridProps.onEndReached?.();
	mockGridProps.onRefresh?.();
	expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
	expect(query.refetch).toHaveBeenCalledTimes(1);
	await view.rerender(<StockList {...props} query={{ ...query, isFetching: true }} />);
	mockGridProps.onEndReached?.();
	mockGridProps.onRefresh?.();
	expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
	expect(query.refetch).toHaveBeenCalledTimes(1);
	await view.rerender(<StockList {...props} query={{ ...query, hasNextPage: false }} />);
	mockGridProps.onEndReached?.();
	expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
});
