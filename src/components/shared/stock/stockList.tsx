import { useState, type ReactElement, type ReactNode } from 'react';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import type { PaginationResponseType } from '@/types/_initTypes';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import QueryError from '@/components/shared/queryError/queryError';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';

// All four stock lists send search, sorting and filter groups to Django. The
// shared mobile grid owns the scrolling page, fixed toolbar, and bottom dock.
export const useStockListControls = (company_id: number, article_id?: number) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	return {
		searchTerm,
		setSearchTerm,
		filterModel,
		setFilterModel,
		sorting: { ordering, sortModel, onSortModelChange: setSortModel },
		queryArgs: {
			company_id,
			article_id,
			search: searchTerm,
			ordering,
			pageSize: MODULES_PAGE_SIZE,
			filters: extractCustomFilterParams(filterModel).params,
		},
	};
};

type Props<T extends { id: number }> = {
	query: {
		currentData?: { pages: PaginationResponseType<T>[] };
		isLoading: boolean;
		isFetching: boolean;
		isError: boolean;
		error?: unknown;
		refetch: () => unknown;
		fetchNextPage: () => unknown;
		hasNextPage?: boolean;
		isFetchingNextPage: boolean;
		isFetchNextPageError: boolean;
	};
	controls: ReturnType<typeof useStockListControls>;
	columns: ColumnDef<T>[];
	header: ReactNode;
	createAction?: { label: string; onPress: () => void };
	renderRow: (row: T) => ReactElement;
	disabled?: boolean;
	testID: string;
};

const StockList = <T extends { id: number }>(props: Props<T>) => {
	const { query, controls } = props;
	const rows = getInfiniteRows(query.currentData?.pages);
	const operators = getServerFilterOperators<T>();
	const columns = props.columns.map((column) => ({
		...column,
		filterOperators:
			column.filterable === false
				? undefined
				: (column.filterOperators ??
					(column.filterSelectOptions
						? operators.string.filter((operator) => operator.value === 'equals')
						: operators[
								column.type === 'number'
									? 'number'
									: column.type === 'boolean'
										? 'boolean'
										: column.type === 'date' || column.type === 'datetime'
											? 'date'
											: 'string'
							])),
	}));
	if (query.isError && !query.currentData)
		return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
	return (
		<PaginatedDataGrid
			testID={props.testID}
			rows={rows}
			getRowId={(row) => String(row.id)}
			columns={columns}
			rowCount={query.currentData?.pages[0]?.count ?? 0}
			header={
				<>
					{props.header}
					{query.isError && !query.isFetchNextPageError && (
						<QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />
					)}
				</>
			}
			createAction={props.createAction}
			disabled={props.disabled}
			searchTerm={controls.searchTerm}
			setSearchTerm={controls.setSearchTerm}
			filterModel={controls.filterModel}
			onFilterModelChange={controls.setFilterModel}
			sorting={controls.sorting}
			isLoading={query.isLoading || (query.isFetching && !query.currentData)}
			refreshing={query.isFetching && !!query.currentData && !query.isFetchingNextPage}
			onRefresh={() => {
				if (!query.isFetching && !props.disabled) void query.refetch();
			}}
			hasNextPage={query.hasNextPage}
			isFetchingNextPage={query.isFetchingNextPage}
			onEndReached={() => {
				if (query.hasNextPage && !query.isFetching && !query.error && !props.disabled) void query.fetchNextPage();
			}}
			loadMoreError={query.isFetchNextPageError}
			onRetryLoadMore={() => {
				if (!query.isFetching && !props.disabled) void query.fetchNextPage();
			}}
			renderRow={props.renderRow}
		/>
	);
};

export default StockList;
