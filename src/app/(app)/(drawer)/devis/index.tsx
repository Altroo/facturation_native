import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import InfoRow from '@/components/shared/infoRow/infoRow';
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import DocumentStatus from '@/components/shared/documentStatus/documentStatus';
import DocumentPdfModal from '@/components/shared/documentPdfModal/documentPdfModal';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import {
	useGetDevisInfiniteListInfiniteQuery,
	useLazyGetDevisListQuery,
	useDeleteDeviMutation,
	useBulkDeleteDevisMutation,
} from '@/store/services/devi';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetModePaiementListQuery } from '@/store/services/parameter';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, formatDate, formatNumberWithSpaces, getStatutLabel } from '@/utils/helpers';
import { openDevisPdf } from '@/utils/apiHelpers';
import { MODULES_PAGE_SIZE, devisFactureStatusItemsList } from '@/utils/rawData';
import { DEVIS_ADD, DEVIS_EDIT, DEVIS_VIEW } from '@/utils/routes';
import { colors } from '@/utils/themes';
import type { DeviClass } from '@/models/classes';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = { company_id: number; role: string; tabs: ReactNode };

const DevisListContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const canEdit = props.role === 'Caissier' || props.role === 'Commercial';
	const canDelete = props.role === 'Caissier';
	const canPrint = canView && props.role !== 'Lecture';
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [loadingIds, setLoadingIds] = useState(false);
	const [confirmation, setConfirmation] = useState<{ ids: number[]; bulk: boolean } | null>(null);
	const [pdfId, setPdfId] = useState<number | null>(null);
	const [deleteDevi, deleting] = useDeleteDeviMutation();
	const [bulkDeleteDevis, bulkDeleting] = useBulkDeleteDevisMutation();
	const [fetchAllIds] = useLazyGetDevisListQuery();
	const pendingSelection = useRef<ReturnType<typeof fetchAllIds> | null>(null);
	const selectionRequest = useRef(0);
	const pendingDelete = useRef(false);
	const busy = deleting.isLoading || bulkDeleting.isLoading;
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	// The web column is date_devis, but Django names its range date_after/before.
	// Map before serialization so AND and OR groups both retain correct bounds.
	const serverFilters = {
		...filterModel,
		items: filterModel.items.map((item) => (item.field === 'date_devis' ? { ...item, field: 'date' } : item)),
	};
	const queryArgs: DevisQueryParams = {
		...extractCustomFilterParams(serverFilters).params,
		company_id: props.company_id,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const query = useGetDevisInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const clientsQuery = useGetClientsListQuery(
		{ company_id: props.company_id, with_pagination: false },
		{ skip: !token || !canView },
	);
	const modesQuery = useGetModePaiementListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const data = query.currentData;
	const rows = getInfiniteRows(data?.pages);
	const count = data?.pages[0]?.count ?? 0;
	const clients = Array.isArray(clientsQuery.currentData) ? clientsQuery.currentData : [];
	const disabled = busy || loadingIds;
	useEffect(
		() => () => {
			selectionRequest.current += 1;
			pendingSelection.current?.abort();
			pendingSelection.current?.unsubscribe();
		},
		[],
	);
	const cancelSelection = () => {
		selectionRequest.current += 1;
		pendingSelection.current?.abort();
		pendingSelection.current?.unsubscribe();
		pendingSelection.current = null;
		setLoadingIds(false);
	};
	const clearSelection = () => {
		cancelSelection();
		setSelectedIds([]);
		setConfirmation(null);
	};
	const selectAll = async () => {
		if (!canDelete || pendingSelection.current || busy || query.isFetching) return;
		const requestId = ++selectionRequest.current;
		setLoadingIds(true);
		const request = fetchAllIds({ ...queryArgs, with_pagination: false }, false);
		pendingSelection.current = request;
		try {
			const result = await request.unwrap();
			if (requestId !== selectionRequest.current) return;
			if (!Array.isArray(result) || result.some((item) => !Number.isSafeInteger(item.id) || Number(item.id) <= 0)) {
				onError(t.common.genericError);
				return;
			}
			setSelectedIds([...new Set(result.map((item) => item.id!))]);
		} catch (error) {
			if (requestId === selectionRequest.current) onError(extractApiErrorMessage(error, t.common.genericError));
		} finally {
			request.unsubscribe();
			if (requestId === selectionRequest.current) {
				pendingSelection.current = null;
				setLoadingIds(false);
			}
		}
	};
	const confirmDelete = async () => {
		if (!canDelete || !confirmation || pendingDelete.current) return;
		pendingDelete.current = true;
		try {
			if (confirmation.bulk) {
				await bulkDeleteDevis({ ids: confirmation.ids }).unwrap();
				onSuccess(t.documentList.bulkDeleteSuccess(confirmation.ids.length, t.navigation.devis));
			} else {
				await deleteDevi({ id: confirmation.ids[0] }).unwrap();
				onSuccess(t.devis.deleteSuccess);
			}
			clearSelection();
		} catch (error) {
			onError(extractApiErrorMessage(error, t.devis.deleteError));
		} finally {
			pendingDelete.current = false;
			setConfirmation(null);
		}
	};
	const columns: ColumnDef<DeviClass>[] = (
		[
			{ field: 'numero_devis', headerName: t.devis.colNumeroDevis },
			{
				field: 'client_name',
				headerName: t.documentList.colClient,
				filterSelectOptions: [
					...new Set(
						[
							...clients.map(
								(client) => client.raison_sociale || [client.nom, client.prenom].filter(Boolean).join(' '),
							),
							...rows.map((row) => row.client_name),
						].filter((name): name is string => !!name),
					),
				].map((name) => ({ value: name, label: name })),
			},
			{ field: 'numero_demande_prix_client', headerName: t.devis.colNumeroDemandePrix },
			{
				field: 'statut',
				headerName: t.documentList.colStatut,
				filterSelectOptions: devisFactureStatusItemsList
					.filter((item) => item.value)
					.map((item) => ({ value: item.value, label: getStatutLabel(item.value, t) })),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
			{ field: 'total_ttc_apres_remise', headerName: t.documentList.colTotalTTC, type: 'number' },
			{ field: 'lignes_count', headerName: t.documentList.colNombreArticles, type: 'number' },
			{ field: 'date_devis', headerName: t.devis.colDateDevis, type: 'date' },
			{
				field: 'mode_paiement_ids',
				headerName: t.devis.filterModePaiement,
				sortable: false,
				filterSelectOptions: (modesQuery.currentData ?? []).map((mode) => ({
					value: String(mode.id),
					label: mode.nom,
				})),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
		] satisfies ColumnDef<DeviClass>[]
	).map((column) => ({
		...column,
		filterOperators:
			getServerFilterOperators<DeviClass>()[
				column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'string'
			],
	}));
	const navigate = (row: DeviClass, editing = false) => {
		const route = editing ? DEVIS_EDIT(row.id) : DEVIS_VIEW(row.id);
		router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
	};
	const refresh = () => {
		if (!query.isFetching && !disabled) {
			clearSelection();
			void query.refetch();
		}
	};
	if (!canView)
		return (
			<View className="flex-1">
				<View className="p-4">{props.tabs}</View>
				<NoPermission />
			</View>
		);
	return (
		<>
			<PaginatedDataGrid<DeviClass>
				testID="devis-grid"
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={count}
				header={
					<>
						{props.tabs}
						{[clientsQuery, modesQuery].map((item, index) =>
							item.isError ? (
								<QueryError key={index} variant="banner" error={item.error} onRetry={() => void item.refetch()} />
							) : null,
						)}
						{!!query.error && !query.isFetchNextPageError && (
							<QueryError variant="banner" error={query.error} onRetry={refresh} />
						)}
					</>
				}
				createAction={
					canEdit
						? {
								label: t.devis.newDevis,
								onPress: () => router.push({ pathname: DEVIS_ADD, params: { company_id: String(props.company_id) } }),
							}
						: undefined
				}
				selectionControl={
					canDelete &&
					count > 0 && (
						<SelectAllControl
							compact
							accessibilityLabel={selectedIds.length ? t.shared.clearSelection : t.shared.selectAllMatching(count)}
							description={t.shared.matchingItems(count)}
							checked={selectedIds.length === count ? true : selectedIds.length ? 'mixed' : false}
							selectedCount={selectedIds.length}
							loading={loadingIds}
							disabled={busy || query.isFetching}
							onPress={selectedIds.length ? clearSelection : () => void selectAll()}
						/>
					)
				}
				selectionActions={
					canDelete && (
						<PrimaryLoadingButton
							buttonText={t.documentList.bulkDeleteBtn(selectedIds.length)}
							active={!disabled && !query.isFetching}
							loading={busy}
							danger
							inverted
							onClick={() => setConfirmation({ ids: [...selectedIds], bulk: true })}
						/>
					)
				}
				selectedIds={selectedIds}
				isLoading={query.isLoading || (query.isFetching && !data)}
				disabled={disabled}
				searchTerm={searchTerm}
				setSearchTerm={(value) => {
					clearSelection();
					setSearchTerm(value);
				}}
				filterModel={filterModel}
				onFilterModelChange={(value) => {
					clearSelection();
					setFilterModel(value);
				}}
				sorting={{
					ordering,
					sortModel,
					onSortModelChange: (value) => {
						clearSelection();
						setSortModel(value);
					},
				}}
				onRefresh={refresh}
				refreshing={query.isFetching && !!data && !query.isFetchingNextPage}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetching && !query.error && !disabled) void query.fetchNextPage();
				}}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				loadMoreError={query.isFetchNextPageError}
				onRetryLoadMore={() => {
					if (!query.isFetching && !disabled) void query.fetchNextPage();
				}}
				renderRow={(row) => (
					<ListCard
						testID={`devis-card-${row.id}`}
						disabled={disabled}
						onPress={() => navigate(row)}
						accessibilityLabel={`${t.common.view} ${row.numero_devis}`}
						selection={
							canDelete
								? {
										label: `${t.shared.selectAll}: ${row.numero_devis}`,
										checked: selectedIds.includes(row.id),
										disabled,
										onChange: () => {
											cancelSelection();
											setSelectedIds((previous) =>
												previous.includes(row.id) ? previous.filter((id) => id !== row.id) : [...previous, row.id],
											);
										},
									}
								: undefined
						}
						header={
							<Text className="font-poppins-semibold text-lg text-ink dark:text-slate-100">{row.numero_devis}</Text>
						}
						actions={
							<ListCardActions
								disabled={disabled}
								onEdit={canEdit ? () => navigate(row, true) : undefined}
								onDelete={canDelete ? () => setConfirmation({ ids: [row.id], bulk: false }) : undefined}
								extraActions={[
									...(canPrint
										? [
												{
													label: t.common.print,
													onClick: () => setPdfId(row.id),
													icon: <MaterialIcons name="picture-as-pdf" size={22} color={colors.brand} />,
												},
											]
										: []),
									...(canEdit
										? [
												{
													label: t.devis.labelFactureProforma,
													disabled: true,
													onClick: () => undefined,
													icon: <MaterialIcons name="receipt-long" size={22} color={colors.slate[400]} />,
												},
												{
													label: t.devis.labelFactureClient,
													disabled: true,
													onClick: () => undefined,
													icon: <MaterialIcons name="receipt" size={22} color={colors.slate[400]} />,
												},
											]
										: []),
								]}
							/>
						}
					>
						<DocumentStatus statut={row.statut} />
						<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
							<InfoRow
								dense
								icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
								label={t.documentList.colClient}
								value={row.client_name}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
								label={t.devis.colDateDevis}
								value={formatDate(row.date_devis, false)}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="payments" size={18} color={colors.brand} />}
								label={t.documentList.colTotalTTC}
								value={`${formatNumberWithSpaces(row.total_ttc_apres_remise ?? 0, 2)} ${row.devise || 'MAD'}`}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
								label={t.documentList.colNombreArticles}
								value={row.lignes_count}
							/>
						</View>
					</ListCard>
				)}
			/>
			{confirmation && (
				<ConfirmationModal
					title={confirmation.bulk ? t.documentList.bulkDeleteTitle(confirmation.ids.length) : t.devis.deleteModalTitle}
					body={t.common.irreversible}
					recordName={confirmation.bulk ? undefined : rows.find((row) => row.id === confirmation.ids[0])?.numero_devis}
					action="delete"
					confirmText={t.common.delete}
					loading={busy}
					onClose={() => {
						if (!pendingDelete.current) setConfirmation(null);
					}}
					onConfirm={() => void confirmDelete()}
				/>
			)}
			{pdfId !== null && (
				<DocumentPdfModal
					onClose={() => setPdfId(null)}
					onOpen={(type, language) => openDevisPdf(pdfId, props.company_id, type, language)}
				/>
			)}
		</>
	);
};

const DevisListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<DevisListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default DevisListPage;
