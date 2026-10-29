import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import type { ReglementClass } from '@/models/classes';
import type { DevisQueryParams } from '@/types/devisTypes';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import CompanyDocumentStats from '@/components/shared/company-documents-list/companyDocumentStats';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ReglementCard from '@/components/shared/reglements/reglementCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import DocumentPdfModal from '@/components/shared/documentPdfModal/documentPdfModal';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import {
	useGetReglementsInfiniteListInfiniteQuery,
	useLazyGetReglementsListQuery,
	useDeleteReglementMutation,
	useBulkDeleteReglementsMutation,
	usePatchReglementStatutMutation,
} from '@/store/services/reglement';
import { useGetCompanyQuery } from '@/store/services/company';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetModePaiementListQuery } from '@/store/services/parameter';
import { getUserCompaniesState } from '@/store/selectors';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, getStatutLabel } from '@/utils/helpers';
import { openReglementPdf } from '@/utils/apiHelpers';
import { REGLEMENTS_ADD, REGLEMENTS_EDIT } from '@/utils/routes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { colors } from '@/utils/themes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const ReglementsListContent = (props: Props) => {
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const membership = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = ['Caissier', 'Comptable', 'Commercial', 'Lecture'].includes(props.role);
	const canCreate = props.role === 'Caissier' || props.role === 'Commercial';
	const canDelete = props.role === 'Caissier';
	// The web exposes edit/cancel in the list only to cashiers allowed to change status.
	const canChange = canDelete && membership?.can_change_document_status === true;
	const canPrint = canView && props.role !== 'Lecture';
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [loadingIds, setLoadingIds] = useState(false);
	const [confirmation, setConfirmation] = useState<{ ids: number[]; action: 'delete' | 'bulk' | 'cancel' } | null>(
		null,
	);
	const [pdfId, setPdfId] = useState<number | null>(null);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs: DevisQueryParams = {
		...extractCustomFilterParams(filterModel).params,
		company_id: props.company_id,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const query = useGetReglementsInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const companyQuery = useGetCompanyQuery({ id: props.company_id }, { skip: !token || !canView });
	const clientsQuery = useGetClientsListQuery(
		{ company_id: props.company_id, with_pagination: false },
		{ skip: !token || !canView },
	);
	const modesQuery = useGetModePaiementListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const [fetchAllIds] = useLazyGetReglementsListQuery();
	const [deleteRecord, deleting] = useDeleteReglementMutation();
	const [bulkDelete, bulkDeleting] = useBulkDeleteReglementsMutation();
	const [cancelRecord, cancelling] = usePatchReglementStatutMutation();
	const busy = deleting.isLoading || bulkDeleting.isLoading || cancelling.isLoading;
	const disabled = busy || loadingIds;
	const pending = useRef(false);
	const selectionRequest = useRef(0);
	const pendingSelection = useRef<ReturnType<typeof fetchAllIds> | null>(null);
	const rows = getInfiniteRows(query.currentData?.pages);
	const count = query.currentData?.pages[0]?.count ?? 0;
	useEffect(
		() => () => {
			selectionRequest.current += 1;
			pendingSelection.current?.abort();
			pendingSelection.current?.unsubscribe();
		},
		[],
	);
	const clearSelection = () => {
		selectionRequest.current += 1;
		pendingSelection.current?.abort();
		pendingSelection.current?.unsubscribe();
		pendingSelection.current = null;
		setLoadingIds(false);
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
			const response = await request.unwrap();
			if (requestId !== selectionRequest.current) return;
			const records = Array.isArray(response) ? response : response.results;
			if (!Array.isArray(records) || records.some((item) => !Number.isSafeInteger(item.id) || item.id <= 0)) {
				onError(t.common.genericError);
				return;
			}
			setSelectedIds([...new Set(records.map((item) => item.id))]);
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
	const confirm = async () => {
		if (!confirmation || pending.current || !canDelete) return;
		if (
			confirmation.action === 'cancel' &&
			(!canChange || rows.find((row) => row.id === confirmation.ids[0])?.statut !== 'Valide')
		)
			return;
		pending.current = true;
		try {
			if (confirmation.action === 'bulk') await bulkDelete({ ids: confirmation.ids }).unwrap();
			else if (confirmation.action === 'cancel')
				await cancelRecord({ id: confirmation.ids[0], data: { statut: 'Annulé' } }).unwrap();
			else await deleteRecord({ id: confirmation.ids[0] }).unwrap();
			onSuccess(
				confirmation.action === 'bulk'
					? t.reglements.bulkDeleteSuccess(confirmation.ids.length)
					: confirmation.action === 'cancel'
						? t.reglements.cancelSuccess
						: t.reglements.deleteSuccess,
			);
			clearSelection();
		} catch (error) {
			onError(
				extractApiErrorMessage(
					error,
					confirmation.action === 'bulk'
						? t.reglements.bulkDeleteError
						: confirmation.action === 'cancel'
							? t.reglements.cancelError
							: t.reglements.deleteError,
				),
			);
		} finally {
			pending.current = false;
			setConfirmation(null);
		}
	};
	const clients = Array.isArray(clientsQuery.currentData) ? clientsQuery.currentData : [];
	const columns: ColumnDef<ReglementClass>[] = (
		[
			{ field: 'facture_client_numero', headerName: t.reglements.colNumeroFacture },
			{
				field: 'client_name',
				headerName: t.reglements.colClient,
				filterSelectOptions: [
					...new Set(
						[
							...clients.map(
								(client) => client.raison_sociale || [client.nom, client.prenom].filter(Boolean).join(' '),
							),
							...rows.map((row) => row.client_name),
						].filter((name): name is string => !!name),
					),
				].map((name) => ({ label: name, value: name })),
			},
			{
				field: 'mode_reglement_name',
				headerName: t.reglements.colModeReglement,
				filterSelectOptions: (modesQuery.currentData ?? []).map((mode) => ({ label: mode.nom, value: mode.nom })),
			},
			{ field: 'montant', headerName: t.reglements.colMontant, type: 'number' },
			{ field: 'date_reglement', headerName: t.reglements.colDateReglement, type: 'date' },
			{
				field: 'statut',
				headerName: t.reglements.colStatut,
				filterSelectOptions: ['Valide', 'Annulé'].map((value) => ({ value, label: getStatutLabel(value, t) })),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
		] satisfies ColumnDef<ReglementClass>[]
	).map((column) => ({
		...column,
		filterOperators:
			getServerFilterOperators<ReglementClass>()[
				column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'string'
			],
	}));
	const refresh = () => {
		if (!query.isFetching && !disabled) {
			clearSelection();
			void query.refetch();
		}
	};
	const icon = (name: ComponentProps<typeof MaterialIcons>['name'], color: string = colors.brand) => (
		<MaterialIcons name={name} size={22} color={color} />
	);
	if (!canView)
		return (
			<View className="flex-1">
				<View className="p-4">{props.tabs}</View>
				<NoPermission />
			</View>
		);
	return (
		<>
			<PaginatedDataGrid<ReglementClass>
				testID="reglements-grid"
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={count}
				header={
					<>
						{props.tabs}
						<CompanyDocumentStats
							usesForeignCurrency={companyQuery.currentData?.uses_foreign_currency === true}
							statsByCurrency={query.currentData?.pages[0]?.stats_by_currency}
							error={companyQuery.isError ? companyQuery.error : undefined}
							onRetry={() => void companyQuery.refetch()}
							statistics={[
								{
									label: t.facturesClient.statsCA,
									field: 'chiffre_affaire_total',
									icon: 'trending-up',
									color: colors.brand,
								},
								{
									label: t.reglements.totalReglements,
									field: 'total_reglements',
									icon: 'payments',
									color: colors.success,
								},
								{
									label: t.reglements.statsImpayes,
									field: 'total_impayes',
									icon: 'account-balance-wallet',
									color: colors.danger,
								},
							]}
						/>
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
					canCreate
						? { label: t.reglements.newReglement, onPress: () => router.push(REGLEMENTS_ADD(props.company_id)) }
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
							buttonText={t.reglements.bulkDeleteBtn(selectedIds.length)}
							active={!disabled && !query.isFetching}
							loading={busy}
							danger
							inverted
							onClick={() => setConfirmation({ ids: [...selectedIds], action: 'bulk' })}
						/>
					)
				}
				selectedIds={selectedIds}
				disabled={disabled}
				isLoading={query.isLoading || (query.isFetching && !query.currentData)}
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
				refreshing={query.isFetching && !!query.currentData && !query.isFetchingNextPage}
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
					<ReglementCard
						payment={row}
						companyId={props.company_id}
						disabled={disabled}
						selection={
							canDelete
								? {
										label: `${t.shared.selectAll}: ${row.libelle || row.facture_client_numero}`,
										checked: selectedIds.includes(row.id),
										disabled,
										onChange: () =>
											setSelectedIds((ids) =>
												ids.includes(row.id) ? ids.filter((id) => id !== row.id) : [...ids, row.id],
											),
									}
								: undefined
						}
						actions={
							<ListCardActions
								disabled={disabled}
								onEdit={
									canChange && row.statut === 'Valide'
										? () => {
												const route = REGLEMENTS_EDIT(row.id);
												router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
											}
										: undefined
								}
								onDelete={canDelete ? () => setConfirmation({ ids: [row.id], action: 'delete' }) : undefined}
								extraActions={[
									...(canPrint
										? [
												{
													label: t.reglements.printReceipt,
													onClick: () => setPdfId(row.id),
													icon: icon('picture-as-pdf'),
												},
											]
										: []),
									...(canChange && row.statut === 'Valide'
										? [
												{
													label: t.reglements.cancelBtn,
													onClick: () => setConfirmation({ ids: [row.id], action: 'cancel' }),
													icon: icon('block', colors.danger),
													color: colors.danger,
													destructive: true,
												},
											]
										: []),
								]}
							/>
						}
					/>
				)}
			/>
			{confirmation && (
				<ConfirmationModal
					title={
						confirmation.action === 'bulk'
							? t.reglements.bulkDeleteModalTitle(confirmation.ids.length)
							: confirmation.action === 'cancel'
								? t.reglements.cancelModalTitle
								: t.reglements.deleteModalTitle
					}
					body={
						confirmation.action === 'bulk'
							? t.reglements.bulkDeleteModalBody(confirmation.ids.length)
							: confirmation.action === 'cancel'
								? t.reglements.cancelModalBody
								: t.reglements.deleteModalBody
					}
					recordName={
						confirmation.action === 'bulk' ? undefined : rows.find((row) => row.id === confirmation.ids[0])?.libelle
					}
					confirmText={confirmation.action === 'cancel' ? t.common.confirm : t.common.delete}
					loading={busy}
					onClose={() => {
						if (!pending.current) setConfirmation(null);
					}}
					onConfirm={() => void confirm()}
				/>
			)}
			{pdfId !== null && (
				<DocumentPdfModal
					normal
					onClose={() => setPdfId(null)}
					onOpen={(_type, language) => openReglementPdf(pdfId, props.company_id, language)}
				/>
			)}
		</>
	);
};

const ReglementsListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<ReglementsListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);

export default ReglementsListPage;
