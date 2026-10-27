import { useState, type ComponentProps, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { LOGISTIQUE_SUPPLIER_ADD, LOGISTIQUE_SUPPLIER_EDIT, LOGISTIQUE_SUPPLIER_VIEW } from '@/utils/routes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import type { LogistiqueSupplier } from '@/types/logistiqueTypes';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import InfoRow from '@/components/shared/infoRow/infoRow';
import LogistiqueSupplierDeleteDialog from '@/components/shared/logistique/logistiqueSupplierDeleteDialog';
import QueryError from '@/components/shared/queryError/queryError';
import { useGetLogistiqueSuppliersInfiniteListInfiniteQuery } from '@/store/services/logistique';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { formatDate, formatNumberWithSpaces } from '@/utils/helpers';
import { MODULES_PAGE_SIZE, logistiqueManagerRoles } from '@/utils/rawData';
import { colors } from '@/utils/themes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const LogistiqueSuppliersContent = (props: Props) => {
	const { t } = useLanguage();
	const token = useInitAccessToken();
	const canDelete = props.role === 'Caissier';
	const canManage = logistiqueManagerRoles.has(props.role);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [confirmation, setConfirmation] = useState<LogistiqueSupplier | null>(null);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const query = useGetLogistiqueSuppliersInfiniteListInfiniteQuery(
		{
			...extractCustomFilterParams(filterModel).params,
			company_id: props.company_id,
			search: searchTerm,
			ordering,
			pageSize: MODULES_PAGE_SIZE,
		},
		{ skip: !token, refetchOnMountOrArgChange: true },
	);
	const rows = getInfiniteRows(query.currentData?.pages);
	const operators = getServerFilterOperators<LogistiqueSupplier>();
	const columns: ColumnDef<LogistiqueSupplier>[] = [
		{ field: 'nom', headerName: t.logistique.colFournisseur, filterOperators: operators.string },
		{ field: 'email', headerName: t.logistique.colSupplierEmail, filterOperators: operators.string },
		{
			field: 'total_dossiers',
			headerName: t.logistique.ordersCount,
			type: 'number',
			filterOperators: operators.number,
		},
		{
			field: 'derniere_activite',
			headerName: t.logistique.colLastActivity,
			type: 'datetime',
			filterOperators: operators.datetime,
		},
	];
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);

	if (query.isError && !query.currentData)
		return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
	return (
		<>
			<PaginatedDataGrid
				testID="logistique-suppliers-list"
				createAction={
					canManage
						? { label: t.logistique.supplierNew, onPress: () => router.push(LOGISTIQUE_SUPPLIER_ADD(props.company_id)) }
						: undefined
				}
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={query.currentData?.pages[0]?.count ?? 0}
				header={
					<>
						{props.tabs}
						{query.isError && !query.isFetchNextPageError && (
							<QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />
						)}
					</>
				}
				searchTerm={searchTerm}
				setSearchTerm={setSearchTerm}
				filterModel={filterModel}
				onFilterModelChange={setFilterModel}
				sorting={{ ordering, sortModel, onSortModelChange: setSortModel }}
				isLoading={query.isLoading || (query.isFetching && !query.currentData)}
				refreshing={query.isFetching && !!query.currentData && !query.isFetchingNextPage}
				onRefresh={() => {
					if (!query.isFetching) void query.refetch();
				}}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetching && !query.error) void query.fetchNextPage();
				}}
				loadMoreError={query.isFetchNextPageError}
				onRetryLoadMore={() => {
					if (!query.isFetching) void query.fetchNextPage();
				}}
				renderRow={(row) => (
					<ListCard
						testID={`logistique-supplier-${row.id}`}
						onPress={() => router.push(LOGISTIQUE_SUPPLIER_VIEW(row.id, props.company_id))}
						accessibilityLabel={`${t.logistique.supplierViewTitle}: ${row.nom}`}
						header={<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">{row.nom}</Text>}
						actions={
							<ListCardActions
								onEdit={canManage ? () => router.push(LOGISTIQUE_SUPPLIER_EDIT(row.id, props.company_id)) : undefined}
								onDelete={canDelete ? () => setConfirmation(row) : undefined}
							/>
						}
					>
						<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
							<InfoRow dense icon={icon('mail-outline')} label={t.logistique.colSupplierEmail} value={row.email} />
							<InfoRow
								dense
								icon={icon('folder-open')}
								label={t.logistique.ordersCount}
								value={formatNumberWithSpaces(row.total_dossiers, 0)}
							/>
							<InfoRow
								dense
								icon={icon('event')}
								label={t.logistique.colLastActivity}
								value={formatDate(row.derniere_activite)}
							/>
						</View>
					</ListCard>
				)}
			/>
			{confirmation && <LogistiqueSupplierDeleteDialog supplier={confirmation} onClose={() => setConfirmation(null)} />}
		</>
	);
};

const LogistiqueSuppliersPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<LogistiqueSuppliersContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);
export default LogistiqueSuppliersPage;
