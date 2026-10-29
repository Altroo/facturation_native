import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetStockMovementQuery } from '@/store/services/stock';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockStatus from '@/components/shared/stock/stockStatus';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import QueryError from '@/components/shared/queryError/queryError';
import { formatDate, formatNumberWithSpaces, parseEntityId } from '@/utils/helpers';
import { STOCK_VIEW } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	id: number;
	company_id: number;
};

const StockMovementContent = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetStockMovementQuery(props, { refetchOnMountOrArgChange: true });
	const movement = query.currentData;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	if (!movement)
		return query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : <ApiProgress />;
	return (
		<DetailsPage
			refreshing={query.isFetching}
			onRefresh={() => {
				if (!query.isFetching) void query.refetch();
			}}
			actions={
				<PrimaryLoadingButton
					buttonText={t.stock.viewBalance}
					active
					loading={false}
					startIcon={icon('inventory-2')}
					onClick={() => router.push(STOCK_VIEW(movement.balance, props.company_id))}
				/>
			}
		>
			{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
			<SectionCard title={t.stock.information} icon="swap-vert">
				<StockStatus kind="movement" value={movement.movement_type} />
				<InfoRow dense icon={icon('inventory-2')} label={t.stock.reference} value={movement.article_reference} />
				<InfoRow dense icon={icon('description')} label={t.stock.designation} value={movement.article_designation} />
				<InfoRow dense icon={icon('place')} label={t.stock.emplacement} value={movement.emplacement_name} />
				<InfoRow
					dense
					icon={icon('swap-vert')}
					label={t.stock.quantity}
					value={formatNumberWithSpaces(movement.quantity, 3)}
					valueTone={Number(movement.quantity) < 0 ? 'danger' : 'success'}
				/>
				<InfoRow
					dense
					icon={icon('inventory')}
					label={t.stock.balanceAfter}
					value={formatNumberWithSpaces(movement.balance_after, 3)}
				/>
			</SectionCard>
			<SectionCard title={t.stock.details} icon="info-outline">
				<InfoRow dense icon={icon('event')} label={t.common.dateCreation} value={formatDate(movement.date_created)} />
				<InfoRow
					dense
					icon={icon('person-outline')}
					label={t.stock.actor}
					value={movement.actor_name || t.stock.system}
				/>
				<InfoRow dense icon={icon('link')} label={t.stock.source} value={movement.note || movement.source_type} />
			</SectionCard>
		</DetailsPage>
	);
};

const StockMovementPage = () => {
	const params = useLocalSearchParams<SearchParams>();
	const { t } = useLanguage();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={company_id} requireStock={false}>
			{() => <StockMovementContent key={`${company_id}:${id}`} id={id} company_id={company_id} />}
		</StockFormWrapper>
	);
};

export default StockMovementPage;
