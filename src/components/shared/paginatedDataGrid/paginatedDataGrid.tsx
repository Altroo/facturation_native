import {
	type ComponentProps,
	type Dispatch,
	type ReactElement,
	type ReactNode,
	type SetStateAction,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from 'react';
import { Text, ActivityIndicator, FlatList, Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
	getDefaultFilterOperatorsByType,
	getFilterOperatorsForColumn,
	type FilterModel,
	type SortModel,
	DataGridProps,
} from 'expo-flash-datagrid';
import { useColorMode } from '@/providers/themeProvider';
import type { PaginationResponseType } from '@/types/_initTypes';
import { useLanguage, useToast } from '@/utils/hooks';
import { dataGridThemes, colors } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import CustomFilterPanel, { filterHasValue } from '@/components/shared/filterPanel/customFilterPanel';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import { INFINITE_SCROLL_THRESHOLD } from '@/utils/rawData';

type GridFilterResultType = {
	params: Record<string, string>;
	error?: 'andOnly' | 'duplicateFilter' | 'unsupportedFilter' | 'invalidDate';
};

export type DateRangeFilterValue = {
	from?: string;
	to?: string;
};

/** Type guard for DateRangeFilterValue */
export const isDateRangeValue = (value: unknown): value is DateRangeFilterValue => {
	return typeof value === 'object' && value !== null && 'from' in value;
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

		// Native date controls submit each bound separately.
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
	if (model.logicOperator === 'or' && model.items.length > 1) return { params, error: 'andOnly' };
	for (const item of model.items) {
		const valueless = item.operator === 'isEmpty' || item.operator === 'isNotEmpty';
		if (!valueless && (item.value === undefined || item.value === null || String(item.value).trim() === '')) continue;
		if (item.operator === 'onOrAfter' || item.operator === 'onOrBefore') {
			const value = String(item.value);
			const date = new Date(value + 'T00:00:00.000Z');
			if (
				!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
				!Number.isFinite(date.getTime()) ||
				date.toISOString().slice(0, 10) !== value
			)
				return { params: {}, error: 'invalidDate' };
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
			].includes(item.operator)
		)
			return { params: {}, error: 'unsupportedFilter' };
		const mapped = mapOperatorToParam(item.field, item.operator, item.value);
		if (!Object.keys(mapped).length) return { params: {}, error: 'unsupportedFilter' };
		for (const [key, value] of Object.entries(mapped)) {
			if (key in params && params[key] !== value) return { params: {}, error: 'duplicateFilter' };
			params[key] = value;
		}
	}
	return { params };
};

export const getServerFilterOperators = <TRow,>() => {
	const defaults = getDefaultFilterOperatorsByType<TRow>();
	return {
		string: defaults.string.filter(({ value }) =>
			['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'].includes(value),
		),
		date: defaults.date.filter(({ value }) => ['onOrAfter', 'onOrBefore'].includes(value)),
		boolean: defaults.boolean.filter(({ value }) => value === 'is'),
	};
};

// Page boundaries can shift while records change on the server. Keep one card per ID.
export const getInfiniteRows = <TRow extends { id?: number }>(
	pages: PaginationResponseType<TRow>[] | undefined,
): TRow[] => [...new Map((pages ?? []).flatMap((page) => page.results).map((row) => [row.id, row])).values()];

