import { useState } from 'react';
import { Text, ActivityIndicator, FlatList, Platform, Pressable, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
	formatLocale,
	getDefaultFilterOperatorsByType,
	getFilterOperatorsForColumn,
	type FilterModel,
	type SortModel,
} from 'expo-flash-datagrid';
import { useColorMode } from '@/providers/themeProvider';
import type { DateRangeFilterValue, GridFilterResult, PaginatedDataGridProps } from '@/types/uiTypes';
import type { PaginationResponseType } from '@/types/_initTypes';
import { useLanguage, useToast } from '@/utils/hooks';
import { dataGridThemes } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import CustomFilterPanel, { filterHasValue } from '@/components/shared/filterPanel/customFilterPanel';

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

export const extractCustomFilterParams = (model: FilterModel): GridFilterResult => {
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

// The npm package owns filter definitions; this app owns its card layout and controls.
const PaginatedDataGrid = <TRow,>({
	disabled,
	rows,
	columns,
	getRowId,
	rowCount,
	isLoading,
	refreshing,
	onRefresh,
	onEndReached,
	onEndReachedThreshold = 0.3,
	renderRow,
	filterModel,
	onFilterModelChange,
	searchTerm = '',
	setSearchTerm,
	selectedIds = [],
	onSelectionChange,
	isFetchingNextPage,
	hasNextPage,
	loadMoreError,
	onRetryLoadMore,
	sorting,
	testID,
}: PaginatedDataGridProps<TRow>) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const { onError } = useToast();
	const [searchDraft, setSearchDraft] = useState<string | null>(null);
	const [customFilters, setCustomFilters] = useState<FilterModel | null>(null);
	const [filterError, setFilterError] = useState<GridFilterResult['error'] | null>(null);
	const [sortDraft, setSortDraft] = useState<SortModel | null>(null);
	const sortableColumns = columns.filter((column) => column.sortable !== false && column.field !== 'actions');
	const theme = dataGridThemes[mode];
	const operators = getServerFilterOperators<TRow>();
	const activeFilterCount = filterModel?.items.filter(filterHasValue).length ?? 0;
	const closeSearch = () => setSearchDraft(null);
	const closeFilters = () => {
		setCustomFilters(null);
		setFilterError(null);
	};
	const handleApplySearch = () => {
		if (disabled || searchDraft === null) return;
		if (searchDraft !== searchTerm) setSearchTerm?.(searchDraft);
		closeSearch();
	};
	const handleToggleFilterPanel = () => {
		if (disabled) return;
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
		if (searchTerm) setSearchTerm?.('');
		if (filterModel?.items.length) onFilterModelChange?.({ items: [], logicOperator: 'and' });
	};
	const listFooter = (
		<View className="items-center gap-2 px-3 py-4" accessibilityLiveRegion="polite">
			{isFetchingNextPage ? (
				<>
					<ActivityIndicator color="#0274d7" />
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
						startIcon={<MaterialIcons name="refresh" size={20} color="#0274d7" />}
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
		renderItem: ({ item, index }: { item: TRow; index: number }) => renderRow(item, index),
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
		ListFooterComponent: listFooter,
		ListEmptyComponent: (
			<View className="items-center gap-3 p-8">
				{isLoading ? <ActivityIndicator color="#0274d7" /> : null}
				<Text className="font-sans text-slate-500 dark:text-slate-300">
					{isLoading ? t.common.loading : t.common.noResults}
				</Text>
			</View>
		),
		scrollEnabled: !disabled,
		keyboardShouldPersistTaps: 'handled' as const,
		style: { flex: 1 },
	};
	return (
		<View
			testID={testID}
			className="flex-1 overflow-hidden rounded-xl border"
			style={{ borderColor: theme.borderColor, backgroundColor: theme.rowBackground }}
			pointerEvents={disabled ? 'none' : 'auto'}
		>
			<View className="gap-2 px-3 py-2" style={{ backgroundColor: theme.toolbarBackground }}>
				<View className="flex-row flex-wrap items-center justify-end gap-2">
					<Text className="mr-auto font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
						{t.dataGrid.loadedCount(rows.length, rowCount ?? rows.length)}
					</Text>
					{(searchTerm !== '' || activeFilterCount > 0) && (
						<Pressable
							accessibilityRole="button"
							disabled={disabled}
							onPress={handleClearFilters}
							className="min-h-11 justify-center px-2"
						>
							<Text className="font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
								{t.common.clearAllFilters}
							</Text>
						</Pressable>
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
							color={activeFilterCount > 0 ? '#0274d7' : theme.toolbarTextColor}
						/>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.search}
						accessibilityState={{ disabled: !!disabled, selected: !!searchTerm }}
						disabled={disabled}
						onPress={() => {
							if (!disabled) setSearchDraft(searchTerm);
						}}
						className="min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
					>
						<MaterialIcons name="search" size={22} color={searchTerm ? '#0274d7' : theme.toolbarTextColor} />
					</Pressable>
					{sorting && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.dataGrid.toolbarSort}
							accessibilityState={{ disabled: !!disabled, selected: !!sorting.ordering }}
							disabled={disabled}
							onPress={() => {
								if (!disabled) setSortDraft(sorting.sortModel.map((item) => ({ ...item })));
							}}
							className="min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-300 dark:border-slate-600"
						>
							<MaterialIcons name="sort" size={22} color={sorting.ordering ? '#0274d7' : theme.toolbarTextColor} />
						</Pressable>
					)}
				</View>
				{selectedIds.length > 0 && (
					<View className="flex-row items-center justify-between gap-2">
						<Text className="font-sans text-xs" style={{ color: theme.toolbarTextColor }}>
							{formatLocale(t.dataGrid.selectedRowsLabel, { count: selectedIds.length })}
						</Text>
						<Pressable
							accessibilityRole="button"
							disabled={disabled}
							onPress={() => {
								if (!disabled) onSelectionChange?.([]);
							}}
							className="min-h-11 justify-center px-2"
						>
							<Text className="font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
								{t.shared.clearSelection}
							</Text>
						</Pressable>
					</View>
				)}
			</View>
			{Platform.OS === 'web' ? <FlatList {...listProps} /> : <FlashList {...listProps} />}
			{sorting && sortDraft !== null && (
				<ActionModals
					title={t.dataGrid.toolbarSort}
					onClose={() => setSortDraft(null)}
					actions={[
						{ text: t.common.cancel, active: false, onClick: () => setSortDraft(null) },
						{
							text: t.dataGrid.searchApply,
							active: true,
							disabled,
							onClick: () => {
								if (disabled) return;
								sorting.onSortModelChange(sortDraft);
								setSortDraft(null);
							},
						},
					]}
				>
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
					<PrimaryLoadingButton
						buttonText={t.dataGrid.sortClear}
						inverted
						active={!disabled}
						loading={false}
						onClick={() => setSortDraft([])}
					/>
				</ActionModals>
			)}
			{searchDraft !== null && (
				<ActionModals
					title={t.common.search}
					onClose={closeSearch}
					actions={[
						{ text: t.common.cancel, active: false, onClick: closeSearch },
						{ text: t.dataGrid.searchApply, active: true, onClick: handleApplySearch, disabled },
					]}
				>
					<CustomTextInput
						label={t.common.search}
						placeholder={t.dataGrid.searchPlaceholder}
						value={searchDraft}
						onChangeText={setSearchDraft}
						autoCorrect={false}
						autoCapitalize="none"
						disabled={disabled}
						returnKeyType="search"
						onSubmitEditing={handleApplySearch}
					/>
					<PrimaryLoadingButton
						buttonText={t.dataGrid.searchClear}
						inverted
						active={!disabled}
						loading={false}
						onClick={() => setSearchDraft('')}
					/>
				</ActionModals>
			)}
			{customFilters && (
				<ActionModals
					title={t.dataGrid.filtersTitle}
					onClose={closeFilters}
					actions={[
						{ text: t.common.cancel, active: false, onClick: closeFilters },
						{ text: t.dataGrid.searchApply, active: true, onClick: handleFilterChange, disabled },
					]}
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
				</ActionModals>
			)}
		</View>
	);
};
export default PaginatedDataGrid;
