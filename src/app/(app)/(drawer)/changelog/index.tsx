import { ActivityIndicator, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ChangelogTimeline } from '@/components/changelog/changelogTimeline';
import Button from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import EmptyState from '@/components/shared/emptyState/emptyState';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import { useGetChangelogQuery } from '@/store/services/changelog';
import { getAccessToken } from '@/store/selectors';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

const ChangelogPage = () => {
	const { t, language } = useLanguage();
	const accessToken = useAppSelector(getAccessToken);
	const { data, isLoading, isFetching, isError, refetch } = useGetChangelogQuery(undefined, {
		skip: !accessToken,
		refetchOnMountOrArgChange: true,
	});
	const loading = !accessToken || isLoading;
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<ChangelogTimeline
				entries={data ?? []}
				language={language}
				refreshing={!!data && isFetching}
				onRefresh={accessToken ? () => void refetch() : undefined}
				header={
					isError && !loading ? (
						<View className="gap-3">
							<ApiAlert errorDetails={t.changelog.error} />
							<Button
								buttonText={t.common.retry}
								startIcon={<MaterialIcons name="refresh" size={20} />}
								onClick={() => void refetch()}
								active={!isFetching}
								loading={isFetching}
								inverted
							/>
						</View>
					) : undefined
				}
				empty={
					loading ? (
						<View className="items-center gap-3 py-10">
							<ActivityIndicator accessibilityLabel={t.changelog.loading} color={colors.brand} />
							<Text className="font-sans text-sm text-slate-500 dark:text-slate-300">{t.changelog.loading}</Text>
						</View>
					) : !isError ? (
						<EmptyState message={t.changelog.empty} />
					) : undefined
				}
			/>
			<BottomNavigation />
		</View>
	);
};

export default ChangelogPage;
