import { type ReactNode, useEffect, useEffectEvent, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
	getFilterOperatorsForColumn,
	type DataGridProps,
	type FilterModel,
	type FilterOperatorsConfig,
	type SortModel,
} from 'expo-flash-datagrid';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage, useToast } from '@/utils/hooks';
import { colors, dataGridThemes, surfaceStyles } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import CustomFilterPanel, { filterHasValue } from '@/components/shared/filterPanel/customFilterPanel';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';

export type GridFilterResultType = {
	params: Record<string, string>;
	error?: 'duplicateFilter' | 'unsupportedFilter' | 'invalidDate';
};
export type DataGridSorting = {
	ordering: string;
	sortModel: SortModel;
	onSortModelChange: (model: SortModel) => void;
};

type Props<TRow> = Pick<DataGridProps<TRow>, 'columns' | 'filterModel' | 'onFilterModelChange'> &
	FilterOperatorsConfig<TRow> & {
		loadedCount: number;
		rowCount?: number;
		countLabel?: string;
		searchTerm: string;
		setSearchTerm: (value: string) => void;
		sorting?: DataGridSorting;
		disabled?: boolean;
		embedded?: boolean;
		unframed?: boolean;
		selectionControl?: ReactNode;
		selectionActions?: ReactNode;
		selectedIds?: number[];
		toolbarActions?: ReactNode;
		additionalFilters?: { count: number; key: string; onClear: () => void };
		serializeFilters: (model: FilterModel) => GridFilterResultType;
		onSearchOpenChange?: (open: boolean) => void;
	};

// Reuse the list controls without nesting a list or a navigator inside forms.
const DataGridToolbar = <TRow,>(props: Props<TRow>) => {
	const {
		columns,
		disabled,
		filterModel,
		onFilterModelChange,
		searchTerm,
		setSearchTerm,
		selectedIds = [],
		sorting,
	} = props;
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const { onError } = useToast();
	const [searchDraft, setSearchDraft] = useState<string | null>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const [customFilters, setCustomFilters] = useState<FilterModel | null>(null);
	const [filterError, setFilterError] = useState<GridFilterResultType['error'] | null>(null);
	const [sortDraft, setSortDraft] = useState<SortModel | null>(null);
	const sortableColumns = columns.filter((column) => column.sortable !== false && column.field !== 'actions');
	const theme = dataGridThemes[mode];
	const operators = props.filterOperatorsByType;
	const setSearchVisible = (open: boolean) => {
		setSearchOpen(open);
		props.onSearchOpenChange?.(open);
	};
	const activeFilterCount =
		(filterModel?.items.filter(filterHasValue).length ?? 0) + (props.additionalFilters?.count ?? 0);
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
			logicOperator: filterModel?.logicOperator ?? 'and',
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
		const result = props.serializeFilters(customFilters);
		if (result.error) {
			setFilterError(result.error);
			onError(t.dataGrid[result.error]);
			return;
		}
		const previous = props.serializeFilters(filterModel ?? { items: [] });
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
	return (
		<>
			<View
				testID="list-toolbar"
				className={
					props.unframed
						? 'gap-2'
						: props.embedded
							? 'gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-panel'
							: 'gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-night'
				}
			>
				<View className="flex-row items-center justify-end gap-2">
					{props.selectionControl}
					{!searchOpen &&
						props.loadedCount > 0 &&
						(props.embedded ? (
							<View className="mr-auto min-w-0 shrink flex-row items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 dark:bg-slate-800">
								<MaterialIcons name="format-list-bulleted" size={18} color={colors.brand} accessible={false} />
								<Text className="shrink font-poppins-medium text-xs text-brand dark:text-blue-300">
									{props.countLabel ?? t.dataGrid.loadedCount(props.loadedCount, props.rowCount ?? props.loadedCount)}
								</Text>
							</View>
						) : (
							<Text className="mr-auto flex-1 font-sans text-sm" style={{ color: theme.toolbarTextColor }}>
								{props.countLabel ?? t.dataGrid.loadedCount(props.loadedCount, props.rowCount ?? props.loadedCount)}
							</Text>
						))}
					{columns.some((column) => column.field !== 'actions' && column.filterable !== false) && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.dataGrid.toolbarFilters}
							accessibilityState={{ disabled: !!disabled, selected: activeFilterCount > 0 }}
							disabled={disabled}
							onPress={handleToggleFilterPanel}
							className="min-h-11 min-w-11 items-center justify-center"
							style={props.embedded ? undefined : surfaceStyles[mode]}
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
					)}
					{searchOpen ? (
						<Animated.View
							entering={FadeInRight.duration(180)}
							exiting={FadeOutRight.duration(120)}
							style={{ flex: 1, minWidth: 0 }}
						>
							<CustomTextInput
								accessibilityLabel={t.common.search}
								startIcon={<MaterialIcons name="search" size={20} color={colors.slate[400]} />}
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
												setSearchVisible(false);
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
								if (!disabled) setSearchVisible(true);
							}}
							className="min-h-11 min-w-11 items-center justify-center"
							style={props.embedded ? undefined : surfaceStyles[mode]}
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
							className="min-h-11 min-w-11 items-center justify-center"
							style={props.embedded ? undefined : surfaceStyles[mode]}
						>
							<MaterialIcons name="sort" size={22} color={sorting.ordering ? colors.brand : theme.toolbarTextColor} />
						</Pressable>
					)}
					{!searchOpen && props.toolbarActions && <View style={surfaceStyles[mode]}>{props.toolbarActions}</View>}
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
							startIcon={<MaterialIcons name="view-column" size={20} color={colors.slate[400]} />}
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
							startIcon={<MaterialIcons name="sort" size={20} color={colors.slate[400]} />}
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
		</>
	);
};

export default DataGridToolbar;
