import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
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
import CustomMenu from '@/components/nativeElements/customMenu/customMenu';
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
import {
	extractApiErrorMessage,
	formatDate,
	formatNumberWithSpaces,
	calculateSalePriceTTC,
	runWithCleanup,
	isNectarRaisonSociale,
} from '@/utils/helpers';
import { colors } from '@/utils/themes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { ARTICLES_EDIT, ARTICLES_VIEW } from '@/utils/routes';
import type { ArticleClass } from '@/models/classes';
import type { ArticlesQueryParams } from '@/types/articleTypes';
import {
	useGetCategorieListQuery,
	useGetEmplacementListQuery,
	useGetUniteListQuery,
	useGetMarqueListQuery,
} from '@/store/services/parameter';
import { useGetCompanyQuery } from '@/store/services/company';
import EntityImage from '@/components/shared/entityImage/entityImage';
import * as DocumentPicker from 'expo-document-picker';
import { useImportArticlesMutation, useSendCSVExampleEmailMutation } from '@/store/services/article';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import {
	useGetArticlesInfiniteListInfiniteQuery,
	useLazyGetArticlesListQuery,
	useDeleteArticleMutation,
	useBulkDeleteArticlesMutation,
} from '@/store/services/article';

type Props = {
	archived: boolean;
	archiveAction: {
		label: string;
		bulkLabel: (count: number) => string;
		bulkTitle: (count: number) => string;
		bulkBody: (count: number) => string;
		error: string;
		bulkError: string;
		onConfirm: (ids: number[], bulk: boolean) => Promise<void>;
	};
	createAction?: {
		label: string;
		onPress: (company_id: number) => void;
	};
};

