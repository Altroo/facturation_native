import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { FilterModel, SortModel } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import CompanyDocumentStats from '@/components/shared/company-documents-list/companyDocumentStats';
import { extractCustomFilterParams } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetFactureAvoirInfiniteListInfiniteQuery,
	useLazyGetFactureAvoirListQuery,
	useDeleteFactureAvoirMutation,
	useBulkDeleteFactureAvoirMutation,
} from '@/store/services/factureAvoir';
import { useGetCompanyQuery } from '@/store/services/company';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { openFactureAvoirPdf } from '@/utils/apiHelpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { colors } from '@/utils/themes';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const FactureAvoirListContent = (props: Props) => {
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const companyQuery = useGetCompanyQuery({ id: props.company_id }, { skip: !token || !canView });
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const serverFilters = {
		...filterModel,
		items: filterModel.items.map((item) => (item.field === 'date_avoir' ? { ...item, field: 'date' } : item)),
	};
	const queryArgs: DevisQueryParams = {
		...extractCustomFilterParams(serverFilters).params,
		company_id: props.company_id,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const query = useGetFactureAvoirInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const [fetchAllIds] = useLazyGetFactureAvoirListQuery();
	const [deleteRecord, deleting] = useDeleteFactureAvoirMutation();
	const [bulkDeleteRecords, bulkDeleting] = useBulkDeleteFactureAvoirMutation();
	return (
		<CompanyDocumentsListContent
			{...props}
			documentType="facture-avoir"
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
			openPdf={(id, type, language) => openFactureAvoirPdf(id, props.company_id, type, language)}
			header={
				<CompanyDocumentStats
					usesForeignCurrency={companyQuery.currentData?.uses_foreign_currency === true}
					statsByCurrency={query.currentData?.pages[0]?.stats_by_currency}
					error={companyQuery.isError ? companyQuery.error : undefined}
					onRetry={() => void companyQuery.refetch()}
					statistics={[
						{ label: t.facturesAvoir.statsAvoirs, field: 'total_avoirs', icon: 'cancel', color: colors.danger },
						{ label: t.facturesAvoir.statsTva, field: 'total_tva', icon: 'percent', color: colors.warning },
					]}
				/>
			}
		/>
	);
};

const FactureAvoirListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<FactureAvoirListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default FactureAvoirListPage;
