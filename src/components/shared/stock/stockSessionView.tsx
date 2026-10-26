import type { CompanyClass } from '@/models/classes';
import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useGetInventoryQuery, useGetStockReceiptQuery } from '@/store/services/stock';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EmptyState from '@/components/shared/emptyState/emptyState';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import StockStatus from './stockStatus';
import StockSessionActions from './stockSessionActions';
import StockLineCard from './stockLineCard';
import { formatDate } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	id: number;
	company_id: number;
	kind: 'receipt' | 'inventory';
	role: string;
	company: CompanyClass;
};

// Receipt and inventory pages are siblings of this shared view. Their web
// fields and read-only line records use the established native detail cards.
const StockSessionView = (props: Props) => {
	const { t } = useLanguage();
	const receipt = props.kind === 'receipt';
	const receiptQuery = useGetStockReceiptQuery(
		{ company_id: props.company_id, id: props.id },
		{ skip: !receipt, refetchOnMountOrArgChange: true },
	);
	const inventoryQuery = useGetInventoryQuery(
		{ company_id: props.company_id, id: props.id },
		{ skip: receipt, refetchOnMountOrArgChange: true },
	);
	const query = receipt ? receiptQuery : inventoryQuery;
	const record = query.currentData;
	const enabled = props.company.stock_management_enabled && props.company.inventory_management_enabled;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	if (!record)
		return query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : <ApiProgress />;
	if (record.company !== props.company_id) return <NoPermission />;
	const canAct = receipt
		? props.role === 'Logistique' && props.company.stock_management_enabled && record.status !== 'cancelled'
		: props.role === 'Caissier' && enabled && record.status === 'draft';
	return (
		<DetailsPage
			refreshing={query.isFetching}
			onRefresh={() => {
				if (!query.isFetching) void query.refetch();
			}}
			actions={
				canAct ? (
					<StockSessionActions
						record={record}
						company_id={props.company_id}
						kind={props.kind}
						role={props.role}
						inventoryEnabled={enabled}
						presentation="bar"
					/>
				) : undefined
			}
		>
			{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
			<SectionCard title={t.stock.information} icon={receipt ? 'receipt-long' : 'fact-check'}>
				<StockStatus kind={props.kind} value={record.status} />
				<InfoRow
					dense
					icon={icon('tag')}
					label={t.stock.reference}
					value={record.reference || `${receipt ? 'REC' : 'INV'}-${record.id}`}
				/>
				{'logistics_order' in record ? (
					<InfoRow
						dense
						icon={icon('local-shipping')}
						label={t.stock.logisticsOrder}
						value={record.logistics_order_number}
					/>
				) : (
					<InfoRow dense icon={icon('place')} label={t.stock.emplacement} value={record.emplacement_name} />
				)}
				<InfoRow dense icon={icon('person-outline')} label={t.stock.createdBy} value={record.created_by_name} />
			</SectionCard>
			<SectionCard title={t.stock.dates} icon="event">
				<InfoRow dense icon={icon('event')} label={t.common.dateCreation} value={formatDate(record.date_created)} />
				<InfoRow
					dense
					icon={icon('event-available')}
					label={t.stock.validatedAt}
					value={record.date_validated ? formatDate(record.date_validated) : null}
				/>
				<InfoRow dense icon={icon('person-outline')} label={t.stock.validatedBy} value={record.validated_by_name} />
			</SectionCard>
			{!!record.note && (
				<SectionCard title={t.stock.note} icon="notes">
					<InfoRow label="" value={record.note} />
				</SectionCard>
			)}
			<SectionCard title={t.stock.lines} icon="inventory-2" variant="list" count={record.lines.length}>
				{record.lines.length ? (
					record.lines.map((line) => <StockLineCard key={line.id} line={line} />)
				) : (
					<EmptyState message={t.common.noData} />
				)}
			</SectionCard>
		</DetailsPage>
	);
};

export default StockSessionView;
