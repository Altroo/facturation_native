import { useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import {
	getFilterOperatorsForColumn,
	type FilterItem,
	type FilterOperatorsConfig,
	type ColumnDef,
	type FilterModel,
} from 'expo-flash-datagrid';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useColorMode } from '@/providers/themeProvider';
import { valueLessFilterOperators } from '@/utils/rawData';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

/** Check if a filter item has a meaningful value */
export const filterHasValue = (item: FilterItem): boolean => {
	if (valueLessFilterOperators.has(item.operator)) return true;
	if (typeof item.value === 'string') return item.value.trim() !== '';
	if (typeof item.value === 'object' && item.value !== null) {
		const range = item.value;
		return ('from' in range && !!range.from) || ('to' in range && !!range.to);
	}
	// Native boolean and numeric inputs return values, rather than DOM strings.
	return typeof item.value === 'boolean' || (typeof item.value === 'number' && Number.isFinite(item.value));
};

type Props<TRow> = FilterOperatorsConfig<TRow> & {
	columns: Array<ColumnDef<TRow>>;
	filterModel: FilterModel;
	onChange: (model: FilterModel) => void;
	disabled?: boolean;
};

// Same role and location as the web CustomFilterPanel; only native controls differ.
const CustomFilterPanel = <TRow,>(props: Props<TRow>) => {
	const { columns, filterModel, onChange, disabled, filterOperatorsByType, filterOperatorsByField } = props;
	const { t, language } = useLanguage();
	const { mode } = useColorMode();
	const [datePickerId, setDatePickerId] = useState<string | null>(null);
	if (disabled && datePickerId !== null) setDatePickerId(null);
	const filterCounterRef = useRef(0);
	const config = { filterOperatorsByType, filterOperatorsByField };
	const filterableColumns = columns.filter((column) => column.field !== 'actions' && column.filterable !== false);
	const handleItemChange = (id: string, updates: Partial<FilterItem>) => {
		if (disabled) return;
		onChange({
			...filterModel,
			items: filterModel.items.map((item, i) => ((item.id ?? String(i)) === id ? { ...item, ...updates } : item)),
		});
	};
	const handleAddFilter = () => {
		const firstColumn = filterableColumns[0];
		if (disabled || !firstColumn || !filterModel.items.every(filterHasValue)) return;
		const operators = getFilterOperatorsForColumn(firstColumn, config);
		const defaultOperator = firstColumn.filterForceOperator ?? operators[0]?.value ?? 'contains';
		let id: string;
		do {
			id = `filter-${++filterCounterRef.current}`;
		} while (filterModel.items.some((item) => item.id === id));
		onChange({
			logicOperator: 'and',
			items: [
				...filterModel.items,
				{
					id,
					field: firstColumn.field,
					operator: defaultOperator,
					value: firstColumn.type === 'boolean' ? true : '',
				},
			],
		});
	};
	const handleColumnChange = (id: string, field: string) => {
		const column = columns.find((item) => item.field === field);
		if (!column) return;
		setDatePickerId(null);
		handleItemChange(id, {
			field,
			operator: column.filterForceOperator ?? getFilterOperatorsForColumn(column, config)[0]?.value ?? 'contains',
			value: column.type === 'boolean' ? true : '',
		});
	};
	const handleRemoveFilter = (id: string) => {
		if (disabled) return;
		onChange({ ...filterModel, items: filterModel.items.filter((item, index) => (item.id ?? String(index)) !== id) });
	};
	const handleClearAll = () => {
		if (disabled) return;
		onChange({ ...filterModel, items: [] });
	};
	const handleOperatorChange = (id: string, operator: string) => {
		const item = filterModel.items.find((item, index) => (item.id ?? String(index)) === id);
		const wasValueless = item ? valueLessFilterOperators.has(item.operator) : false;
		const isValueless = valueLessFilterOperators.has(operator);
		if (wasValueless !== isValueless) {
			handleItemChange(id, { operator, value: '' });
		} else {
			handleItemChange(id, { operator });
		}
	};

	return (
		<View className="gap-4">
			{filterModel.items.length === 0 && (
				<Text className="font-sans text-slate-500 dark:text-slate-300">{t.dataGrid.noFilters}</Text>
			)}
			{filterModel.items.map((item, index) => {
				const column = columns.find((col) => col.field === item.field);
				if (!column) return null;
				const id = item.id ?? String(index);
				const operators = getFilterOperatorsForColumn(column, config);
				const operatorOptions = operators.map((operator) => ({
					value: operator.value,
					code:
						(operator.value in t.filterPanel
							? t.filterPanel[operator.value as keyof typeof t.filterPanel]
							: t.dataGrid.operatorLabels[operator.value as keyof typeof t.dataGrid.operatorLabels]) ?? operator.label,
				}));
				const valueOptions =
					column.filterSelectOptions ??
					(column.type === 'boolean'
						? [
								{ value: true, label: t.common.yes },
								{ value: false, label: t.common.no },
							]
						: []);
				const selectedOption = valueOptions.findIndex((option) => option.value === item.value);
				const requiresValue = operators.find((operator) => operator.value === item.operator)?.requiresValue !== false;
				const isDate = column.type === 'date' || column.type === 'datetime';
				const parsedDate = new Date(String(item.value) + 'T12:00:00');
				return (
					<View key={id} className="gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-600">
						{index > 0 && <Text className="font-sans text-ink dark:text-slate-100">{t.filterPanel.and}</Text>}
						<CustomAutoCompleteSelect
							label={t.dataGrid.fieldLabel}
							items={filterableColumns.map((col) => ({ code: col.headerName, value: col.field }))}
							value={{ code: column.headerName, value: column.field }}
							noOptionsText={t.common.noOptions}
							disabled={disabled}
							onChange={(_event, option) => {
								if (option) handleColumnChange(id, option.value);
							}}
						/>
						{!column.filterHideOperator && (
							<CustomAutoCompleteSelect
								label={t.dataGrid.operatorLabel}
								items={operatorOptions}
								value={operatorOptions.find((option) => option.value === item.operator) ?? null}
								noOptionsText={t.common.noOptions}
								disabled={disabled}
								onChange={(_event, option) => {
									if (option) handleOperatorChange(id, option.value);
								}}
							/>
						)}
						{requiresValue &&
							(valueOptions.length > 0 ? (
								<CustomAutoCompleteSelect
									label={t.common.value}
									items={valueOptions.map((option, i) => ({ code: option.label, value: String(i) }))}
									value={
										selectedOption < 0
											? { code: t.common.value, value: '' }
											: { code: valueOptions[selectedOption].label, value: String(selectedOption) }
									}
									noOptionsText={t.common.noOptions}
									disabled={disabled}
									onChange={(_event, option) =>
										handleItemChange(id, { value: option ? valueOptions[Number(option.value)]?.value : '' })
									}
								/>
							) : (
								<CustomTextInput
									label={t.common.value}
									placeholder={isDate ? 'YYYY-MM-DD' : t.common.value}
									value={String(item.value ?? '')}
									disabled={disabled}
									autoCorrect={false}
									autoCapitalize="none"
									onChangeText={(value) => handleItemChange(id, { value })}
									endIcon={
										isDate && Platform.OS !== 'web' ? (
											<Pressable
												accessibilityRole="button"
												accessibilityLabel={t.common.value + ' (' + column.headerName + ')'}
												disabled={disabled}
												onPress={() => setDatePickerId(datePickerId === id ? null : id)}
												className="min-h-12 min-w-12 items-center justify-center"
											>
												<MaterialIcons name="calendar-today" size={22} color={colors.brand} />
											</Pressable>
										) : undefined
									}
								/>
							))}
						{!disabled && isDate && datePickerId === id && Platform.OS !== 'web' && (
							<View>
								<DateTimePicker
									testID="filter-date-picker"
									value={Number.isFinite(parsedDate.getTime()) ? parsedDate : new Date()}
									mode="date"
									display={Platform.OS === 'ios' ? 'spinner' : 'default'}
									themeVariant={mode}
									locale={language}
									onValueChange={(_event, date) => {
										if (Platform.OS !== 'ios') setDatePickerId(null);
										handleItemChange(id, { value: format(date, 'yyyy-MM-dd') });
									}}
									onDismiss={() => setDatePickerId(null)}
								/>
								{Platform.OS === 'ios' && (
									<PrimaryLoadingButton
										buttonText={t.dataGrid.done}
										active
										loading={false}
										inverted
										onClick={() => setDatePickerId(null)}
									/>
								)}
							</View>
						)}
						<PrimaryLoadingButton
							buttonText={t.dataGrid.removeFilter}
							active={!disabled}
							loading={false}
							inverted
							danger
							startIcon={<MaterialIcons name="close" size={20} color={colors.dangerStrong} />}
							onClick={() => handleRemoveFilter(id)}
						/>
					</View>
				);
			})}
			<PrimaryLoadingButton
				buttonText={t.common.addFilter}
				active={!disabled && filterableColumns.length > 0 && filterModel.items.every(filterHasValue)}
				loading={false}
				inverted
				onClick={handleAddFilter}
				startIcon={<MaterialIcons name="add" size={22} color={colors.brand} />}
			/>
			{filterModel.items.length > 0 && (
				<>
					<PrimaryLoadingButton
						buttonText={t.common.clearAllFilters}
						active={!disabled}
						loading={false}
						inverted
						onClick={handleClearAll}
					/>
					<Text className="font-sans text-sm text-slate-500 dark:text-slate-300">
						{filterModel.items.filter(filterHasValue).length} filtre(s) actif(s)
					</Text>
				</>
			)}
		</View>
	);
};

export default CustomFilterPanel;