const ArticlesListContent = (
	props: Props & {
		company_id: number;
		company_raison_sociale: string;
		role: string;
		companyTabs: ReactNode;
	},
) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const canEdit = props.role === 'Caissier' || props.role === 'Commercial';
	const canBulkDelete = props.role === 'Caissier';
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [importErrors, setImportErrors] = useState<Array<{ row: number; message: string }>>([]);
	const importPending = useRef(false);
	const emailPending = useRef(false);
	const [importing, setImporting] = useState(false);
	const [sendCSVEmail, emailMutation] = useSendCSVExampleEmailMutation();
	const [importArticles] = useImportArticlesMutation();
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
	const [deleteRecord] = useDeleteArticleMutation();
	const [bulkDeleteArticles] = useBulkDeleteArticlesMutation();
	const [fetchAllArticleIds] = useLazyGetArticlesListQuery();
	const selectionPending = useRef<ReturnType<typeof fetchAllArticleIds> | null>(null);
	const selectionRequest = useRef(0);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const queryArgs: ArticlesQueryParams = {
		...extractCustomFilterParams(filterModel).params,
		company_id: props.company_id,
		// Django filters archived articles, just as on the web. Including the mode
		// in the query arguments also gives each list its own RTK Query cache.
		archived: props.archived,
		pageSize: MODULES_PAGE_SIZE,
		search: searchTerm,
		...(ordering ? { ordering } : {}),
	};
	const query = useGetArticlesInfiniteListInfiniteQuery(queryArgs, {
		skip: !token || !canView,
		refetchOnMountOrArgChange: true,
	});
	const categorieQuery = useGetCategorieListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const emplacementQuery = useGetEmplacementListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const uniteQuery = useGetUniteListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const marqueQuery = useGetMarqueListQuery({ company_id: props.company_id }, { skip: !token || !canView });
	const companyQuery = useGetCompanyQuery({ id: props.company_id }, { skip: !token || !canView });
	const isNectar = isNectarRaisonSociale(props.company_raison_sociale);
	const filters = [
		{ field: 'categorie_ids', label: t.articles.filterCategorie, query: categorieQuery },
		{ field: 'emplacement_ids', label: t.articles.filterEmplacement, query: emplacementQuery },
		{ field: 'unite_ids', label: t.articles.filterUnite, query: uniteQuery },
		{ field: 'marque_ids', label: t.articles.filterMarque, query: marqueQuery },
	] as const;
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
		if (selectionPending.current || busy || importing || query.isFetching) return;
		const requestId = ++selectionRequest.current;
		setIsLoadingAllIds(true);
		// The cards only contain loaded pages. Ask Django for ALL matching IDs,
		// including the current search, instead of selecting just visible cards.
		const request = fetchAllArticleIds({ ...queryArgs, with_pagination: false }, false);
		selectionPending.current = request;
		try {
			const result = await request.unwrap();
			if (requestId !== selectionRequest.current) return;
			if (
				!Array.isArray(result) ||
				result.some((article) => !Number.isSafeInteger(article?.id) || Number(article.id) <= 0)
			) {
				onError(t.articles.fetchIdsError);
				return;
			}
			setSelectedIds([...new Set(result.map((article) => article.id!))]);
			setIsAllMatchingSelected(true);
		} catch (error) {
			if (requestId === selectionRequest.current) onError(extractApiErrorMessage(error, t.articles.fetchIdsError));
		} finally {
			request.unsubscribe();
			if (requestId === selectionRequest.current) {
				selectionPending.current = null;
				setIsLoadingAllIds(false);
			}
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
							await bulkDeleteArticles({ ids }).unwrap();
							onSuccess(t.articles.bulkDeleteSuccess(ids.length));
						} else {
							await deleteRecord({ id: ids[0] }).unwrap();
							onSuccess(t.articles.deleteSuccess);
						}
					} else {
						// Each route supplies its own operation: index.tsx archives articles,
						// archived.tsx restores them. The shared list only coordinates the UI.
						await props.archiveAction.onConfirm(ids, bulk);
					}
					setSelectedIds((previous) => previous.filter((id) => !ids.includes(id)));
					setIsAllMatchingSelected(false);
					// Article tag invalidation refreshes subscribed lists automatically.
					// No second manual refetch is needed after a successful mutation.
				} catch (error) {
					const fallback =
						action === 'delete'
							? bulk
								? t.articles.bulkDeleteError
								: t.articles.deleteError
							: bulk
								? props.archiveAction.bulkError
								: props.archiveAction.error;
					onError(extractApiErrorMessage(error, fallback));
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
	const columns: ColumnDef<ArticleClass>[] = (
		[
			{ field: 'reference', headerName: t.articles.colReference },
			{
				field: 'type_article',
				headerName: t.articles.colType,
				filterSelectOptions: [
					{ value: 'Produit', label: t.articles.typeProduit },
					{ value: 'Service', label: t.articles.typeService },
				],
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
			{ field: 'designation', headerName: t.articles.colDesignation },
			...(!isNectar ? [{ field: 'prix_achat', headerName: t.articles.colPrixAchat, type: 'number' as const }] : []),
			{ field: 'prix_vente', headerName: isNectar ? t.articles.colPrixHT : t.articles.colPrixVente, type: 'number' },
			...(companyQuery.currentData?.stock_management_enabled
				? [{ field: 'available_quantity', headerName: t.articles.availableQuantity, type: 'number' as const }]
				: []),
			{ field: 'date_created', headerName: t.articles.colDateCreation, type: 'date' },
			// Classification belongs in the existing filter sheet, not four extra
			// controls above the cards. Values remain Django IDs, not display labels.
			...filters.map((filter) => ({
				field: filter.field,
				headerName: filter.label,
				type: 'string' as const,
				filterSelectOptions: (filter.query.currentData ?? []).map((item) => ({
					value: String(item.id),
					label: item.nom,
				})),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			})),
		] satisfies ColumnDef<ArticleClass>[]
	).map((column) => ({
		...column,
		sortable: column.field !== 'available_quantity' && !column.field.endsWith('_ids'),
		filterable: column.field !== 'available_quantity',
		filterOperators:
			getServerFilterOperators<ArticleClass>()[
				column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'string'
			],
	}));

	const handleImport = async () => {
		if (!canEdit || props.archived || importPending.current || busy) return;
		importPending.current = true;
		setImporting(true);
		try {
			const picked = await DocumentPicker.getDocumentAsync({
				type: [
					'text/csv',
					'text/comma-separated-values',
					'application/csv',
					'application/vnd.ms-excel',
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				],
				copyToCacheDirectory: true,
				multiple: false,
			});
			if (picked.canceled) return;
			const file = picked.assets[0];
			if (!file || !/\.(csv|xlsx?)$/i.test(file.name)) {
				onError(t.articles.importInvalidFile);
				return;
			}
			const result = await importArticles({ file, company_id: props.company_id }).unwrap();
			handleClearAllMatching();
			setImportErrors(result.errors);
			onSuccess(t.articles.importSuccess(result.created));
		} catch (error) {
			onError(extractApiErrorMessage(error, t.articles.importError));
		} finally {
			importPending.current = false;
			setImporting(false);
		}
	};
	const handleSendEmail = async () => {
		if (!canEdit || props.archived || emailPending.current || busy) return;
		emailPending.current = true;
		try {
			await sendCSVEmail({ company_id: props.company_id }).unwrap();
			onSuccess(t.articles.emailSuccess);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.articles.emailError));
		} finally {
			emailPending.current = false;
		}
	};

	if (!canView)
		return (
			<View className="flex-1">
				<View className="p-4">{props.companyTabs}</View>
				<NoPermission />
			</View>
		);
	const disabled = busy || isLoadingAllIds || importing || emailMutation.isLoading;
	const selectedArticle =
		confirmation && !confirmation.bulk ? rows.find((article) => article.id === confirmation.ids[0]) : undefined;
	const money = (value: number | null, currency: string) =>
		`${formatNumberWithSpaces(value ?? 0, 2)} ${companyQuery.currentData?.uses_foreign_currency ? currency : 'MAD'}`;
	const renderRow = (article: ArticleClass) => {
		const name = article.reference;
		const navigate = (editing = false) => {
			const route = editing ? ARTICLES_EDIT(article.id) : ARTICLES_VIEW(article.id);
			router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
		};
		const info = (
			label: string,
			value: string | null,
			icon: ComponentProps<typeof MaterialIcons>['name'],
			valueTone?: ComponentProps<typeof InfoRow>['valueTone'],
		) => (
			<InfoRow
				dense
				valueTone={valueTone}
				label={label}
				value={value}
				icon={<MaterialIcons name={icon} size={18} color={colors.slate[400]} />}
			/>
		);
		return (
			<ListCard
				testID={`article-card-${article.id}`}
				disabled={disabled}
				onPress={() => navigate()}
				accessibilityLabel={`${t.common.view} ${name}`}
				selection={
					canEdit
						? {
								label: t.articles.selectArticle(name),
								checked: selectedIds.includes(article.id),
								disabled,
								onChange: () => handleSelectionChange(article.id),
							}
						: undefined
				}
				header={
					<View className="flex-row items-center gap-3">
						{!!article.photo && (
							<EntityImage image={article.photo} label={`${t.articles.colPhoto} ${name}`} icon="inventory-2" />
						)}
						<View className="min-w-0 flex-1 gap-1">
							<Text className="font-poppins-semibold text-lg text-ink dark:text-slate-100">{name}</Text>
						</View>
					</View>
				}
				actions={
					<ListCardActions
						disabled={disabled || query.isFetching}
						onEdit={canEdit ? () => navigate(true) : undefined}
						onArchive={
							canEdit && !props.archived ? () => void executeAction('archive', [article.id], false) : undefined
						}
						onUnarchive={
							canEdit && props.archived ? () => void executeAction('archive', [article.id], false) : undefined
						}
						onDelete={canEdit ? () => setConfirmation({ action: 'delete', ids: [article.id], bulk: false }) : undefined}
					/>
				}
			>
				<CustomBadge label={article.type_article === 'Produit' ? t.articles.typeProduit : t.articles.typeService} />
				<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
					{info(t.articles.colDesignation, article.designation, 'description')}
					{!isNectar &&
						info(t.articles.colPrixAchat, money(article.prix_achat, article.devise_prix_achat), 'shopping-cart')}
					{info(
						isNectar ? t.articles.colPrixHT : t.articles.colPrixVente,
						money(article.prix_vente, article.devise_prix_vente),
						'payments',
					)}
					{isNectar &&
						info(
							t.articles.colPrixTTC,
							money(
								calculateSalePriceTTC(Number(article.prix_vente ?? 0), Number(article.tva ?? 0)),
								article.devise_prix_vente,
							),
							'receipt',
						)}
					{!!companyQuery.currentData?.stock_management_enabled &&
						article.type_article === 'Produit' &&
						info(
							t.articles.availableQuantity,
							formatNumberWithSpaces(article.available_quantity ?? 0, 3),
							'inventory-2',
							article.stock_state === 'minimum' || article.stock_state === 'a_approvisionner' ? 'warning' : 'success',
						)}
					{info(t.articles.colDateCreation, formatDate(article.date_created), 'event')}
				</View>
			</ListCard>
		);
	};

	return (
		<>
			<PaginatedDataGrid<ArticleClass>
				testID="articles-grid"
				createAction={
					canEdit && props.createAction
						? {
								label: props.createAction.label,
								onPress: () => props.createAction?.onPress(props.company_id),
							}
						: undefined
				}
				toolbarActions={
					canEdit && !props.archived ? (
						<View className="h-11 w-11 items-center justify-center">
							{importing || emailMutation.isLoading ? (
								<ActivityIndicator
									accessibilityRole="progressbar"
									accessibilityLabel={importing ? t.articles.importTooltip : t.articles.emailTooltip}
									size="small"
									color={colors.brand}
								/>
							) : (
								<CustomMenu
									label={t.articles.importMenu}
									disabled={disabled}
									actions={[
										{
											label: t.articles.importTooltip,
											onClick: () => void handleImport(),
											icon: <MaterialIcons name="upload-file" size={22} color={colors.brand} />,
										},
										{
											label: t.articles.emailTooltip,
											onClick: () => void handleSendEmail(),
											icon: <MaterialIcons name="mail-outline" size={22} color={colors.brand} />,
										},
									]}
								/>
							)}
						</View>
					) : undefined
				}
				header={
					<>
						{props.companyTabs}
						{filters.map((filter) =>
							filter.query.isError ? (
								<QueryError
									key={filter.field}
									error={filter.query.error}
									onRetry={() => void filter.query.refetch()}
									variant="banner"
								/>
							) : null,
						)}
						{!!importErrors.length && (
							<ApiAlert
								variant="banner"
								errorDetails={`${t.articles.importErrorsTitle}\n${importErrors.map((error) => `${t.articles.importRow(error.row)} : ${error.message}`).join('\n')}`}
							/>
						)}
						{companyQuery.isError && (
							<QueryError variant="banner" error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
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
								buttonText={props.archiveAction.bulkLabel(selectedIds.length)}
								active={!disabled && !query.isFetching}
								loading={busy}
								inverted
								color={colors.warning}
								onClick={() => setConfirmation({ action: 'archive', ids: [...selectedIds], bulk: true })}
							/>
							{canBulkDelete && (
								<PrimaryLoadingButton
									cssClass="flex-1"
									buttonText={t.articles.bulkDeleteBtn(selectedIds.length)}
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
								? t.articles.bulkDeleteModalTitle(confirmation.ids.length)
								: t.articles.deleteModalTitle
							: props.archiveAction.bulkTitle(confirmation.ids.length)
					}
					body={
						confirmation.action === 'delete'
							? t.common.irreversible
							: props.archiveAction.bulkBody(confirmation.ids.length)
					}
					action={confirmation.action === 'delete' ? 'delete' : props.archived ? 'unarchive' : 'archive'}
					recordName={selectedArticle ? selectedArticle.reference : undefined}
					confirmText={confirmation.action === 'delete' ? t.common.delete : props.archiveAction.label}
					loading={busy}
					onClose={() => setConfirmation(null)}
					onConfirm={() => void executeAction(confirmation.action, confirmation.ids, confirmation.bulk)}
				/>
			)}
		</>
	);
};

// Both routes use this parent for their common list behavior. Their creation,
// archive and restore operations stay in the route that owns those actions.
const ArticlesListLayout = (props: Props) => {
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<CompanyDocumentsWrapperList>
				{(company) => (
					// A new company, role or archive mode gets fresh state. A selection or
					// pending confirmation must never carry over to a different list.
					<ArticlesListContent
						key={`${company.company_id}:${company.role}:${props.archived}`}
						archived={props.archived}
						archiveAction={props.archiveAction}
						createAction={props.createAction}
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

export default ArticlesListLayout;
