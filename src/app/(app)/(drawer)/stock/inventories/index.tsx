import type { ReactNode } from 'react';
import type { CompanyClass } from '@/models/classes';
import { router, useLocalSearchParams } from 'expo-router';
import type { ColumnDef } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockList, { useStockListControls } from '@/components/shared/stock/stockList';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useGetEmplacementListQuery } from '@/store/services/parameter';
import { useLanguage } from '@/utils/hooks';
import { parseEntityId } from '@/utils/helpers';

import type { InventorySession } from '@/types/stockTypes';
import { useGetInventoriesInfiniteListInfiniteQuery } from '@/store/services/stock';
import StockSessionCard from '@/components/shared/stock/stockSessionCard';
import StockSessionActions from '@/components/shared/stock/stockSessionActions';
import StockDisabledState from '@/components/shared/stock/stockDisabledState';
import { STOCK_INVENTORIES_ADD } from '@/utils/routes';
import { stockInventoryStatusOptions } from '@/utils/rawData';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
	company: CompanyClass;
};

const StockInventoriesContent = (props: Props) => {
	const { t } = useLanguage();
	const controls = useStockListControls(props.company_id);
	const query = useGetInventoriesInfiniteListInfiniteQuery(controls.queryArgs, { refetchOnMountOrArgChange: true });
	const locations = useGetEmplacementListQuery({ company_id: props.company_id });
	const enabled = props.company.stock_management_enabled && props.company.inventory_management_enabled;
	const columns: ColumnDef<InventorySession>[] = [
		{ field: 'reference', headerName: t.stock.reference },
		{
			field: 'emplacement_name',
			headerName: t.stock.emplacement,
			filterSelectOptions: (locations.currentData ?? []).map((item) => ({ value: item.nom, label: item.nom })),
		},
		{
			field: 'status',
			headerName: t.stock.status,
			filterSelectOptions: stockInventoryStatusOptions.map((item) => ({
				value: item.value,
				label: { draft: t.stock.draft, validated: t.stock.validated, cancelled: t.stock.cancelled }[item.value],
			})),
		},
		{ field: 'date_created', headerName: t.common.dateCreation, type: 'date' },
	];
	return (
		<StockList
			testID="stock-inventories-list"
			query={query}
			controls={controls}
			columns={columns}
			header={
				<>
					{props.tabs}
					{!enabled && <StockDisabledState inventory />}
				</>
			}
			createAction={
				props.role === 'Caissier' && enabled
					? { label: t.stock.createInventory, onPress: () => router.push(STOCK_INVENTORIES_ADD(props.company_id)) }
					: undefined
			}
			renderRow={(record) => (
				<StockSessionCard
					record={record}
					kind="inventory"
					company_id={props.company_id}
					actions={
						<StockSessionActions
							record={record}
							kind="inventory"
							role={props.role}
							company_id={props.company_id}
							inventoryEnabled={enabled}
						/>
					}
				/>
			)}
		/>
	);
};

const StockInventoriesPage = () => {
	const params = useLocalSearchParams<{ company_id?: string | string[] }>();
	const { t } = useLanguage();
	const companyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<CompanyDocumentsWrapperList key={companyId ?? 'saved'} requestedCompanyId={companyId}>
			{(args) => (
				<StockFormWrapper company_id={args.company_id} requireStock={false}>
					{({ company }) => <StockInventoriesContent {...args} company={company} />}
				</StockFormWrapper>
			)}
		</CompanyDocumentsWrapperList>
	);
};

export default StockInventoriesPage;
