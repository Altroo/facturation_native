import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { FilterModel, SortModel } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import { extractCustomFilterParams } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetFactureProFormaInfiniteListInfiniteQuery,
	useLazyGetFactureProFormaListQuery,
	useDeleteFactureProFormaMutation,
	useBulkDeleteFactureProFormaMutation,
	useConvertFactureProFormaToFactureMutation,
} from '@/store/services/factureProForma';
import { useInitAccessToken } from '@/contexts/InitContext';
import { openFactureProFormaPdf } from '@/utils/apiHelpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const FactureProFormaListContent = (props: Props) => {
	const token = useInitAccessToken();
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	// Django names each document's date range date_after/date_before.
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
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const query = useGetFactureProFormaInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const [fetchAllIds] = useLazyGetFactureProFormaListQuery();
	const [deleteRecord, deleting] = useDeleteFactureProFormaMutation();
	const [bulkDeleteRecords, bulkDeleting] = useBulkDeleteFactureProFormaMutation();
	const [convertToInvoice, converting] = useConvertFactureProFormaToFactureMutation();
	return (
		<CompanyDocumentsListContent
			{...props}
			documentType="facture-pro-forma"
			queryArgs={queryArgs}
			query={query}
			fetchAllIds={fetchAllIds}
			deleteRecord={deleteRecord}
			bulkDeleteRecords={bulkDeleteRecords}
			convertToInvoice={convertToInvoice}
			busy={deleting.isLoading || bulkDeleting.isLoading || converting.isLoading}
			searchTerm={searchTerm}
			setSearchTerm={setSearchTerm}
			sortModel={sortModel}
			setSortModel={setSortModel}
			filterModel={filterModel}
			setFilterModel={setFilterModel}
			openPdf={(id, type, language) => openFactureProFormaPdf(id, props.company_id, type, language)}
		/>
	);
};

const FactureProFormaListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<FactureProFormaListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default FactureProFormaListPage;
