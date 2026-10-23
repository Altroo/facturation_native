import { Pressable, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomTextInput, {
	type CustomTextInputProps,
} from '@/components/nativeElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = Omit<CustomTextInputProps, 'endIcon' | 'multiline' | 'numberOfLines' | 'value' | 'onChangeText'> & {
	value: string;
	onChangeText: (value: string) => void;
	min?: number;
	max?: number;
};

const CustomNumberInput = (props: Props) => {
	const { min = 0, max, ...inputProps } = props;
	const { t } = useLanguage();
	const normalized = props.value.trim().replace(',', '.');
	// A trailing separator is a valid typing draft, such as "1,". The buttons
	// start from that number without forcing the keyboard draft to reformat.
	const parsed = Number(normalized);
	const current = Number.isFinite(parsed) ? parsed : min;
	const disabled = props.disabled || props.readOnly;
	const decreaseDisabled = disabled || current <= min;
	const increaseDisabled = disabled || (max !== undefined && current >= max);
	const change = (direction: -1 | 1) => {
		if (disabled) return;
		const next = Math.min(max ?? Infinity, Math.max(min, current + direction));
		// Preserve fractional quantities without introducing floating-point tails.
		const precision = Math.min(15, (normalized.split('.')[1] ?? '').length);
		const value = String(Number(next.toFixed(Math.max(precision, 2))));
		props.onChangeText(props.value.includes(',') ? value.replace('.', ',') : value);
	};
	const label = props.accessibilityLabel ?? props.label ?? '';
	return (
		<CustomTextInput
			{...inputProps}
			keyboardType={props.keyboardType ?? 'decimal-pad'}
			onChangeText={(value) => {
				if (/^\d*([.,]\d*)?$/.test(value)) props.onChangeText(value);
			}}
			endIcon={
				<View className="flex-row self-stretch">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.decreaseValue(label)}
						accessibilityState={{ disabled: !!decreaseDisabled }}
						disabled={decreaseDisabled}
						onPress={() => change(-1)}
						className="min-h-12 w-12 items-center justify-center border-l border-slate-200 active:bg-slate-100 dark:border-slate-600 dark:active:bg-slate-700"
					>
						<MaterialIcons name="remove" size={22} color={decreaseDisabled ? colors.slate[400] : colors.brand} />
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.increaseValue(label)}
						accessibilityState={{ disabled: !!increaseDisabled }}
						disabled={increaseDisabled}
						onPress={() => change(1)}
						className="min-h-12 w-12 items-center justify-center border-l border-slate-200 active:bg-slate-100 dark:border-slate-600 dark:active:bg-slate-700"
					>
						<MaterialIcons name="add" size={22} color={increaseDisabled ? colors.slate[400] : colors.brand} />
					</Pressable>
				</View>
			}
		/>
	);
};

export default CustomNumberInput;
