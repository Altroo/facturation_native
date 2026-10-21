import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getServerFilterOperators,
	getInfiniteRows,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetCompaniesInfiniteListInfiniteQuery,
	useSuspendCompanyMutation,
	useBulkSuspendCompaniesMutation,
	useLazyGetCompaniesListQuery,
} from '@/store/services/company';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import type { CompanyClass } from '@/models/classes';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import { getUserCompaniesState } from '@/store/selectors';
import { useAppDispatch, useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { getDjangoNextPageParam, formatDate, runWithCleanup } from '@/utils/helpers';
import { COMPANIES_ADD, COMPANIES_VIEW, COMPANIES_EDIT } from '@/utils/routes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import { colors } from '@/utils/themes';

const CompaniesListPage = () => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const dispatch = useAppDispatch();
	const { is_staff } = usePermission();
	const memberships = useAppSelector(getUserCompaniesState);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const [filterModel, setFilterModel] = useState<FilterModel>({
		items: [],
		logicOperator: 'and',
	});
	const [showSuspendModal, setShowSuspendModal] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [suspending, setSuspending] = useState(false);
	const suspensionInProgress = useRef(false);
	const [suspendRecord] = useSuspendCompanyMutation();
	const [bulkSuspendCompanies] = useBulkSuspendCompaniesMutation();
	const [fetchAllCompanyIds] = useLazyGetCompaniesListQuery();
	const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);
	const selectionInProgress = useRef(false);
	const selectionPending = useRef<ReturnType<typeof fetchAllCompanyIds> | null>(null);
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [showBulkSuspendModal, setShowBulkSuspendModal] = useState(false);
	const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);
	const selectionRequest = useRef(0);

	useEffect(
		() => () => {
			selectionRequest.current += 1;
			selectionPending.current?.abort();
			selectionPending.current = null;
			selectionInProgress.current = false;
			setIsLoadingAllIds(false);
		},
		[is_staff],
	);

	const query = useGetCompaniesInfiniteListInfiniteQuery(
		{
			pageSize: MODULES_PAGE_SIZE,
			search: searchTerm,
			...(ordering ? { ordering } : {}),
			...extractCustomFilterParams(filterModel).params,
		},
		{
			skip: !is_staff,
			refetchOnMountOrArgChange: true,
		},
	);
	const data = query.currentData;
	const rows = getInfiniteRows(data?.pages);
	const count = data?.pages[0]?.count ?? 0;
	const allSelected = isAllMatchingSelected || (count > 0 && selectedIds.length === count);
	const loadedIds = rows.flatMap(({ id }) => (typeof id === 'number' && id > 0 ? [id] : []));
	const loadedIdsKey = loadedIds.join(',');
	const [previousLoadedIds, setPreviousLoadedIds] = useState(loadedIds);
	if (previousLoadedIds.join(',') !== loadedIdsKey) {
		setPreviousLoadedIds(loadedIds);
		if (!isAllMatchingSelected) {
			setSelectedIds((previous) => previous.filter((id) => loadedIds.includes(id)));
			if (selectedIds.some((id) => !loadedIds.includes(id))) setShowBulkSuspendModal(false);
		} else if (previousLoadedIds.some((id) => !loadedIds.includes(id))) {
			setSelectedIds([]);
			setIsAllMatchingSelected(false);
			setShowBulkSuspendModal(false);
		}
		if (selectedId !== null && !loadedIds.includes(selectedId)) setShowSuspendModal(false);
	}
	if (!is_staff) return <NoPermission />;
	const cancelSelectionRequest = () => {
		selectionRequest.current += 1;
		selectionPending.current?.abort();
		selectionPending.current = null;
		selectionInProgress.current = false;
		setIsLoadingAllIds(false);
	};
	const handleClearAllMatching = () => {
		cancelSelectionRequest();
		setSelectedIds([]);
		setIsAllMatchingSelected(false);
		setShowBulkSuspendModal(false);
	};
	const handleSelectionChange = (ids: number[]) => {
		cancelSelectionRequest();
		setSelectedIds(ids);
		setIsAllMatchingSelected(false);
	};
	const handleSelectAllMatching = async () => {
		if (selectionInProgress.current || suspending || query.isFetching) return;
		const requestId = ++selectionRequest.current;
		selectionInProgress.current = true;
		setIsLoadingAllIds(true);
		const filters = {
			search: searchTerm,
			...(ordering ? { ordering } : {}),
			...extractCustomFilterParams(filterModel).params,
		};
		const allIds = new Set<number>();
		let page = 1;
		try {
			while (requestId === selectionRequest.current) {
				// Django applies company filters only to paginated requests.
				const request = fetchAllCompanyIds(
					{ ...filters, with_pagination: true, page, pageSize: MODULES_PAGE_SIZE },
					false,
				);
				selectionPending.current = request;
				let result;
				try {
					result = await request.unwrap();
				} finally {
					request.unsubscribe();
					if (selectionPending.current === request) selectionPending.current = null;
				}
				if (requestId !== selectionRequest.current) return;
				if (
					!result ||
					Array.isArray(result) ||
					!Array.isArray(result.results) ||
					(result.next !== null && typeof result.next !== 'string')
				) {
					onError(t.companies.fetchIdsError);
					return;
				}
				const pageIds = result.results.map((company) => company?.id);
				if (pageIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
					onError(t.companies.fetchIdsError);
					return;
				}
				pageIds.forEach((id) => allIds.add(id));
				if (result.next === null) {
					setSelectedIds([...allIds]);
					setIsAllMatchingSelected(true);
					return;
				}
				const nextPage = getDjangoNextPageParam(result.next, page);
				if (nextPage === undefined) {
					onError(t.companies.fetchIdsError);
					return;
				}
				page = nextPage;
			}
		} catch {
			if (requestId === selectionRequest.current) onError(t.companies.fetchIdsError);
		} finally {
			if (requestId === selectionRequest.current) {
				selectionInProgress.current = false;
				setIsLoadingAllIds(false);
			}
		}
	};
	const loadMore = () => {
		if (query.hasNextPage && !query.isFetching && !query.error && !suspending) void query.fetchNextPage();
	};
	const refresh = () => {
		if (query.isFetching || suspending) return;
		handleClearAllMatching();
		setShowSuspendModal(false);
		void query.refetch();
	};
	const suspendHandler = async () => {
		const id = selectedId;
		if (!is_staff || !id || suspensionInProgress.current) return;
		cancelSelectionRequest();
		suspensionInProgress.current = true;
		setSuspending(true);
		await runWithCleanup(
			async () => {
				try {
					await suspendRecord({
						id,
					}).unwrap();
					dispatch(companiesSetUserCompaniesAction(memberships.filter((company) => company.id !== id)));
					onSuccess(t.companies.suspendSuccess);
				} catch {
					onError(t.companies.suspendError);
				}
			},
			() => {
				setShowSuspendModal(false);
				setSelectedIds((prev) => prev.filter((id) => id !== selectedId));
				setIsAllMatchingSelected(false);
				suspensionInProgress.current = false;
				setSuspending(false);
			},
		);
	};
	const bulkSuspendHandler = async () => {
		if (!is_staff || !selectedIds.length || suspensionInProgress.current) return;
		cancelSelectionRequest();
		const ids = [...selectedIds];
		suspensionInProgress.current = true;
		setSuspending(true);
		await runWithCleanup(
			async () => {
				try {
					const result = await bulkSuspendCompanies({
						ids,
					}).unwrap();
					if (result.suspended === ids.length) {
						dispatch(companiesSetUserCompaniesAction(memberships.filter((company) => !ids.includes(company.id))));
					}
					onSuccess(t.companies.bulkSuspendSuccess(result.suspended));
				} catch {
					onError(t.companies.bulkSuspendError);
				}
			},
			() => {
				handleClearAllMatching();
				suspensionInProgress.current = false;
				setSuspending(false);
			},
		);
	};
	const showDeleteModalCall = (id: number) => {
		setSelectedId(id);
		setShowSuspendModal(true);
	};
	const operators = getServerFilterOperators<Partial<CompanyClass>>();
	const localNbrEmployeFilterOptions = [
		{ value: '1 à 5', label: t.rawData.employeeRanges['1to5'] },
		{ value: '5 à 10', label: t.rawData.employeeRanges['5to10'] },
		{ value: '10 à 50', label: t.rawData.employeeRanges['10to50'] },
		{ value: '50 à 100', label: t.rawData.employeeRanges['50to100'] },
		{ value: 'plus que 100', label: t.rawData.employeeRanges.moreThan100 },
	];
	const columns: ColumnDef<Partial<CompanyClass>>[] = [
		{
			field: 'raison_sociale',
			headerName: t.companies.colRaisonSociale,
		},
		{
			field: 'ICE',
			headerName: t.companies.colICE,
		},
		{
			field: 'nom_responsable',
			headerName: t.companies.colResponsable,
		},
		{
			field: 'email',
			headerName: t.companies.colEmail,
		},
		{
			field: 'telephone',
			headerName: t.companies.colTelephone,
		},
		{
			field: 'nbr_employe',
			headerName: t.companies.colEmployes,
			filterOperators: operators.string.filter(({ value }) => value === 'equals'),
			filterSelectOptions: localNbrEmployeFilterOptions,
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{
			field: 'date_created',
			headerName: t.common.dateCreation,
			type: 'date',
		},
	];

	const renderRow = (company: Partial<CompanyClass>) => (
		<ListCard
			selection={
				company.id
					? {
							label: t.shared.selectCompany + ': ' + (company.raison_sociale || String(company.id)),
							checked: selectedIds.includes(company.id),
							disabled: suspending,
							onChange: () => {
								const id = company.id;
								if (!id) return;
								handleSelectionChange(
									selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id],
								);
							},
						}
					: undefined
			}
			actions={
				<ListCardActions
					disabled={suspending}
					onView={() => {
						if (company.id) router.push(COMPANIES_VIEW(company.id));
					}}
					onEdit={() => {
						if (company.id) router.push(COMPANIES_EDIT(company.id));
					}}
				>
					<PrimaryLoadingButton
						buttonText={t.companies.suspendBtn}
						danger
						inverted
						onClick={() => {
							if (company.id) showDeleteModalCall(company.id);
						}}
						active={!(suspending || !company.id)}
						loading={false}
						startIcon={<MaterialIcons name="block" size={20} color={colors.danger} />}
					/>
				</ListCardActions>
			}
		>
			<View className="flex-row items-center gap-3">
				<EntityImage
					image={company.logo_cropped || company.logo}
					previewImage={company.logo}
					label={company.raison_sociale || t.companies.companyNameFallback}
				/>
				<View className="flex-1 gap-1">
					<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-lg">{company.raison_sociale}</Text>
					<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
						{t.companies.colICE}: {company.ICE || '-'}
					</Text>
				</View>
			</View>
			<View className="gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
				<InfoRow
					compact
					icon={<MaterialIcons name="mail-outline" size={17} color={colors.slate[400]} />}
					label={''}
					value={company.email || t.common.noData}
				/>
				<InfoRow
					compact
					icon={<MaterialIcons name="phone" size={17} color={colors.slate[400]} />}
					label={''}
					value={company.telephone || t.common.noData}
				/>
				<InfoRow
					compact
					icon={<MaterialIcons name="person-outline" size={17} color={colors.slate[400]} />}
					label={''}
					value={company.nom_responsable || t.common.noData}
				/>
				<InfoRow
					compact
					icon={<MaterialIcons name="groups" size={17} color={colors.slate[400]} />}
					label=""
					value={
						(localNbrEmployeFilterOptions.find((option) => option.value === company.nbr_employe)?.label ||
							company.nbr_employe ||
							'-') +
						' ' +
						t.companies.colEmployes
					}
				/>
				<InfoRow
					compact
					icon={<MaterialIcons name="event" size={17} color={colors.slate[400]} />}
					label={''}
					value={formatDate(company.date_created ?? null)}
				/>
			</View>
		</ListCard>
	);
	return (
		<>
			<PaginatedDataGrid<Partial<CompanyClass>>
				title={t.companies.listTitle}
				titleIcon="business"
				createAction={
					is_staff ? { label: t.companies.newCompany, onPress: () => router.push(COMPANIES_ADD) } : undefined
				}
				selectionControl={
					<SelectAllControl
						compact
						accessibilityLabel={t.shared.selectAllMatching(count)}
						description={allSelected ? t.shared.allMatchingSelected(selectedIds.length) : t.shared.matchingItems(count)}
						checked={allSelected ? true : selectedIds.length ? 'mixed' : false}
						selectedCount={selectedIds.length}
						loading={isLoadingAllIds}
						disabled={suspending || query.isFetching || !!query.error || count === 0}
						onPress={() => {
							if (allSelected) handleClearAllMatching();
							else void handleSelectAllMatching();
						}}
					/>
				}
				header={
					<>
						{!!query.error && !query.isFetchNextPageError && (
							<QueryError error={query.error} onRetry={refresh} loading={query.isFetching} disabled={suspending} />
						)}
					</>
				}
				selectionActions={
					<View className="flex-row flex-wrap gap-2">
						<PrimaryLoadingButton
							buttonText={t.companies.bulkSuspendBtn(selectedIds.length)}
							danger
							inverted
							onClick={() => setShowBulkSuspendModal(true)}
							active={!(suspending || query.isFetching || !!query.error || isLoadingAllIds)}
							loading={false}
							startIcon={<MaterialIcons name="block" size={20} color={colors.danger} />}
						/>
						<PrimaryLoadingButton
							buttonText={t.shared.clearSelection}
							inverted
							onClick={handleClearAllMatching}
							active={!suspending}
							loading={false}
						/>
					</View>
				}
				testID="companies-grid"
				rows={rows}
				columns={columns}
				sorting={{
					ordering,
					sortModel,
					onSortModelChange: (model) => {
						if (JSON.stringify(model) === JSON.stringify(sortModel)) return;
						handleClearAllMatching();
						setShowSuspendModal(false);
						setSortModel(model);
					},
				}}
				getRowId={(row) => String(row.id)}
				rowCount={count ?? 0}
				isLoading={query.isFetching && !data}
				disabled={suspending}
				onRefresh={refresh}
				refreshing={query.isFetching && !query.isFetchingNextPage && !!data}
				onEndReached={loadMore}
				isFetchingNextPage={query.isFetchingNextPage}
				hasNextPage={query.hasNextPage}
				loadMoreError={query.isFetchNextPageError}
				onRetryLoadMore={() => {
					if (!query.isFetching) void query.fetchNextPage();
				}}
				renderRow={renderRow}
				filterModel={filterModel}
				onFilterModelChange={(value) => {
					handleClearAllMatching();
					setShowSuspendModal(false);
					setFilterModel(value);
				}}
				searchTerm={searchTerm}
				setSearchTerm={(value) => {
					handleClearAllMatching();
					setShowSuspendModal(false);
					setSearchTerm(value);
				}}
				selectedIds={selectedIds}
			/>
			{showSuspendModal && (
				<ConfirmationModal
					title={t.companies.suspendModalTitle}
					body={t.companies.suspendModalBody}
					confirmText={t.companies.suspendBtn}
					action="suspend"
					loading={suspending}
					onClose={() => setShowSuspendModal(false)}
					onConfirm={() => void suspendHandler()}
				/>
			)}
			{showBulkSuspendModal && (
				<ConfirmationModal
					title={t.companies.bulkSuspendModalTitle(selectedIds.length)}
					body={t.companies.bulkSuspendModalBody(selectedIds.length)}
					confirmText={t.companies.suspendBtn}
					action="suspend"
					loading={suspending}
					onClose={() => setShowBulkSuspendModal(false)}
					onConfirm={() => void bulkSuspendHandler()}
				/>
			)}
		</>
	);
};

export default CompaniesListPage;
