import { ActivityIndicator, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	rowsCount: number;
	hasNextPage?: boolean;
	loading?: boolean;
	error?: boolean;
	disabled?: boolean;
	onRetry?: () => void;
};

// Full lists and embedded document histories share the same loading, retry and
// end-of-list design; their parent remains responsible for fetching each page.
const ListFooter = (props: Props) => {
	const { t } = useLanguage();
	return (
		<View className="items-center gap-2 px-3 py-4" accessibilityLiveRegion="polite">
			{props.loading ? (
				<>
					<ActivityIndicator color={colors.brand} accessibilityLabel={t.common.loading} />
					<Text className="font-sans text-ink dark:text-slate-100 text-sm">{t.dataGrid.loadingMore}</Text>
				</>
			) : props.error ? (
				<>
					<Text accessibilityRole="alert" className="font-sans text-sm text-red-700 dark:text-red-300">
						{t.dataGrid.loadMoreError}
					</Text>
					<PrimaryLoadingButton
						buttonText={t.common.retry}
						inverted
						active={!props.disabled && !!props.onRetry}
						loading={false}
						startIcon={<MaterialIcons name="refresh" size={20} color={colors.brand} />}
						onClick={() => {
							if (!props.disabled) props.onRetry?.();
						}}
					/>
				</>
			) : props.rowsCount > 0 ? (
				<View className="w-full flex-row items-center justify-center gap-3 py-2">
					{!props.hasNextPage && <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
					<View className="flex-row items-center gap-2">
						<MaterialIcons
							name={props.hasNextPage ? 'south' : 'done-all'}
							size={18}
							color={colors.brand}
							accessible={false}
						/>
						<Text className="font-poppins-medium text-xs text-slate-500 dark:text-slate-400">
							{props.hasNextPage ? t.dataGrid.scrollForMore : t.dataGrid.endOfList}
						</Text>
					</View>
					{!props.hasNextPage && <View className="h-px w-8 bg-slate-200 dark:bg-slate-700" />}
				</View>
			) : null}
		</View>
	);
};

export default ListFooter;
