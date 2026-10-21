import { type ReactNode, useEffect, useRef, useState } from 'react';
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
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import ChipSelectFilter from '@/components/shared/chipSelectFilter/chipSelectFilter';
import InfoRow from '@/components/shared/infoRow/infoRow';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import NoPermission from '@/components/shared/noPermission/noPermission';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import QueryError from '@/components/shared/queryError/queryError';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, formatDate, runWithCleanup, isNectarRaisonSociale } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { CLIENTS_ADD, CLIENTS_EDIT, CLIENTS_VIEW } from '@/utils/routes';
import type { ClientClass } from '@/models/classes';
import type { ClientsQueryParams } from '@/types/clientTypes';
import { useGetCitiesListQuery } from '@/store/services/parameter';
import {
	useGetClientsInfiniteListInfiniteQuery,
	useLazyGetClientsListQuery,
	useDeleteClientMutation,
	usePatchArchiveMutation,
	useBulkDeleteClientsMutation,
	useBulkArchiveClientsMutation,
} from '@/store/services/client';

type Props = {
	company_id: number;
	company_raison_sociale: string;
	role: string;
	companyTabs: ReactNode;
};

const ClientsListContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const canEdit = props.role === 'Caissier' || props.role === 'Commercial';
	const canBulkDelete = props.role === 'Caissier';
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [selectedCities, setSelectedCities] = useState<number[]>([]);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);
	const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);
	const [busy, setBusy] = useState(false);
	const mutationInProgress = useRef(false);
	const [confirmation, setConfirmation] = useState<{
		action: 'delete' | 'archive';
		ids: number[];
		bulk: boolean;
	} | null>(null);
	const [deleteRecord] = useDeleteClientMutation();
	const [patchArchive] = usePatchArchiveMutation();
	const [bulkDeleteClients] = useBulkDeleteClientsMutation();
	const [bulkArchiveClients] = useBulkArchiveClientsMutation();
	const [fetchAllClientIds] = useLazyGetClientsListQuery();
	const selectionPending = useRef<ReturnType<typeof fetchAllClientIds> | null>(null);
	const selectionRequest = useRef(0);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs: ClientsQueryParams = {
		...extractCustomFilterParams(filterModel).params,
		company_id: props.company_id,
		archived: false,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
		...(selectedCities.length ? { ville_ids: selectedCities.join(',') } : {}),
	};
	const query = useGetClientsInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const citiesQuery = useGetCitiesListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	// currentData belongs to these exact filters. "data" can temporarily contain
	// the previous query's results while a different search is loading.
	const data = query.currentData;
	const rows = getInfiniteRows(data?.pages);
	const count = data?.pages[0]?.count ?? 0;
	const allSelected = isAllMatchingSelected || (count > 0 && selectedIds.length === count);

	// Leaving a company must cancel its pending "select all". Otherwise, a slower
	// response could put the previous company's IDs into the next bulk action.
	useEffect(
		() => () => {
			selectionRequest.current += 1;
			selectionPending.current?.abort();
			selectionPending.current?.unsubscribe();
		},
		[],
	);

	const cancelSelectionRequest = () => {
		selectionRequest.current += 1;
		selectionPending.current?.abort();
		selectionPending.current?.unsubscribe();
		selectionPending.current = null;
		setIsLoadingAllIds(false);
	};
	const handleClearAllMatching = () => {
		cancelSelectionRequest();
		setSelectedIds([]);
		setIsAllMatchingSelected(false);
		setConfirmation(null);
	};
	const handleSelectionChange = (id: number) => {
		cancelSelectionRequest();
		setIsAllMatchingSelected(false);
		setSelectedIds((previous) =>
			previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
		);
	};
	const handleSelectAllMatching = async () => {
		if (selectionPending.current || busy || query.isFetching) return;
		const requestId = ++selectionRequest.current;
		setIsLoadingAllIds(true);
		// The cards only contain loaded pages. Ask Django for ALL matching IDs,
		// including the current search, instead of selecting just visible cards.
		const request = fetchAllClientIds({ ...queryArgs, with_pagination: false }, false);
		selectionPending.current = request;
		try {
			const result = await request.unwrap();
			if (requestId !== selectionRequest.current) return;
			if (
				!Array.isArray(result) ||
				result.some((client) => !Number.isSafeInteger(client?.id) || Number(client.id) <= 0)
			) {
				onError(t.clients.fetchIdsError);
				return;
			}
			setSelectedIds([...new Set(result.map((client) => client.id!))]);
			setIsAllMatchingSelected(true);
		} catch (error) {
			if (requestId === selectionRequest.current) onError(extractApiErrorMessage(error, t.clients.fetchIdsError));
		} finally {
			request.unsubscribe();
			if (requestId === selectionRequest.current) {
				selectionPending.current = null;
				setIsLoadingAllIds(false);
			}
		}
	};

	const restoreArchivedClients = async (ids: number[], bulk: boolean) => {
		try {
			if (bulk) {
				const result = await bulkArchiveClients({ ids, archived: false }).unwrap();
				onSuccess(t.clients.bulkUnarchiveSuccess(result.updated));
			} else {
				await patchArchive({ id: ids[0], data: { archived: false } }).unwrap();
				onSuccess(t.clients.unarchiveSuccess);
			}
		} catch (error) {
			onError(extractApiErrorMessage(error, bulk ? t.clients.bulkUnarchiveError : t.clients.unarchiveError));
		}
	};
	const executeAction = async (action: 'delete' | 'archive', ids: number[], bulk: boolean) => {
		if (!canEdit || mutationInProgress.current || (!canBulkDelete && bulk && action === 'delete')) return;
		if (!ids.length) return;
		// A ref also blocks two taps arriving before React renders the busy state.
		mutationInProgress.current = true;
		cancelSelectionRequest();
		setBusy(true);
		await runWithCleanup(
			async () => {
				try {
					if (action === 'delete') {
						if (bulk) {
							await bulkDeleteClients({ ids }).unwrap();
							onSuccess(t.clients.bulkDeleteSuccess(ids.length));
						} else {
							await deleteRecord({ id: ids[0] }).unwrap();
							onSuccess(t.clients.deleteSuccess);
						}
					} else if (bulk) {
						const result = await bulkArchiveClients({ ids, archived: true }).unwrap();
						onSuccess(t.clients.bulkArchiveSuccess(result.updated), {
							label: t.common.undo,
							onPress: () => void restoreArchivedClients(ids, true),
						});
					} else {
						await patchArchive({ id: ids[0], data: { archived: true } }).unwrap();
						// Keep these IDs in the toast callback, even if the user changes
						// company before undoing. The current selection may be different.
						onSuccess(t.clients.archiveSuccess, {
							label: t.common.undo,
							onPress: () => void restoreArchivedClients(ids, false),
						});
					}
					setSelectedIds((previous) => previous.filter((id) => !ids.includes(id)));
					setIsAllMatchingSelected(false);
					// Client tag invalidation refreshes subscribed lists automatically.
					// No second manual refetch is needed after a successful mutation.
				} catch (error) {
					onError(extractApiErrorMessage(error, action === 'delete' ? t.clients.deleteError : t.clients.archiveError));
				}
			},
			() => {
				setConfirmation(null);
				setBusy(false);
				mutationInProgress.current = false;
			},
		);
	};
	const loadMore = () => {
		// onEndReached may fire more than once during layout. Let only one request
		// run, and show an explicit retry after an error instead of retrying in a loop.
		if (query.hasNextPage && !query.isFetching && !query.error && !busy) void query.fetchNextPage();
	};
	const refresh = () => {
		if (query.isFetching || busy) return;
		handleClearAllMatching();
		void query.refetch();
	};

	// Columns still describe the server's filter/sort fields, as on the web.
	// renderRow below replaces the wide table row with a mobile card.
	const columns: ColumnDef<ClientClass>[] = (
		[
			{ field: 'code_client', headerName: t.clients.colCodeClient },
			{
				field: 'client_type',
				headerName: t.clients.colType,
				filterSelectOptions: [
					// The list serializer returns labels, but Django's filter expects codes.
					{ value: 'PP', label: t.clients.typePersonnePhysique },
					{ value: 'PM', label: t.clients.typePersonneMorale },
					...(isNectarRaisonSociale(props.company_raison_sociale)
						? [{ value: 'CD', label: t.clients.typeClientDivers }]
						: []),
				],
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
			{ field: 'raison_sociale', headerName: t.clients.colRaisonSociale },
			{ field: 'nom', headerName: t.clients.colNom },
			{ field: 'prenom', headerName: t.clients.colPrenom },
			{ field: 'ville_name', headerName: t.clients.colVille },
			{ field: 'date_created', headerName: t.clients.colDateCreation, type: 'date' },
		] satisfies ColumnDef<ClientClass>[]
	).map((column) => ({
		...column,
		sortable: true,
		filterable: true,
		filterOperators: getServerFilterOperators<ClientClass>()[column.type === 'date' ? 'date' : 'string'],
	}));

	if (!canView)
		return (
			<View className="flex-1">
				<View className="p-4">{props.companyTabs}</View>
				<NoPermission />
			</View>
		);
	const disabled = busy || isLoadingAllIds;
	const selectedClient =
		confirmation && !confirmation.bulk ? rows.find((client) => client.id === confirmation.ids[0]) : undefined;
	const renderRow = (client: ClientClass) => {
		const name = client.raison_sociale || [client.nom, client.prenom].filter(Boolean).join(' ') || client.code_client;
		const typeLabel =
			(
				{
					PM: t.clients.typePersonneMorale,
					'Personne morale': t.clients.typePersonneMorale,
					PP: t.clients.typePersonnePhysique,
					'Personne physique': t.clients.typePersonnePhysique,
					CD: t.clients.typeClientDivers,
					'Client Divers': t.clients.typeClientDivers,
				} as Record<string, string>
			)[client.client_type] ?? client.client_type;
		return (
			<ListCard
				testID={`client-card-${client.id}`}
				selection={
					canEdit
						? {
								label: t.clients.selectClient(name),
								checked: selectedIds.includes(client.id),
								disabled,
								onChange: () => handleSelectionChange(client.id),
							}
						: undefined
				}
				disabled={disabled}
				accessibilityLabel={`${t.common.view} ${name}`}
				onPress={() => {
					const route = CLIENTS_VIEW(client.id);
					router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
				}}
				actions={
					<ListCardActions
						disabled={disabled || query.isFetching}
						onEdit={
							canEdit
								? () => {
										const route = CLIENTS_EDIT(client.id);
										router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
									}
								: undefined
						}
						onArchive={canEdit ? () => void executeAction('archive', [client.id], false) : undefined}
						onDelete={canEdit ? () => setConfirmation({ action: 'delete', ids: [client.id], bulk: false }) : undefined}
					/>
				}
				header={
					<View className="flex-row items-center gap-3">
						<View className="min-w-0 flex-1 gap-1">
							<Text className="font-poppins-semibold text-lg text-ink dark:text-slate-100">{name}</Text>
						</View>
					</View>
				}
			>
				<CustomBadge label={typeLabel} />
				<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
					<InfoRow
						dense
						icon={<MaterialIcons name="badge" size={18} color={colors.slate[400]} />}
						label={t.clients.colCodeClient}
						value={client.code_client}
					/>
					{!!client.raison_sociale && (
						<InfoRow
							dense
							icon={<MaterialIcons name="business" size={18} color={colors.slate[400]} />}
							label={t.clients.colRaisonSociale}
							value={client.raison_sociale}
						/>
					)}
					<View className="flex-row gap-3">
						<View className="flex-1">
							<InfoRow
								dense
								icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
								label={t.clients.colNom}
								value={client.nom}
							/>
						</View>
						<View className="flex-1">
							<InfoRow
								dense
								icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
								label={t.clients.colPrenom}
								value={client.prenom}
							/>
						</View>
					</View>
					<InfoRow
						dense
						icon={<MaterialIcons name="location-on" size={18} color={colors.slate[400]} />}
						label={t.clients.colVille}
						value={client.ville_name}
					/>
					<InfoRow
						dense
						icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
						label={t.clients.colDateCreation}
						value={formatDate(client.date_created)}
					/>
				</View>
			</ListCard>
		);
	};

	return (
		<>
			<PaginatedDataGrid<ClientClass>
				testID="clients-grid"
				createAction={
					canEdit
						? {
								label: t.clients.newClient,
								// Expo Router serializes params into the destination route, like a
								// Next.js URL. The form reads company_id with useLocalSearchParams.
								onPress: () => router.push({ pathname: CLIENTS_ADD, params: { company_id: String(props.company_id) } }),
							}
						: undefined
				}
				additionalFilters={{
					count: selectedCities.length ? 1 : 0,
					key: selectedCities.join(','),
					onClear: () => {
						handleClearAllMatching();
						setSelectedCities([]);
					},
				}}
				header={
					<>
						{props.companyTabs}
						<ChipSelectFilter
							label={t.clients.filterVille}
							options={citiesQuery.currentData ?? []}
							placeholder={citiesQuery.isLoading ? t.common.loading : t.clients.allVilles}
							selectedIds={selectedCities}
							disabled={disabled || citiesQuery.isLoading}
							onChange={(ids) => {
								handleClearAllMatching();
								setSelectedCities(ids);
							}}
						/>
						{!!citiesQuery.error && (
							<QueryError
								error={citiesQuery.error}
								onRetry={() => void citiesQuery.refetch()}
								loading={citiesQuery.isFetching}
								disabled={disabled}
								variant="banner"
								showDetails
							/>
						)}
						{!!query.error && !query.isFetchNextPageError && (
							<QueryError
								error={query.error}
								onRetry={refresh}
								loading={query.isFetching}
								disabled={disabled}
								variant="banner"
								showDetails
							/>
						)}
					</>
				}
				selectionControl={
					canEdit &&
					count > 0 && (
						<SelectAllControl
							compact
							accessibilityLabel={selectedIds.length ? t.shared.clearSelection : t.shared.selectAllMatching(count)}
							description={t.shared.matchingItems(count)}
							checked={allSelected ? true : selectedIds.length ? 'mixed' : false}
							selectedCount={selectedIds.length}
							disabled={busy || query.isFetching}
							loading={isLoadingAllIds}
							onPress={selectedIds.length ? handleClearAllMatching : () => void handleSelectAllMatching()}
						/>
					)
				}
				selectionActions={
					canEdit && (
						<View className="flex-row gap-2">
							<PrimaryLoadingButton
								cssClass="flex-1"
								buttonText={t.clients.bulkArchiveBtn(selectedIds.length)}
								active={!disabled && !query.isFetching}
								loading={busy}
								inverted
								color={colors.warning}
								onClick={() => setConfirmation({ action: 'archive', ids: [...selectedIds], bulk: true })}
							/>
							{canBulkDelete && (
								<PrimaryLoadingButton
									cssClass="flex-1"
									buttonText={t.clients.bulkDeleteBtn(selectedIds.length)}
									active={!disabled && !query.isFetching}
									loading={busy}
									inverted
									danger
									onClick={() => setConfirmation({ action: 'delete', ids: [...selectedIds], bulk: true })}
								/>
							)}
						</View>
					)
				}
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={count}
				isLoading={query.isLoading || (query.isFetching && !data)}
				disabled={disabled}
				searchTerm={searchTerm}
				setSearchTerm={(value) => {
					handleClearAllMatching();
					setSearchTerm(value);
				}}
				filterModel={filterModel}
				onFilterModelChange={(value) => {
					handleClearAllMatching();
					setFilterModel(value);
				}}
				sorting={{
					ordering,
					sortModel,
					onSortModelChange: (value) => {
						handleClearAllMatching();
						setSortModel(value);
					},
				}}
				selectedIds={selectedIds}
				renderRow={renderRow}
				onRefresh={refresh}
				refreshing={query.isFetching && !!data && !query.isFetchingNextPage}
				onEndReached={loadMore}
				hasNextPage={query.hasNextPage}
				isFetchingNextPage={query.isFetchingNextPage}
				loadMoreError={query.isFetchNextPageError}
				onRetryLoadMore={() => {
					if (!query.isFetching && !busy) void query.fetchNextPage();
				}}
			/>
			{!!confirmation && (
				<ConfirmationModal
					title={
						confirmation.action === 'delete'
							? confirmation.bulk
								? t.clients.bulkDeleteModalTitle(confirmation.ids.length)
								: t.clients.deleteModalTitle
							: confirmation.bulk
								? t.clients.bulkArchiveModalTitle(confirmation.ids.length)
								: t.clients.archiveModalTitle
					}
					body={
						confirmation.action === 'delete'
							? t.common.irreversible
							: confirmation.bulk
								? t.clients.bulkArchiveModalBody(confirmation.ids.length)
								: t.clients.archiveModalBody
					}
					action={confirmation.action}
					recordName={
						selectedClient
							? selectedClient.raison_sociale ||
								[selectedClient.nom, selectedClient.prenom].filter(Boolean).join(' ') ||
								selectedClient.code_client
							: undefined
					}
					confirmText={confirmation.action === 'delete' ? t.common.delete : t.common.archive}
					loading={busy}
					onClose={() => setConfirmation(null)}
					onConfirm={() => void executeAction(confirmation.action, confirmation.ids, confirmation.bulk)}
				/>
			)}
		</>
	);
};

const ClientsListPage = () => {
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<CompanyDocumentsWrapperList>
				{(company) => (
					// key creates fresh list state when company/role changes. A selection
					// or a delete confirmation must never carry over to another company.
					<ClientsListContent
						key={`${company.company_id}:${company.role}`}
						company_id={company.company_id}
						company_raison_sociale={company.raison_sociale}
						role={company.role}
						companyTabs={company.tabs}
					/>
				)}
			</CompanyDocumentsWrapperList>
		</View>
	);
};

export default ClientsListPage;
