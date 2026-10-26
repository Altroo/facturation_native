import type { ReactNode } from 'react';
import type { CompanyClass } from '@/models/classes';
import { router, useLocalSearchParams } from 'expo-router';
import type { ColumnDef } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockList, { useStockListControls } from '@/components/shared/stock/stockList';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useLanguage } from '@/utils/hooks';
import { parseEntityId } from '@/utils/helpers';
import type { StockReceipt } from '@/types/stockTypes';
import { useGetStockReceiptsInfiniteListInfiniteQuery } from '@/store/services/stock';
import StockSessionCard from '@/components/shared/stock/stockSessionCard';
import StockSessionActions from '@/components/shared/stock/stockSessionActions';
import { STOCK_RECEIPTS_ADD } from '@/utils/routes';
import { stockReceiptStatusOptions } from '@/utils/rawData';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
	company: CompanyClass;
};

const StockReceiptsContent = (props: Props) => {
	const { t } = useLanguage();
	const controls = useStockListControls(props.company_id);
	const query = useGetStockReceiptsInfiniteListInfiniteQuery(controls.queryArgs, { refetchOnMountOrArgChange: true });
	const columns: ColumnDef<StockReceipt>[] = [
		{ field: 'reference', headerName: t.stock.reference },
		{ field: 'logistics_order_number', headerName: t.stock.logisticsOrder },
		{ field: 'created_by_name', headerName: t.stock.createdBy },
		{
			field: 'status',
			headerName: t.stock.status,
			filterSelectOptions: stockReceiptStatusOptions.map((item) => ({
				value: item.value,
				label: { draft: t.stock.draft, validated: t.stock.validatedReceipt, cancelled: t.stock.cancelledReceipt }[
					item.value
				],
			})),
		},
		{ field: 'date_created', headerName: t.common.dateCreation, type: 'date' },
	];
	return (
		<StockList
			testID="stock-receipts-list"
			query={query}
			controls={controls}
			columns={columns}
			header={props.tabs}
			createAction={
				props.role === 'Logistique' && props.company.stock_management_enabled
					? { label: t.stock.createReceipt, onPress: () => router.push(STOCK_RECEIPTS_ADD(props.company_id)) }
					: undefined
			}
			renderRow={(record) => (
				<StockSessionCard
					record={record}
					kind="receipt"
					company_id={props.company_id}
					actions={
						<StockSessionActions
							record={record}
							kind="receipt"
							role={props.role}
							company_id={props.company_id}
							disabled={!props.company.stock_management_enabled}
						/>
					}
				/>
			)}
		/>
	);
};

const StockReceiptsPage = () => {
	const params = useLocalSearchParams<{ company_id?: string | string[] }>();
	const { t } = useLanguage();
	const companyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<CompanyDocumentsWrapperList key={companyId ?? 'saved'} requestedCompanyId={companyId}>
			{(args) => (
				<StockFormWrapper company_id={args.company_id} requireStock={false}>
					{({ company }) => <StockReceiptsContent {...args} company={company} />}
				</StockFormWrapper>
			)}
		</CompanyDocumentsWrapperList>
	);
};

export default StockReceiptsPage;
