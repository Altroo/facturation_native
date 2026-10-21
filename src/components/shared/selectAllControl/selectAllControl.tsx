import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { colors, surfaceStyles } from '@/utils/themes';
import { useColorMode } from '@/providers/themeProvider';

type Props = {
	accessibilityLabel: string;
	description: string;
	checked: boolean | 'mixed';
	selectedCount: number;
	onPress: () => void;
	disabled?: boolean;
	loading?: boolean;
	compact?: boolean;
};

const SelectAllControl = (props: Props) => {
	const { accessibilityLabel, description, checked, selectedCount, onPress, disabled = false, loading = false } = props;
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const selected = checked === true || checked === 'mixed';
	const inactive = disabled || loading;
	return (
		<Pressable
			accessibilityRole="checkbox"
			accessibilityLabel={accessibilityLabel}
			accessibilityHint={description}
			accessibilityValue={{ text: t.dataGrid.selectedRowsLabel.replace('{count}', String(selectedCount)) }}
			accessibilityState={{ checked, disabled: inactive, busy: loading }}
			disabled={inactive}
			onPress={onPress}
			style={props.compact ? undefined : surfaceStyles[mode]}
			className={
				(props.compact
					? 'h-11 w-11 shrink-0 items-center justify-center '
					: 'min-h-16 flex-row items-center gap-3 rounded-xl border px-3 py-3 ') +
				(!props.compact && selected
					? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-slate-800 '
					: !props.compact
						? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-panel '
						: '') +
				(inactive ? 'opacity-50' : 'active:opacity-75')
			}
		>
			<View className="h-6 w-6 items-center justify-center">
				{loading ? (
					<ActivityIndicator size="small" color={colors.brand} />
				) : (
					<View
						className={
							'h-6 w-6 items-center justify-center rounded-md border-2 ' +
							(selected ? 'border-brand bg-brand' : 'border-slate-300 dark:border-slate-500')
						}
					>
						{selected && (
							<MaterialIcons name={checked === 'mixed' ? 'remove' : 'check'} size={18} color={colors.white} />
						)}
					</View>
				)}
			</View>
			{!props.compact && (
				<View className="min-w-0 flex-1 gap-0.5">
					<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{t.shared.selectAll}</Text>
					<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
						{loading ? t.shared.loadingIds : description}
					</Text>
				</View>
			)}
			{selectedCount > 0 && (
				<View
					className={
						props.compact
							? 'absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1'
							: 'min-h-7 min-w-7 items-center justify-center rounded-full bg-brand px-2'
					}
				>
					<Text
						accessibilityLiveRegion="polite"
						accessibilityLabel={t.dataGrid.selectedRowsLabel.replace('{count}', String(selectedCount))}
						className="font-poppins-medium text-xs text-white"
					>
						{props.compact && selectedCount > 99 ? '99+' : selectedCount}
					</Text>
				</View>
			)}
		</Pressable>
	);
};

export default SelectAllControl;
