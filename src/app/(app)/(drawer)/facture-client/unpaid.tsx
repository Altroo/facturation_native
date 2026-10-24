import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { FilterModel, SortModel } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import FactureClientListContent from '@/components/shared/facture-client/factureClientListContent';
import { extractCustomFilterParams } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetFactureClientUnpaidInfiniteListInfiniteQuery,
	useLazyGetFactureClientListQuery,
	useDeleteFactureClientMutation,
	useBulkDeleteFactureClientMutation,
} from '@/store/services/factureClient';
import { useGetCompanyQuery } from '@/store/services/company';
import { useInitAccessToken } from '@/contexts/InitContext';
import { openFactureClientPdf } from '@/utils/apiHelpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const UnpaidInvoices = (props: Props) => {
	const token = useInitAccessToken();
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const companyQuery = useGetCompanyQuery({ id: props.company_id }, { skip: !token || !canView });
	const serverFilters = {
		...filterModel,
		items: filterModel.items.map((item) => (item.field === 'date_facture' ? { ...item, field: 'date' } : item)),
	};
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs: DevisQueryParams = {
		...extractCustomFilterParams(serverFilters).params,
		company_id: props.company_id,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const query = useGetFactureClientUnpaidInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const [fetchAllIds] = useLazyGetFactureClientListQuery();
	const [deleteRecord, deleting] = useDeleteFactureClientMutation();
	const [bulkDeleteRecords, bulkDeleting] = useBulkDeleteFactureClientMutation();
	return (
		<FactureClientListContent
			{...props}
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
			bulkDeleteEnabled={false}
			printingEnabled={false}
			openPdf={(id, type, language) => openFactureClientPdf(id, props.company_id, type, language)}
			usesForeignCurrency={companyQuery.currentData?.uses_foreign_currency === true}
			statsByCurrency={query.currentData?.pages[0]?.stats_by_currency}
			companyError={companyQuery.isError ? companyQuery.error : undefined}
			onRetryCompany={() => void companyQuery.refetch()}
		/>
	);
};

const FactureClientUnpaidListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<UnpaidInvoices
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default FactureClientUnpaidListPage;
