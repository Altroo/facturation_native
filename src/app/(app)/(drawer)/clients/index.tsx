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

	// Leaving a company must cancel its pending "select all". Otherwise a slower
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

	const confirmAction = async () => {
		if (
			!confirmation ||
			!canEdit ||
			mutationInProgress.current ||
			(!canBulkDelete && confirmation.bulk && confirmation.action === 'delete')
		)
			return;
		const { ids, action, bulk } = confirmation;
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
						onSuccess(t.clients.bulkArchiveSuccess(result.updated));
					} else {
						await patchArchive({ id: ids[0], data: { archived: true } }).unwrap();
						onSuccess(t.clients.archiveSuccess);
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
				actions={
					<ListCardActions
						disabled={disabled}
						onView={() => {
							const route = CLIENTS_VIEW(client.id);
							router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
						}}
						onEdit={
							canEdit
								? () => {
										const route = CLIENTS_EDIT(client.id);
										router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
									}
								: undefined
						}
					>
						{canEdit && (
							<View className="flex-row gap-2">
								<PrimaryLoadingButton
									cssClass="flex-1"
									buttonText={t.common.archive}
									active={!disabled && !query.isFetching}
									loading={false}
									inverted
									startIcon={<MaterialIcons name="archive" size={20} color={colors.brand} />}
									onClick={() => setConfirmation({ action: 'archive', ids: [client.id], bulk: false })}
								/>
								<PrimaryLoadingButton
									cssClass="flex-1"
									buttonText={t.common.delete}
									active={!disabled && !query.isFetching}
									loading={false}
									inverted
									danger
									startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
									onClick={() => setConfirmation({ action: 'delete', ids: [client.id], bulk: false })}
								/>
							</View>
						)}
					</ListCardActions>
				}
			>
				<View className="flex-row items-center gap-3">
					<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">
						<MaterialIcons
							name={
								client.client_type === 'PP' || client.client_type === 'Personne physique'
									? 'person-outline'
									: 'business'
							}
							size={26}
							color={colors.brand}
						/>
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-poppins-semibold text-lg text-ink dark:text-slate-100">{name}</Text>
						<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{client.code_client}</Text>
					</View>
				</View>
				<View className="self-start rounded-full bg-blue-50 px-3 py-1.5 dark:bg-slate-800">
					<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">{typeLabel}</Text>
				</View>
				<View className="border-t border-slate-100 pt-1 dark:border-slate-700">
					{!!client.raison_sociale && (
						<InfoRow
							icon={<MaterialIcons name="business" size={18} color={colors.slate[400]} />}
							label={t.clients.colRaisonSociale}
							value={client.raison_sociale}
						/>
					)}
					<View className="flex-row gap-3">
						<View className="flex-1">
							<InfoRow
								icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
								label={t.clients.colNom}
								value={client.nom}
							/>
						</View>
						<View className="flex-1">
							<InfoRow
								icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
								label={t.clients.colPrenom}
								value={client.prenom}
							/>
						</View>
					</View>
					<InfoRow
						icon={<MaterialIcons name="location-on" size={18} color={colors.slate[400]} />}
						label={t.clients.colVille}
						value={client.ville_name}
					/>
					<InfoRow
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
				title={t.clients.listTitle}
				titleIcon="people"
				contextLabel={props.company_raison_sociale}
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
							accessibilityLabel={allSelected ? t.shared.clearSelection : t.shared.selectAllMatching(count)}
							description={t.shared.matchingItems(count)}
							checked={allSelected ? true : selectedIds.length ? 'mixed' : false}
							selectedCount={selectedIds.length}
							disabled={busy || query.isFetching}
							loading={isLoadingAllIds}
							onPress={allSelected ? handleClearAllMatching : () => void handleSelectAllMatching()}
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
							? confirmation.bulk
								? t.clients.bulkDeleteModalBody(confirmation.ids.length)
								: t.clients.deleteModalBody
							: confirmation.bulk
								? t.clients.bulkArchiveModalBody(confirmation.ids.length)
								: t.clients.archiveModalBody
					}
					action={confirmation.action}
					confirmText={confirmation.action === 'delete' ? t.common.delete : t.common.archive}
					loading={busy}
					onClose={() => setConfirmation(null)}
					onConfirm={() => void confirmAction()}
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
