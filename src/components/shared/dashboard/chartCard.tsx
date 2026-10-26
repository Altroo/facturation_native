import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import EmptyState from '@/components/shared/emptyState/emptyState';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import CustomTooltip from '@/components/nativeElements/customTooltip/customTooltip';
import { colors } from '@/utils/themes';
import { useLanguage } from '@/utils/hooks';

type Props = {
	title: string;
	description?: string;
	infoTooltip?: string;
	query: {
		isFetching?: boolean;
		isLoading?: boolean;
		isError?: boolean;
		currentData?: unknown;
		refetch: () => unknown;
	};
	empty?: boolean;
	emptyMessage?: string;
	children?: ReactNode;
};

const ChartCard = (props: Props) => {
	const { t } = useLanguage();
	const loading = props.query.isLoading || (props.query.isFetching && props.query.currentData === undefined);
	return (
		<SectionCard
			title={props.title}
			icon="insights"
			headerActions={
				props.infoTooltip ? (
					<CustomTooltip label={props.title} title={props.infoTooltip}>
						<MaterialIcons name="info-outline" size={20} color={colors.slate[400]} />
					</CustomTooltip>
				) : undefined
			}
		>
			{!!props.description && (
				<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">{props.description}</Text>
			)}
			{loading ? (
				<ActivityIndicator accessibilityLabel={t.common.loading} color={colors.brand} className="py-12" />
			) : props.query.isError ? (
				<View className="gap-3 py-4">
					<Text accessibilityRole="alert" className="font-sans text-sm text-slate-500 dark:text-slate-300">
						{t.dashboard.chartLoadError}
					</Text>
					<PrimaryLoadingButton
						buttonText={t.common.retry}
						loading={false}
						active
						inverted
						onClick={() => {
							props.query.refetch();
						}}
					/>
				</View>
			) : props.empty ? (
				<EmptyState message={props.emptyMessage ?? t.dashboard.defaultEmpty} />
			) : (
				props.children
			)}
		</SectionCard>
	);
};

export default ChartCard;
