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

import type { StockBalance } from '@/types/stockTypes';
import { useGetStockBalancesInfiniteListInfiniteQuery } from '@/store/services/stock';
import StockBalanceCard from '@/components/shared/stock/stockBalanceCard';
import StockDisabledState from '@/components/shared/stock/stockDisabledState';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import { STOCK_ADD } from '@/utils/routes';
import { stockStateOptions } from '@/utils/rawData';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
	company: CompanyClass;
};

const StockBalancesContent = (props: Props) => {
	const { t } = useLanguage();
	const controls = useStockListControls(props.company_id);
	const enabled = props.company.stock_management_enabled;
	const query = useGetStockBalancesInfiniteListInfiniteQuery(controls.queryArgs, {
		skip: !enabled,
		refetchOnMountOrArgChange: true,
	});
	const locations = useGetEmplacementListQuery({ company_id: props.company_id }, { skip: !enabled });
	const columns: ColumnDef<StockBalance>[] = [
		{ field: 'article_reference', headerName: t.stock.reference },
		{ field: 'article_designation', headerName: t.stock.designation },
		{
			field: 'emplacement_name',
			headerName: t.stock.emplacement,
			filterSelectOptions: (locations.currentData ?? []).map((item) => ({ value: item.nom, label: item.nom })),
		},
		{ field: 'physical_quantity', headerName: t.stock.physical, type: 'number' },
		{ field: 'reserved_quantity', headerName: t.stock.reserved, type: 'number' },
		{ field: 'available_quantity', headerName: t.stock.available, type: 'number', filterable: false },
		{ field: 'stock_minimum', headerName: t.stock.minimum, type: 'number' },
		{
			field: 'stock_state',
			headerName: t.stock.state,
			sortable: false,
			filterSelectOptions: stockStateOptions.map((item) => ({
				value: item.id,
				label: {
					disponible: t.stock.availableState,
					minimum: t.stock.minimumState,
					a_approvisionner: t.stock.supplyState,
				}[item.id],
			})),
		},
	];
	// Keep company tabs reachable when this company's Stock setting is off.
	if (!enabled)
		return (
			<DetailsPage>
				{props.tabs}
				<StockDisabledState />
			</DetailsPage>
		);
	return (
		<StockList
			testID="stock-balances-list"
			query={query}
			controls={controls}
			columns={columns}
			header={props.tabs}
			createAction={
				props.role === 'Caissier'
					? { label: t.stock.adjust, onPress: () => router.push(STOCK_ADD(props.company_id)) }
					: undefined
			}
			renderRow={(balance) => (
				<StockBalanceCard balance={balance} company_id={props.company_id} canAdjust={props.role === 'Caissier'} />
			)}
		/>
	);
};

const StockBalancesPage = () => {
	const params = useLocalSearchParams<{ company_id?: string | string[] }>();
	const { t } = useLanguage();
	const companyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<CompanyDocumentsWrapperList key={companyId ?? 'saved'} requestedCompanyId={companyId}>
			{(args) => (
				<StockFormWrapper company_id={args.company_id} requireStock={false}>
					{({ company }) => <StockBalancesContent {...args} company={company} />}
				</StockFormWrapper>
			)}
		</CompanyDocumentsWrapperList>
	);
};

export default StockBalancesPage;
