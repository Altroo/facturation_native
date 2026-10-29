import type { ReactNode } from 'react';
import type { CompanyClass } from '@/models/classes';
import { useLocalSearchParams } from 'expo-router';
import type { ColumnDef } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockList, { useStockListControls } from '@/components/shared/stock/stockList';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useLanguage } from '@/utils/hooks';
import { parseEntityId } from '@/utils/helpers';
import type { StockMovement } from '@/types/stockTypes';
import { useGetStockMovementsInfiniteListInfiniteQuery } from '@/store/services/stock';
import StockMovementCard from '@/components/shared/stock/stockMovementCard';
import { stockMovementOptions } from '@/utils/rawData';
import { useGetEmplacementListQuery } from '@/store/services/parameter';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
	company: CompanyClass;
};

const StockMovementsContent = (props: Props) => {
	const { t } = useLanguage();
	const controls = useStockListControls(props.company_id);
	const query = useGetStockMovementsInfiniteListInfiniteQuery(controls.queryArgs, { refetchOnMountOrArgChange: true });
	const locations = useGetEmplacementListQuery({ company_id: props.company_id });
	const columns: ColumnDef<StockMovement>[] = [
		{ field: 'article_reference', headerName: t.stock.reference },
		{ field: 'article_designation', headerName: t.stock.designation },
		{
			field: 'emplacement_name',
			headerName: t.stock.emplacement,
			filterSelectOptions: (locations.currentData ?? []).map((item) => ({ value: item.nom, label: item.nom })),
		},
		{
			field: 'movement_type',
			headerName: t.stock.type,
			filterSelectOptions: stockMovementOptions.map((item) => ({ value: item.value, label: t.stock[item.value] })),
		},
		{ field: 'quantity', headerName: t.stock.quantity, type: 'number' },
		{ field: 'balance_after', headerName: t.stock.balanceAfter, type: 'number' },
		{ field: 'note', headerName: t.stock.source },
		{ field: 'date_created', headerName: t.common.dateCreation, type: 'date' },
	];
	return (
		<StockList
			testID="stock-movements-list"
			query={query}
			controls={controls}
			columns={columns}
			header={props.tabs}
			renderRow={(movement) => <StockMovementCard movement={movement} company_id={props.company_id} />}
		/>
	);
};

type LocalSearchParams = Omit<SearchParams, 'id'>;

const StockMovementsPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const { t } = useLanguage();
	const companyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<CompanyDocumentsWrapperList key={companyId ?? 'saved'} requestedCompanyId={companyId}>
			{(args) => (
				<StockFormWrapper company_id={args.company_id} requireStock={false}>
					{({ company }) => <StockMovementsContent {...args} company={company} />}
				</StockFormWrapper>
			)}
		</CompanyDocumentsWrapperList>
	);
};

export default StockMovementsPage;
