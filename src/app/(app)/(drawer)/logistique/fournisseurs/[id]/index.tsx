import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import type { ColumnDef, SortModel } from 'expo-flash-datagrid';
import type { LogistiqueOrder } from '@/types/logistiqueTypes';
import { useGetLogistiqueSupplierQuery, useGetLogistiqueInfiniteListInfiniteQuery } from '@/store/services/logistique';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { parseEntityId } from '@/utils/helpers';
import { LOGISTIQUE_SUPPLIERS, LOGISTIQUE_SUPPLIER_EDIT } from '@/utils/routes';
import { MODULES_PAGE_SIZE, logistiqueManagerRoles } from '@/utils/rawData';
import { colors, listSpacing } from '@/utils/themes';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EmptyState from '@/components/shared/emptyState/emptyState';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import LogistiqueCard from '@/components/shared/logistique/logistiqueCard';
import LogistiqueSupplierDeleteDialog from '@/components/shared/logistique/logistiqueSupplierDeleteDialog';
import ListFooter from '@/components/shared/listFooter/listFooter';
import DataGridToolbar from '@/components/shared/paginatedDataGrid/dataGridToolbar';
import { getInfiniteRows, extractCustomFilterParams } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';

type Props = {
	id: number;
	company_id: number;
	role: string;
};

const SupplierViewContent = (props: Props) => {
	const { t } = useLanguage();
	const token = useInitAccessToken();
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [showDelete, setShowDelete] = useState(false);
	const query = useGetLogistiqueSupplierQuery(
		{ id: props.id, company_id: props.company_id },
		{ skip: !token, refetchOnMountOrArgChange: true },
	);
	const supplier = query.currentData;
	const belongsToCompany = supplier?.company === props.company_id;
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	// Search and sorting stay on Django and always include the supplier's record
	// ID. Changing the search can never expose another supplier's dossiers.
	const dossiers = useGetLogistiqueInfiniteListInfiniteQuery(
		{
			company_id: props.company_id,
			fournisseur_record: props.id,
			search: searchTerm,
			ordering,
			pageSize: MODULES_PAGE_SIZE,
		},
		{ skip: !token || !belongsToCompany, refetchOnMountOrArgChange: true },
	);
	const rows = getInfiniteRows(dossiers.currentData?.pages);
	const canEdit = logistiqueManagerRoles.has(props.role);
	const canDelete = props.role === 'Caissier';
	const columns: ColumnDef<LogistiqueOrder>[] = [
		{ field: 'numero_commande', headerName: t.logistique.colNumero, filterable: false },
		{ field: 'statut_global', headerName: t.logistique.colStatut, filterable: false },
		{ field: 'date_prevue', headerName: t.logistique.colDatePrevue, type: 'date', filterable: false },
	];
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const loadMore = () => {
		if (dossiers.hasNextPage && !dossiers.isFetching && !dossiers.error) void dossiers.fetchNextPage();
	};
	if (!supplier)
		return query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : <ApiProgress />;
	if (!belongsToCompany) return <NoPermission />;
	return (
		<>
			<DetailsPage
				refreshing={query.isFetching || (dossiers.isFetching && !dossiers.isFetchingNextPage)}
				onRefresh={() => {
					if (!query.isFetching) void query.refetch();
					if (!dossiers.isFetching && !dossiers.isUninitialized) void dossiers.refetch();
				}}
				onEndReached={loadMore}
				actions={
					canEdit || canDelete ? (
						<DetailsPageActions
							onEdit={canEdit ? () => router.push(LOGISTIQUE_SUPPLIER_EDIT(props.id, props.company_id)) : undefined}
							onDelete={canDelete ? () => setShowDelete(true) : undefined}
						/>
					) : undefined
				}
			>
				{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
				<SectionCard title={t.logistique.supplierIdentity} icon="business">
					<InfoRow dense icon={icon('business')} label={t.logistique.supplierName} value={supplier.nom} />
					<InfoRow dense icon={icon('mail-outline')} label={t.logistique.colSupplierEmail} value={supplier.email} />
				</SectionCard>
				<SectionCard
					title={t.logistique.supplierDossiers}
					icon="description"
					count={supplier.total_dossiers}
					variant="list"
				>
					<DataGridToolbar
						embedded
						unframed
						columns={columns}
						loadedCount={rows.length}
						rowCount={dossiers.currentData?.pages[0]?.count ?? 0}
						searchTerm={searchTerm}
						setSearchTerm={setSearchTerm}
						sorting={{ ordering, sortModel, onSortModelChange: setSortModel }}
						serializeFilters={extractCustomFilterParams}
					/>
					{dossiers.isError && !dossiers.isFetchNextPageError && (
						<QueryError variant="banner" error={dossiers.error} onRetry={() => void dossiers.refetch()} />
					)}
					{dossiers.isLoading || (dossiers.isFetching && !dossiers.currentData) ? (
						<ActivityIndicator color={colors.brand} accessibilityLabel={t.common.loading} className="py-8" />
					) : !rows.length && !dossiers.isError ? (
						<EmptyState message={t.common.noResults} />
					) : (
						<View style={{ marginVertical: -listSpacing / 2 }}>
							{rows.map((order) => (
								<LogistiqueCard key={order.id} order={order} summary />
							))}
						</View>
					)}
					<ListFooter
						rowsCount={rows.length}
						hasNextPage={dossiers.hasNextPage}
						loading={dossiers.isFetchingNextPage}
						error={dossiers.isFetchNextPageError}
						onRetry={() => {
							if (!dossiers.isFetching) void dossiers.fetchNextPage();
						}}
					/>
				</SectionCard>
			</DetailsPage>
			{showDelete && (
				<LogistiqueSupplierDeleteDialog
					supplier={supplier}
					onClose={() => setShowDelete(false)}
					onDeleted={() => router.dismissTo(LOGISTIQUE_SUPPLIERS)}
				/>
			)}
		</>
	);
};

const LogistiqueSupplierViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const invalid = id === null || company_id === null;
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const memberships = useGetUserCompaniesQuery(undefined, { skip: !token || invalid });
	const company = memberships.currentData?.find((item) => item.id === company_id);
	if (invalid) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || memberships.isLoading || memberships.isUninitialized) return <ApiProgress />;
	if (memberships.isError) return <QueryError error={memberships.error} onRetry={() => void memberships.refetch()} />;
	if (!company) return <NoPermission />;
	return <SupplierViewContent key={`${company.id}:${id}`} company_id={company.id} id={id} role={company.role} />;
};

export default LogistiqueSupplierViewPage;