type DataGridSorting = {
	ordering: string;
	sortModel: SortModel;
	onSortModelChange: (model: SortModel) => void;
};

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
	contextLabel?: string;
	createAction?: { label: string; onPress: () => void };
	selectionControl?: ReactNode;
	selectionActions?: ReactNode;
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
	const { mode } = useColorMode();
	const { onError } = useToast();
	const [searchDraft, setSearchDraft] = useState<string | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const [customFilters, setCustomFilters] = useState<FilterModel | null>(null);
	const [filterError, setFilterError] = useState<GridFilterResultType['error'] | null>(null);
	const [sortDraft, setSortDraft] = useState<SortModel | null>(null);
	const nativeListRef = useRef<FlashListRef<TRow>>(null);
	const webListRef = useRef<FlatList<TRow>>(null);
	const sortableColumns = columns.filter((column) => column.sortable !== false && column.field !== 'actions');
	const theme = dataGridThemes[mode];
	const operators = getServerFilterOperators<TRow>();
	const activeFilterCount =
		(filterModel?.items.filter(filterHasValue).length ?? 0) + (props.additionalFilters?.count ?? 0);
	const queryKey = JSON.stringify([searchTerm, filterModel, sorting?.ordering, props.additionalFilters?.key]);
	const previousQueryKey = useRef(queryKey);
	useEffect(() => {
		if (previousQueryKey.current === queryKey) return;
		previousQueryKey.current = queryKey;
		// Reset the results position without remounting the company tabs or input.
		nativeListRef.current?.scrollToOffset({ offset: 0, animated: false });
		webListRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [queryKey]);
	const searchValue = searchDraft ?? searchTerm;
	const closeFilters = () => {
		setCustomFilters(null);
		setFilterError(null);
	};
	const handleApplySearch = () => {
		if (disabled || searchDraft === null) return;
		if (searchDraft !== searchTerm) setSearchTerm?.(searchDraft);
		setSearchDraft(null);
	};
	const applySearch = useEffectEvent(handleApplySearch);
	useEffect(() => {
		if (searchDraft === null || disabled) return;
		const timeout = setTimeout(() => applySearch(), 500);
		return () => clearTimeout(timeout);
	}, [searchDraft, disabled]);
	const handleToggleFilterPanel = () => {
		if (disabled) return;
		Keyboard.dismiss();
		setFilterError(null);
		const firstColumn = columns.find((column) => column.field !== 'actions' && column.filterable !== false);
		setCustomFilters({
			logicOperator: 'and',
			items: filterModel?.items.length
				? filterModel.items.map((item) => ({ ...item }))
				: firstColumn
					? [
							{
								id: 'filter-0',
								field: firstColumn.field,
								operator:
									firstColumn.filterForceOperator ??
									getFilterOperatorsForColumn(firstColumn, { filterOperatorsByType: operators })[0]?.value ??
									'contains',
								value: firstColumn.type === 'boolean' ? true : '',
							},
						]
					: [],
		});
	};
	const handleFilterChange = () => {
		if (disabled || !customFilters) return;
		setFilterError(null);
		const result = extractCustomFilterParams(customFilters);
		if (result.error) {
			setFilterError(result.error);
			onError(t.dataGrid[result.error]);
			return;
		}
		const previous = extractCustomFilterParams(filterModel ?? { items: [] });
		if (
			JSON.stringify(Object.entries(result.params).sort()) !== JSON.stringify(Object.entries(previous.params).sort())
		) {
			onFilterModelChange?.(customFilters);
		}
		closeFilters();
	};
	const handleClearFilters = () => {
		if (disabled) return;
		setSearchDraft(null);
		if (searchTerm) setSearchTerm?.('');
		if (filterModel?.items.length) onFilterModelChange?.({ items: [], logicOperator: 'and' });
		props.additionalFilters?.onClear();
	};
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
				<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">
					{hasNextPage ? t.dataGrid.scrollForMore : t.dataGrid.endOfList}
				</Text>
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
			<View className="gap-3 pb-3 pt-4">
				{!!props.title && (
					<View className="flex-row items-center gap-4 py-1">
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
		contentContainerStyle: { paddingHorizontal: 16, paddingBottom: 16 },
		style: { flex: 1 },
	};
	return (
		<View testID={testID} className="flex-1 bg-slate-50 dark:bg-night">
			<View
				testID="list-toolbar"
				className="gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-night"
			>
				{!!props.contextLabel && (
					<Text numberOfLines={1} className="font-poppins-medium text-sm text-ink dark:text-slate-100">
						{props.contextLabel}
					</Text>
				)}
				<View className="flex-row items-center justify-end gap-2">
					{props.selectionControl}
					{!searchOpen && (
						<Text className="mr-auto flex-1 font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
							{t.dataGrid.loadedCount(rows.length, rowCount ?? rows.length)}
						</Text>
					)}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.dataGrid.toolbarFilters}
						accessibilityState={{ disabled: !!disabled, selected: activeFilterCount > 0 }}
						disabled={disabled}
						onPress={handleToggleFilterPanel}
						className="min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
					>
						<MaterialIcons
							name="filter-list"
							size={22}
							color={activeFilterCount > 0 ? colors.brand : theme.toolbarTextColor}
						/>
						{activeFilterCount > 0 && (
							<View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-brand px-1">
								<Text className="font-sans text-xs text-white">{activeFilterCount}</Text>
							</View>
						)}
					</Pressable>
					{searchOpen ? (
						<Animated.View
							entering={FadeInRight.duration(180)}
							exiting={FadeOutRight.duration(120)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<CustomTextInput
								accessibilityLabel={t.common.search}
								placeholder={t.dataGrid.searchPlaceholder}
								value={searchValue}
								onChangeText={setSearchDraft}
								autoFocus
								autoCorrect={false}
								autoCapitalize="none"
								disabled={disabled}
								returnKeyType="search"
								onSubmitEditing={handleApplySearch}
								endIcon={
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={searchValue ? t.dataGrid.searchClear : t.common.close}
										disabled={disabled}
										onPress={() => {
											setSearchDraft(null);
											if (searchTerm) setSearchTerm?.('');
											if (!searchValue) {
												setSearchOpen(false);
												Keyboard.dismiss();
											}
										}}
										className="min-h-11 min-w-11 items-center justify-center"
									>
										<MaterialIcons name="close" size={20} color={theme.toolbarTextColor} />
									</Pressable>
								}
							/>
						</Animated.View>
					) : (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.search}
							accessibilityState={{ disabled: !!disabled, selected: !!searchTerm }}
							disabled={disabled}
							onPress={() => {
								if (!disabled) setSearchOpen(true);
							}}
							className="min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
						>
							<MaterialIcons name="search" size={22} color={searchTerm ? colors.brand : theme.toolbarTextColor} />
						</Pressable>
					)}
					{sorting && !searchOpen && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.dataGrid.toolbarSort}
							accessibilityState={{ disabled: !!disabled, selected: !!sorting.ordering }}
							disabled={disabled}
							onPress={() => {
								if (disabled) return;
								Keyboard.dismiss();
								setSortDraft(sorting.sortModel.map((item) => ({ ...item })));
							}}
							className="min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
						>
							<MaterialIcons name="sort" size={22} color={sorting.ordering ? colors.brand : theme.toolbarTextColor} />
						</Pressable>
					)}
					{props.createAction && !searchOpen && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={props.createAction.label}
							accessibilityState={{ disabled: !!disabled }}
							disabled={disabled}
							onPress={props.createAction.onPress}
							className="min-h-11 min-w-11 items-center justify-center rounded-lg bg-brand"
						>
							<MaterialIcons name="add" size={24} color={colors.white} />
						</Pressable>
					)}
				</View>
				{(searchTerm !== '' || activeFilterCount > 0) && (
					<Pressable
						accessibilityRole="button"
						disabled={disabled}
						onPress={handleClearFilters}
						className="min-h-11 self-end justify-center px-2"
					>
						<Text className="font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
							{t.common.clearAllFilters}
						</Text>
					</Pressable>
				)}
				{selectedIds.length > 0 && props.selectionActions}
			</View>
			{Platform.OS === 'web' ? (
				<FlatList ref={webListRef} {...listProps} />
			) : (
				<FlashList ref={nativeListRef} maintainVisibleContentPosition={{ disabled: true }} {...listProps} />
			)}
			{sorting && sortDraft !== null && (
				<BottomSheet
					visible
					testID="sorting-sheet"
					title={t.dataGrid.toolbarSort}
					titleIcon={
						<View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="sort" size={24} color={colors.brand} />
						</View>
					}
					onClose={() => setSortDraft(null)}
				>
					<ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
						<CustomDropDownSelect
							label={t.dataGrid.sortField}
							value={sortableColumns.find((column) => column.field === sortDraft[0]?.field)?.headerName ?? ''}
							items={sortableColumns.map((column) => column.headerName ?? column.field)}
							onChange={(value) => {
								const column = sortableColumns.find((item) => (item.headerName ?? item.field) === value);
								if (column) setSortDraft([{ field: column.field, sort: sortDraft[0]?.sort ?? 'asc' }]);
							}}
							disabled={disabled}
						/>
						<CustomDropDownSelect
							label={t.dataGrid.sortDirection}
							value={sortDraft[0]?.sort === 'desc' ? t.dataGrid.sortDescending : t.dataGrid.sortAscending}
							items={[t.dataGrid.sortAscending, t.dataGrid.sortDescending]}
							onChange={(value) => {
								if (sortDraft[0])
									setSortDraft([
										{ field: sortDraft[0].field, sort: value === t.dataGrid.sortDescending ? 'desc' : 'asc' },
									]);
							}}
							disabled={disabled || !sortDraft.length}
						/>
					</ScrollView>
					<View className="flex-row gap-3">
						<PrimaryLoadingButton
							buttonText={t.dataGrid.sortClear}
							inverted
							active={!disabled}
							loading={false}
							onClick={() => setSortDraft([])}
							cssClass="flex-1"
						/>
						<PrimaryLoadingButton
							buttonText={t.dataGrid.searchApply}
							active={!disabled}
							loading={false}
							cssClass="flex-1"
							startIcon={<MaterialIcons name="check" size={20} color={colors.white} />}
							onClick={() => {
								if (disabled) return;
								sorting.onSortModelChange(sortDraft);
								setSortDraft(null);
							}}
						/>
					</View>
				</BottomSheet>
			)}
			{customFilters && (
				<BottomSheet
					visible
					testID="filters-sheet"
					title={t.dataGrid.filtersTitle}
					titleIcon={
						<View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="filter-list" size={24} color={colors.brand} />
						</View>
					}
					onClose={closeFilters}
				>
					<KeyboardAwareScrollView
						style={{ flexShrink: 1 }}
						contentContainerStyle={{ gap: 16 }}
						keyboardShouldPersistTaps="handled"
					>
						{!!filterError && <ApiAlert errorDetails={t.dataGrid[filterError]} />}
						<CustomFilterPanel
							columns={columns}
							filterModel={customFilters}
							onChange={(model) => {
								setFilterError(null);
								setCustomFilters(model);
							}}
							filterOperatorsByType={operators}
							disabled={disabled}
						/>
					</KeyboardAwareScrollView>
					<PrimaryLoadingButton
						buttonText={t.dataGrid.searchApply}
						active={!disabled}
						loading={false}
						onClick={handleFilterChange}
						startIcon={<MaterialIcons name="check" size={20} color={colors.white} />}
					/>
				</BottomSheet>
			)}
		</View>
	);
};

export default PaginatedDataGrid;
