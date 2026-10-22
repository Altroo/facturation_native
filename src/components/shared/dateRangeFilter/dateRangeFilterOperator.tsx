import { View } from 'react-native';
import { format } from 'date-fns';
import type { FilterOperator } from 'expo-flash-datagrid';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import type { DateRangeFilterValue } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import { useLanguage } from '@/utils/hooks';

type Props = {
	value: DateRangeFilterValue;
	onChange: (value: DateRangeFilterValue) => void;
	disabled?: boolean;
	fromLabel?: string;
	toLabel?: string;
};

const DateRangeFilterInput = (props: Props) => {
	const { t } = useLanguage();
	const today = format(new Date(), 'yyyy-MM-dd');
	// An unset upper bound starts at today, like the web. An explicitly cleared
	// bound stays empty. Commit the displayed default with the first date choice.
	const to = props.value.to ?? today;
	return (
		<View className="gap-3">
			<View className="min-w-0">
				<CustomDateInput
					label={props.fromLabel ?? t.dateRange.from}
					value={props.value.from ?? ''}
					maximumDate={to && to < today ? to : today}
					disabled={props.disabled}
					onChange={(from) => props.onChange({ ...props.value, from, to })}
				/>
			</View>
			<View className="min-w-0">
				<CustomDateInput
					label={props.toLabel ?? t.dateRange.to}
					value={to}
					minimumDate={props.value.from}
					maximumDate={today}
					disabled={props.disabled}
					onChange={(to) => props.onChange({ ...props.value, to })}
				/>
			</View>
		</View>
	);
};

// Match the web's single range operator. Django applies both bounds to the full
// result set; the loaded mobile cards must never be filtered locally.
export const createDateRangeFilterOperator = <TRow,>(filterLabel = 'between'): FilterOperator<TRow>[] => [
	{ value: 'between', label: filterLabel, requiresValue: true, apply: () => true },
];

export default DateRangeFilterInput;
