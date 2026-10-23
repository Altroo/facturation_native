import {
	type ComponentProps,
	type Dispatch,
	type ReactElement,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Text, ActivityIndicator, FlatList, Platform, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getDefaultFilterOperatorsByType, type FilterModel, DataGridProps } from 'expo-flash-datagrid';
import type { PaginationResponseType } from '@/types/_initTypes';
import { useLanguage } from '@/utils/hooks';
import { colors, listSpacing } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { filterHasValue } from '@/components/shared/filterPanel/customFilterPanel';
import { INFINITE_SCROLL_THRESHOLD } from '@/utils/rawData';
import { createDateRangeFilterOperator } from '@/components/shared/dateRangeFilter/dateRangeFilterOperator';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import DataGridToolbar, { type DataGridSorting, type GridFilterResultType } from './dataGridToolbar';

export type DateRangeFilterValue = {
	from?: string;
	to?: string;
};

/** Type guard for DateRangeFilterValue */
export const isDateRangeValue = (value: unknown): value is DateRangeFilterValue => {
	return typeof value === 'object' && value !== null && ('from' in value || 'to' in value);
};

const isValidFilterDate = (value: unknown): value is string => {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(value + 'T00:00:00.000Z');
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

/** Map frontend operator names to backend query param suffixes */
export const mapOperatorToParam = (field: string, operator: string, value: unknown): Record<string, string> => {
	const params: Record<string, string> = {};
	const strValue = String(value);

	switch (operator) {
		// Text operators
		case 'contains':
			params[`${field}__icontains`] = strValue;
			break;
		case 'equals':
		case '=':
		case 'is':
			params[field] = strValue;
			break;
		case 'startsWith':
			params[`${field}__istartswith`] = strValue;
			break;
		case 'endsWith':
			params[`${field}__iendswith`] = strValue;
			break;
		case 'isEmpty':
			params[`${field}__isempty`] = 'true';
			break;
		case 'isNotEmpty':
			params[`${field}__isempty`] = 'false';
			break;

		// Numeric operators (from createNumericFilterOperators)
		case 'numEquals':
			params[field] = strValue;
			break;
		case 'doesNotEqual':
		case 'numNotEquals':
		case '!=':
		case 'ne':
		case 'not':
			params[`${field}__ne`] = strValue;
			break;
		case 'numGreaterThan':
		case '>':
		case 'gt':
			params[`${field}__gt`] = strValue;
			break;
		case 'numGreaterThanOrEqual':
		case '>=':
		case 'gte':
			params[`${field}__gte`] = strValue;
			break;
		case 'numLessThan':
		case '<':
		case 'lt':
			params[`${field}__lt`] = strValue;
			break;
		case 'numLessThanOrEqual':
		case '<=':
		case 'lte':
			params[`${field}__lte`] = strValue;
			break;

		// Also accept existing single-bound models when reopening an older filter.
		case 'onOrAfter':
			params[`${field}_after`] = strValue;
			break;
		case 'onOrBefore':
			params[`${field}_before`] = strValue;
			break;

		default:
			// Fallback: use operator as suffix
			params[`${field}__${operator}`] = strValue;
	}

	return params;
};

export const extractCustomFilterParams = (model: FilterModel): GridFilterResultType => {
	const params: Record<string, string> = {};
	const groups: Record<string, string>[] = [];
	for (const item of model.items) {
		const valueless = item.operator === 'isEmpty' || item.operator === 'isNotEmpty';
		if (!valueless && !filterHasValue(item)) continue;
		let mapped: Record<string, string>;
		if (item.operator === 'between') {
			if (!isDateRangeValue(item.value)) return { params: {}, error: 'invalidDate' };
			const { from, to } = item.value;
			if ((from && !isValidFilterDate(from)) || (to && !isValidFilterDate(to)) || (from && to && from > to))
				return { params: {}, error: 'invalidDate' };
			mapped = {
				...(from ? { [`${item.field}_after`]: from } : {}),
				...(to ? { [`${item.field}_before`]: to } : {}),
			};
			if (!Object.keys(mapped).length) continue;
		} else {
			if (item.operator === 'onOrAfter' || item.operator === 'onOrBefore') {
				if (!isValidFilterDate(item.value)) return { params: {}, error: 'invalidDate' };
			}
			if (
				![
					'contains',
					'equals',
					'startsWith',
					'endsWith',
					'isEmpty',
					'isNotEmpty',
					'is',
					'onOrAfter',
					'onOrBefore',
					'doesNotEqual',
					'>',
					'>=',
					'<',
					'<=',
				].includes(item.operator)
			)
				return { params: {}, error: 'unsupportedFilter' };
			mapped = mapOperatorToParam(item.field, item.operator, item.value);
			if (!Object.keys(mapped).length) return { params: {}, error: 'unsupportedFilter' };
		}
		groups.push(mapped);
		for (const [key, value] of Object.entries(mapped)) {
			if (model.logicOperator !== 'or' && key in params && params[key] !== value)
				return { params: {}, error: 'duplicateFilter' };
			params[key] = value;
		}
	}
	// Each row remains one group, so both date bounds stay together inside OR.
	if (model.logicOperator === 'or' && groups.length > 1)
		return { params: { filter_logic: 'or', filter_groups: JSON.stringify(groups) } };
	return { params };
};

export const getServerFilterOperators = <TRow,>() => {
	const defaults = getDefaultFilterOperatorsByType<TRow>();
	return {
		string: defaults.string.filter(({ value }) =>
			['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'].includes(value),
		),
		number: defaults.number.filter(({ value }) =>
			['equals', 'doesNotEqual', '>', '>=', '<', '<=', 'isEmpty', 'isNotEmpty'].includes(value),
		),
		date: createDateRangeFilterOperator<TRow>(),
		datetime: createDateRangeFilterOperator<TRow>(),
		boolean: defaults.boolean.filter(({ value }) => value === 'is'),
	};
};

// Page boundaries can shift while records change on the server. Keep one card per ID.
export const getInfiniteRows = <TRow extends { id?: number }>(
	pages: PaginationResponseType<TRow>[] | undefined,
): TRow[] => [...new Map((pages ?? []).flatMap((page) => page.results).map((row) => [row.id, row])).values()];

export type PaginatedDataGridProps<TRow> = Pick<
	DataGridProps<TRow>,
	| 'rows'
	| 'columns'
	| 'getRowId'
	| 'rowCount'
	| 'refreshing'
	| 'onRefresh'
	| 'onEndReached'
	| 'onEndReachedThreshold'
	| 'filterModel'
	| 'onFilterModelChange'
	| 'testID'
> & {
	title?: string;
	titleIcon?: ComponentProps<typeof MaterialIcons>['name'];
	header?: ReactNode;
	createAction?: { label: string; onPress: () => void };
	selectionControl?: ReactNode;
	selectionActions?: ReactNode;
	toolbarActions?: ReactNode;
	additionalFilters?: { count: number; key: string; onClear: () => void };
	isLoading?: boolean;
	sorting?: DataGridSorting;
	searchTerm: string;
	setSearchTerm: Dispatch<SetStateAction<string>>;
	selectedIds?: Array<number>;
	renderRow: (row: TRow, index: number) => ReactElement | null;
	disabled?: boolean;
	isFetchingNextPage?: boolean;
	hasNextPage?: boolean;
	loadMoreError?: boolean;
	onRetryLoadMore?: () => void;
};

// The npm package owns filter definitions; this app owns its card layout and controls.
const PaginatedDataGrid = <TRow,>(props: PaginatedDataGridProps<TRow>) => {
	const {
		disabled,
		rows,
		columns,
		getRowId,
		rowCount,
		isLoading,
		refreshing,
		onRefresh,
		onEndReached,
		onEndReachedThreshold = INFINITE_SCROLL_THRESHOLD,
		renderRow,
		filterModel,
		onFilterModelChange,
		searchTerm = '',
		setSearchTerm,
		selectedIds = [],
		isFetchingNextPage,
		hasNextPage,
		loadMoreError,
		onRetryLoadMore,
		sorting,
		testID,
	} = props;
	const { t } = useLanguage();
	const [searchOpen, setSearchOpen] = useState(false);
	const nativeListRef = useRef<FlashListRef<TRow>>(null);
	const webListRef = useRef<FlatList<TRow>>(null);
	const operators = getServerFilterOperators<TRow>();
	const queryKey = JSON.stringify([searchTerm, filterModel, sorting?.ordering, props.additionalFilters?.key]);
	const previousQueryKey = useRef(queryKey);
	useEffect(() => {
		if (previousQueryKey.current === queryKey) return;
		previousQueryKey.current = queryKey;
		// Reset the results position without remounting the company tabs or input.
		nativeListRef.current?.scrollToOffset({ offset: 0, animated: false });
		webListRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [queryKey]);
	const listFooter = (
		<View className="items-center gap-2 px-3 py-4" accessibilityLiveRegion="polite">
			{isFetchingNextPage ? (
				<>
					<ActivityIndicator color={colors.brand} />
					<Text className="font-sans text-ink dark:text-slate-100 text-sm">{t.dataGrid.loadingMore}</Text>
				</>
			) : loadMoreError ? (
				<>
					<Text accessibilityRole="alert" className="font-sans text-sm text-red-700 dark:text-red-300">
						{t.dataGrid.loadMoreError}
					</Text>
					<PrimaryLoadingButton
						buttonText={t.common.retry}
						inverted
						onClick={() => {
							if (!disabled) onRetryLoadMore?.();
						}}
						active={!disabled}
						loading={false}
						startIcon={<MaterialIcons name="refresh" size={20} color={colors.brand} />}
					/>
				</>
			) : rows.length > 0 ? (
				<View className="w-full flex-row items-center justify-center gap-3 py-2">
					{!hasNextPage && <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
					<View className="flex-row items-center gap-2">
						<MaterialIcons
							name={hasNextPage ? 'south' : 'done-all'}
							size={18}
							color={colors.brand}
							accessible={false}
						/>
						<Text className="font-poppins-medium text-xs text-slate-500 dark:text-slate-400">
							{hasNextPage ? t.dataGrid.scrollForMore : t.dataGrid.endOfList}
						</Text>
					</View>
					{!hasNextPage && <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
				</View>
			) : null}
		</View>
	);
	const listProps = {
		data: rows,
		renderItem: ({ item, index }: { item: TRow; index: number }) => (
			<View pointerEvents={disabled ? 'none' : 'auto'}>{renderRow(item, index)}</View>
		),
		keyExtractor: getRowId ?? ((_: TRow, index: number) => String(index)),
		extraData: selectedIds,
		refreshing: !!refreshing,
		onRefresh: onRefresh
			? () => {
					if (!disabled && !isLoading && !refreshing && !isFetchingNextPage) onRefresh();
				}
			: undefined,
		onEndReached: () => {
			if (!disabled && hasNextPage && !isLoading && !refreshing && !isFetchingNextPage && !loadMoreError)
				onEndReached?.();
		},
		onEndReachedThreshold,
		// One vertical list owns the page. Controls above the cards scroll away
		// with them, instead of permanently shrinking the available list height.
		ListHeaderComponent: (
			<View
				style={{
					gap: listSpacing,
					paddingTop: props.title || props.header ? listSpacing : 0,
					paddingBottom: listSpacing / 2,
				}}
			>
				{!!props.title && (
					<View className="flex-row items-center gap-4">
						{!!props.titleIcon && (
							<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-panel">
								<MaterialIcons name={props.titleIcon} size={25} color={colors.brand} />
							</View>
						)}
						<Text
							accessibilityRole="header"
							className="flex-1 font-poppins-semibold text-2xl text-ink dark:text-slate-100"
						>
							{props.title}
						</Text>
					</View>
				)}
				{props.header}
			</View>
		),
		ListFooterComponent: listFooter,
		ListEmptyComponent: (
			<View className="items-center gap-3 p-8">
				{isLoading ? <ActivityIndicator color={colors.brand} /> : null}
				<Text className="font-sans text-slate-500 dark:text-slate-300">
					{isLoading ? t.common.loading : t.common.noResults}
				</Text>
			</View>
		),
		scrollEnabled: !disabled,
		keyboardShouldPersistTaps: 'handled' as const,
		automaticallyAdjustKeyboardInsets: true,
		keyboardDismissMode: 'on-drag' as const,
		alwaysBounceVertical: true,
		contentContainerStyle: { paddingHorizontal: listSpacing, paddingBottom: listSpacing },
		style: { flex: 1 },
	};
	return (
		<View testID={testID} className="flex-1 bg-slate-50 dark:bg-night">
			<DataGridToolbar
				columns={columns}
				loadedCount={rows.length}
				rowCount={rowCount}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				filterModel={filterModel}
				onFilterModelChange={onFilterModelChange}
				filterOperatorsByType={operators}
				serializeFilters={extractCustomFilterParams}
				sorting={sorting}
				disabled={disabled}
				selectionControl={props.selectionControl}
				selectionActions={props.selectionActions}
				selectedIds={selectedIds}
				toolbarActions={props.toolbarActions}
				additionalFilters={props.additionalFilters}
				onSearchOpenChange={setSearchOpen}
			/>
			{Platform.OS === 'web' ? (
				<FlatList ref={webListRef} {...listProps} />
			) : (
				<FlashList ref={nativeListRef} maintainVisibleContentPosition={{ disabled: true }} {...listProps} />
			)}
			<BottomNavigation createAction={props.createAction} disabled={disabled} hidden={searchOpen} />
		</View>
	);
};

export default PaginatedDataGrid;
