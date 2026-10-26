import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ColumnDef } from 'expo-flash-datagrid';
import type { StockMovement } from '@/types/stockTypes';
import { useGetStockBalanceQuery, useGetStockMovementsInfiniteListInfiniteQuery } from '@/store/services/stock';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockStatus from '@/components/shared/stock/stockStatus';
import StockQuantityRows from '@/components/shared/stock/stockQuantityRows';
import StockMovementCard from '@/components/shared/stock/stockMovementCard';
import { useStockListControls } from '@/components/shared/stock/stockList';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EmptyState from '@/components/shared/emptyState/emptyState';
import DataGridToolbar from '@/components/shared/paginatedDataGrid/dataGridToolbar';
import {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import { formatDate, parseEntityId } from '@/utils/helpers';
import { STOCK_ADD } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import { stockMovementOptions } from '@/utils/rawData';

type Props = {
	id: number;
	company_id: number;
	canAdjust: boolean;
};

const StockViewContent = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetStockBalanceQuery(
		{ company_id: props.company_id, id: props.id },
		{ refetchOnMountOrArgChange: true },
	);
	const balance = query.currentData;
	const controls = useStockListControls(props.company_id, balance?.article);
	const movements = useGetStockMovementsInfiniteListInfiniteQuery(controls.queryArgs, {
		skip: !balance,
		refetchOnMountOrArgChange: true,
	});
	const rows = getInfiniteRows(movements.currentData?.pages);
	const operators = getServerFilterOperators<StockMovement>();
	const columns: ColumnDef<StockMovement>[] = [
		{
			field: 'movement_type',
			headerName: t.stock.type,
			filterSelectOptions: stockMovementOptions.map((item) => ({ value: item.value, label: t.stock[item.value] })),
			filterOperators: operators.string.filter((operator) => operator.value === 'equals'),
		},
		{ field: 'quantity', headerName: t.stock.quantity, type: 'number', filterOperators: operators.number },
		{ field: 'balance_after', headerName: t.stock.balanceAfter, type: 'number', filterOperators: operators.number },
		{ field: 'note', headerName: t.stock.source, filterOperators: operators.string },
		{ field: 'date_created', headerName: t.common.dateCreation, type: 'date', filterOperators: operators.date },
	];
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	const loadMore = () => {
		if (movements.hasNextPage && !movements.isFetching && !movements.isError) void movements.fetchNextPage();
	};
	if (!balance)
		return query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : <ApiProgress />;
	if (balance.company !== props.company_id) return <NoPermission />;
	return (
		<DetailsPage
			refreshing={query.isFetching || (movements.isFetching && !movements.isFetchingNextPage)}
			onRefresh={() => {
				if (!query.isFetching) void query.refetch();
				if (!movements.isFetching && !movements.isUninitialized) void movements.refetch();
			}}
			onEndReached={loadMore}
			actions={
				props.canAdjust ? (
					<PrimaryLoadingButton
						buttonText={t.stock.adjust}
						active
						loading={false}
						startIcon={icon('swap-vert')}
						onClick={() => router.push(STOCK_ADD(props.company_id, balance.id))}
					/>
				) : undefined
			}
		>
			{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
			<SectionCard title={t.stock.quantities} icon="inventory-2">
				<StockQuantityRows balance={balance} />
			</SectionCard>
			<SectionCard title={t.stock.information} icon="info-outline">
				<StockStatus kind="balance" value={balance.stock_state} />
				<InfoRow dense icon={icon('tag')} label={t.stock.reference} value={balance.article_reference} />
				<InfoRow dense icon={icon('description')} label={t.stock.designation} value={balance.article_designation} />
				<InfoRow dense icon={icon('place')} label={t.stock.emplacement} value={balance.emplacement_name} />
				<InfoRow dense icon={icon('update')} label={t.common.dateMaj} value={formatDate(balance.date_updated)} />
			</SectionCard>
			<SectionCard title={t.stock.movements} icon="history" variant="list">
				{/* The outer detail scroll owns history too. No nested scrolling box. */}
				<DataGridToolbar
					embedded
					unframed
					columns={columns}
					loadedCount={rows.length}
					rowCount={movements.currentData?.pages[0]?.count ?? 0}
					searchTerm={controls.searchTerm}
					setSearchTerm={controls.setSearchTerm}
					filterModel={controls.filterModel}
					onFilterModelChange={controls.setFilterModel}
					sorting={controls.sorting}
					filterOperatorsByType={operators}
					serializeFilters={extractCustomFilterParams}
				/>
				{movements.isError && (
					<QueryError
						error={movements.error}
						onRetry={() => {
							if (!movements.isFetching) {
								if (movements.isFetchNextPageError) void movements.fetchNextPage();
								else void movements.refetch();
							}
						}}
					/>
				)}
				{rows.map((movement) => (
					<StockMovementCard key={movement.id} movement={movement} company_id={props.company_id} />
				))}
				{movements.isFetching ? (
					<ApiProgress cssStyle={{ flex: 0, padding: 16 }} />
				) : !rows.length && !movements.isError ? (
					<EmptyState message={t.common.noData} />
				) : null}
				{movements.hasNextPage && !movements.isFetching && (
					<View className="items-center py-2">
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">{t.dataGrid.scrollForMore}</Text>
					</View>
				)}
			</SectionCard>
		</DetailsPage>
	);
};

const StockViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const { t } = useLanguage();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={company_id} requireStock={false}>
			{({ role, company }) => (
				<StockViewContent
					key={`${company_id}:${id}`}
					id={id}
					company_id={company_id}
					canAdjust={role === 'Caissier' && company.stock_management_enabled}
				/>
			)}
		</StockFormWrapper>
	);
};

export default StockViewPage;
