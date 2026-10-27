import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import type { LogistiqueOrder } from '@/types/logistiqueTypes';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import QueryError from '@/components/shared/queryError/queryError';
import LogistiqueCard from '@/components/shared/logistique/logistiqueCard';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import {
	useGetLogistiqueInfiniteListInfiniteQuery,
	useLazyGetLogistiqueListQuery,
	useDeleteLogistiqueMutation,
	useBulkDeleteLogistiqueMutation,
} from '@/store/services/logistique';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getInitStateToken } from '@/store/selectors';
import { extractApiErrorMessage } from '@/utils/helpers';
import {
	MODULES_PAGE_SIZE,
	logistiqueGlobalStatusItemsList,
	logistiquePaymentStatusItemsList,
	logistiqueImportTitleStatusItemsList,
	logistiqueManagerRoles,
} from '@/utils/rawData';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
};

const LogistiqueListContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const currentUserId = useAppSelector(getInitStateToken).user.pk;
	const canManage = logistiqueManagerRoles.has(props.role);
	const canDelete = props.role === 'Caissier';
	const [searchTerm, setSearchTerm] = useState('');
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [loadingIds, setLoadingIds] = useState(false);
	const [confirmation, setConfirmation] = useState<{ ids: number[]; bulk: boolean } | null>(null);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs = {
		...extractCustomFilterParams(filterModel).params,
		company_id: props.company_id,
		search: searchTerm,
		pageSize: MODULES_PAGE_SIZE,
		ordering,
	};
	const query = useGetLogistiqueInfiniteListInfiniteQuery(queryArgs, { skip: !token, refetchOnMountOrArgChange: true });
	const [fetchAllIds] = useLazyGetLogistiqueListQuery();
	const [deleteOrder, deleting] = useDeleteLogistiqueMutation();
	const [bulkDelete, bulkDeleting] = useBulkDeleteLogistiqueMutation();
	const pending = useRef(false);
	const selectionRequest = useRef(0);
	const pendingSelection = useRef<ReturnType<typeof fetchAllIds> | null>(null);
	const busy = deleting.isLoading || bulkDeleting.isLoading;
	const disabled = busy || loadingIds;
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
			if (
				!Array.isArray(response.results) ||
				response.results.some((row) => !Number.isSafeInteger(row.id) || row.id <= 0)
			) {
				onError(t.common.genericError);
				return;
			}
			setSelectedIds([...new Set(response.results.map((row) => row.id))]);
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
		if (!confirmation || !canDelete || pending.current) return;
		pending.current = true;
		try {
			if (confirmation.bulk) await bulkDelete({ ids: confirmation.ids }).unwrap();
			else await deleteOrder({ id: confirmation.ids[0] }).unwrap();
			onSuccess(
				confirmation.bulk ? t.logistique.bulkDeleteSuccess(confirmation.ids.length) : t.logistique.deleteSuccess,
			);
			clearSelection();
		} catch (error) {
			onError(
				extractApiErrorMessage(error, confirmation.bulk ? t.logistique.bulkDeleteError : t.logistique.deleteError),
			);
		} finally {
			pending.current = false;
		}
	};
	const operators = getServerFilterOperators<LogistiqueOrder>();
	const options = (values: string[]) => values.map((value) => ({ label: value, value }));
	const columns: ColumnDef<LogistiqueOrder>[] = [
		{ field: 'numero_commande', headerName: t.logistique.colNumero, filterOperators: operators.string },
		{
			field: 'fournisseur',
			headerName: t.logistique.colFournisseur,
			filterSelectOptions: options(
				(query.currentData?.pages[0]?.stats?.fournisseurs ?? []).map((row) => row.fournisseur),
			),
			filterOperators: operators.string.filter((op) => op.value === 'equals'),
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{ field: 'date_prevue', headerName: t.logistique.colDatePrevue, type: 'date', filterOperators: operators.date },
		{
			field: 'statut_global',
			headerName: t.logistique.colStatut,
			filterSelectOptions: options(logistiqueGlobalStatusItemsList),
			filterOperators: operators.string.filter((op) => op.value === 'equals'),
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{
			field: 'statut_paiement',
			headerName: t.logistique.colPaiement,
			filterSelectOptions: options(logistiquePaymentStatusItemsList),
			filterOperators: operators.string.filter((op) => op.value === 'equals'),
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{
			field: 'statut_titre_importation',
			headerName: t.logistique.fieldStatutTI,
			filterSelectOptions: options(logistiqueImportTitleStatusItemsList),
			filterOperators: operators.string.filter((op) => op.value === 'equals'),
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{ field: 'cout_total', headerName: t.logistique.colCoutTotal, type: 'number', filterOperators: operators.number },
	];

	if (query.isError && !query.currentData)
		return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
	return (
		<>
			<PaginatedDataGrid
				testID="logistique-list"
				createAction={canManage ? { label: t.logistique.newOrder, disabled: true } : undefined}
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={count}
				header={
					<>
						{props.tabs}
						{query.isError && !query.isFetchNextPageError && (
							<QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />
						)}
					</>
				}
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
				isLoading={query.isLoading || (query.isFetching && !query.currentData)}
				refreshing={query.isFetching && !!query.currentData && !query.isFetchingNextPage}
				onRefresh={() => {
					if (!query.isFetching && !disabled) {
						clearSelection();
						void query.refetch();
					}
				}}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetching && !query.error && !disabled) void query.fetchNextPage();
				}}
				loadMoreError={query.isFetchNextPageError}
				onRetryLoadMore={() => {
					if (!query.isFetching && !disabled) void query.fetchNextPage();
				}}
				selectedIds={selectedIds}
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
							buttonText={t.logistique.bulkDeleteBtn(selectedIds.length)}
							active={!disabled && !query.isFetching}
							loading={busy}
							danger
							inverted
							onClick={() => setConfirmation({ ids: [...selectedIds], bulk: true })}
						/>
					)
				}
				renderRow={(row) => (
					<LogistiqueCard
						order={row}
						selection={
							canDelete
								? {
										label: `${t.shared.selectAll}: ${row.numero_commande}`,
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
								editDisabled={
									row.statut_global !== 'Annulé' &&
									(canManage || (row.responsable === currentUserId && row.statut_paiement === 'Non demandé'))
								}
								onDelete={canDelete ? () => setConfirmation({ ids: [row.id], bulk: false }) : undefined}
							/>
						}
					/>
				)}
			/>
			{confirmation && (
				<ConfirmationModal
					title={
						confirmation.bulk
							? t.logistique.bulkDeleteModalTitle(confirmation.ids.length)
							: t.logistique.deleteModalTitle
					}
					body={
						confirmation.bulk ? t.logistique.bulkDeleteModalBody(confirmation.ids.length) : t.logistique.deleteModalBody
					}
					recordName={
						confirmation.bulk ? undefined : rows.find((row) => row.id === confirmation.ids[0])?.numero_commande
					}
					confirmText={t.common.delete}
					loading={busy}
					onClose={() => {
						if (!pending.current) setConfirmation(null);
					}}
					onConfirm={() => void confirm()}
				/>
			)}
		</>
	);
};

const LogistiqueListPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<LogistiqueListContent
					key={`${company.company_id}:${company.role}`}
					company_id={company.company_id}
					role={company.role}
					tabs={company.tabs}
				/>
			)}
		</CompanyDocumentsWrapperList>
	</View>
);
export default LogistiqueListPage;
