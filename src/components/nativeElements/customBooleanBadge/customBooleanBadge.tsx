import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	value?: boolean;
	showValue?: boolean;
};

const CustomBooleanBadge = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const known = typeof props.value === 'boolean';
	const valueLabel = known ? (props.value ? t.common.yes : t.common.no) : t.common.noData;
	const icon = known ? (props.value ? 'check-circle' : 'cancel') : 'help-outline';
	const tint = known
		? props.value
			? colors.success
			: mode === 'dark'
				? colors.dangerDarkForeground
				: colors.danger
		: colors.slate[400];
	const appearance = !known
		? { background: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400' }
		: props.value
			? { background: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300' }
			: { background: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' };
	return (
		<View
			accessible
			accessibilityLabel={`${props.label}: ${valueLabel}`}
			className={'flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ' + appearance.background}
		>
			<MaterialIcons testID="boolean-badge-icon" name={icon} size={16} color={tint} accessible={false} />
			<Text className={'font-poppins-medium text-xs ' + appearance.text}>
				{props.showValue === false ? props.label : `${props.label}: ${valueLabel}`}
			</Text>
		</View>
	);
};

export default CustomBooleanBadge;
