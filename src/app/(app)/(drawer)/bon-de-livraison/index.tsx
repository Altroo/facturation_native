import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { FilterModel, SortModel } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import { extractCustomFilterParams } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetBonDeLivraisonInfiniteListInfiniteQuery,
	useLazyGetBonDeLivraisonListQuery,
	useDeleteBonDeLivraisonMutation,
	useBulkDeleteBonDeLivraisonMutation,
} from '@/store/services/bonDeLivraison';
import { useGetLivreParListQuery } from '@/store/services/parameter';
import QueryError from '@/components/shared/queryError/queryError';
import { useInitAccessToken } from '@/contexts/InitContext';
import { openBonDeLivraisonPdf } from '@/utils/apiHelpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const BonDeLivraisonListContent = (props: Props) => {
	const token = useInitAccessToken();
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	// Django names each document's date range date_after/date_before.
	const serverFilters = {
		...filterModel,
		items: filterModel.items.map((item) => (item.field === 'date_bon_livraison' ? { ...item, field: 'date' } : item)),
	};
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs: DevisQueryParams = {
		...extractCustomFilterParams(serverFilters).params,
		company_id: props.company_id,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const query = useGetBonDeLivraisonInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const deliveryQuery = useGetLivreParListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const [fetchAllIds] = useLazyGetBonDeLivraisonListQuery();
	const [deleteRecord, deleting] = useDeleteBonDeLivraisonMutation();
	const [bulkDeleteRecords, bulkDeleting] = useBulkDeleteBonDeLivraisonMutation();
	return (
		<CompanyDocumentsListContent
			{...props}
			documentType="bon-de-livraison"
			deliveryPeople={deliveryQuery.currentData}
			header={
				deliveryQuery.isError ? (
					<QueryError variant="banner" error={deliveryQuery.error} onRetry={() => void deliveryQuery.refetch()} />
				) : undefined
			}
			queryArgs={queryArgs}
			query={query}
			fetchAllIds={fetchAllIds}
			deleteRecord={deleteRecord}
			bulkDeleteRecords={bulkDeleteRecords}
			busy={deleting.isLoading || bulkDeleting.isLoading}
			searchTerm={searchTerm}
			setSearchTerm={setSearchTerm}
			sortModel={sortModel}
			setSortModel={setSortModel}
			filterModel={filterModel}
			setFilterModel={setFilterModel}
			openPdf={(id, type, language) => openBonDeLivraisonPdf(id, props.company_id, type, language)}
		/>
	);
};

const BonDeLivraisonListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<BonDeLivraisonListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default BonDeLivraisonListPage;
