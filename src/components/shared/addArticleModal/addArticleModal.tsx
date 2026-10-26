import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomCheckbox from '@/components/nativeElements/customCheckbox/customCheckbox';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import QueryError from '@/components/shared/queryError/queryError';
import EntityImage from '@/components/shared/entityImage/entityImage';
import { useGetArticlesInfiniteListInfiniteQuery } from '@/store/services/article';
import {
	useGetCategorieListQuery,
	useGetEmplacementListQuery,
	useGetMarqueListQuery,
	useGetUniteListQuery,
} from '@/store/services/parameter';
import {
	extractCustomFilterParams,
	getInfiniteRows,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import DataGridToolbar from '@/components/shared/paginatedDataGrid/dataGridToolbar';
import { formatNumberWithSpaces, getRemiseTypeItemsList } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { colors } from '@/utils/themes';
import type { ArticleClass } from '@/models/classes';
import type { ArticlePopupValues, SelectedArticlePopupValues } from '@/types/articleTypes';
import type { TypeRemiseType } from '@/types/devisTypes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';

type Props = {
	companyId: number;
	documentDevise: string;
	existingArticleIds: Set<number>;
	existingArticleLineValues?: Record<number, ArticlePopupValues>;
	disableRemise?: boolean;
	onAdd: (articles: SelectedArticlePopupValues[]) => void;
	onClose: () => void;
};

const AddArticleModal = (props: Props) => {
	const { t } = useLanguage();
	const [search, setSearch] = useState('');
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const listRef = useRef<FlatList<ArticleClass>>(null);
	const categorieQuery = useGetCategorieListQuery({ company_id: props.companyId });
	const emplacementQuery = useGetEmplacementListQuery({ company_id: props.companyId });
	const marqueQuery = useGetMarqueListQuery({ company_id: props.companyId });
	const uniteQuery = useGetUniteListQuery({ company_id: props.companyId });
	const classifications = [
		{ field: 'marque_ids', label: t.addArticleModal.colMarque, query: marqueQuery },
		{ field: 'categorie_ids', label: t.addArticleModal.colCategorie, query: categorieQuery },
		{ field: 'unite_ids', label: t.addArticleModal.colUnite, query: uniteQuery },
		{ field: 'emplacement_ids', label: t.addArticleModal.colEmplacement, query: emplacementQuery },
	];
	const columns: ColumnDef<ArticleClass>[] = [
		{
			field: 'status',
			headerName: t.addArticleModal.statusHeader,
			sortable: false,
			filterSelectOptions: [
				{ value: 'existing', label: t.addArticleModal.statusExisting },
				{ value: 'new', label: t.addArticleModal.statusNew },
			],
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{ field: 'reference', headerName: t.addArticleModal.colReference },
		{ field: 'designation', headerName: t.addArticleModal.colDesignation },
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
		...(!props.disableRemise
			? [{ field: 'prix_achat', headerName: t.addArticleModal.colPrixAchat, type: 'number' as const }]
			: []),
		{ field: 'prix_vente', headerName: t.addArticleModal.colPrixVente, type: 'number' },
		...classifications.map((classification) => ({
			field: classification.field,
			headerName: classification.label,
			sortable: false,
			filterSelectOptions: (classification.query.currentData ?? []).map((item) => ({
				value: String(item.id),
				label: item.nom,
			})),
			filterForceOperator: 'equals',
			filterHideOperator: true,
		})),
	];
	// Status belongs to this document, not the Article model. Translate it to
	// inclusion/exclusion IDs before serializing, including combined OR filters.
	const serializeFilters = (model: FilterModel) =>
		extractCustomFilterParams({
			...model,
			items: model.items.map((item) =>
				item.field === 'status' && (item.value === 'existing' || item.value === 'new')
					? {
							...item,
							field: item.value === 'existing' ? 'ids' : 'exclude_ids',
							value: [...props.existingArticleIds].join(',') || '0',
						}
					: item,
			),
		});
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	// Store selected records, not only visible IDs: server search changes the
	// loaded pages, but must not lose articles selected in a previous search.
	const [selected, setSelected] = useState<Record<number, ArticleClass>>({});
	const [articlePopupValues, setArticlePopupValues] = useState<Record<number, ArticlePopupValues>>({});
	const getRowPopupValues = (id: number): ArticlePopupValues =>
		articlePopupValues[id] ?? props.existingArticleLineValues?.[id] ?? { quantity: 1, remise_type: '', remise: 0 };
	const setRowPopupValues = (id: number, values: Partial<ArticlePopupValues>) => {
		setArticlePopupValues((previous) => ({
			...previous,
			[id]: {
				...(previous[id] ?? props.existingArticleLineValues?.[id] ?? { quantity: 1, remise_type: '', remise: 0 }),
				...values,
			},
		}));
	};
	const remiseItems = getRemiseTypeItemsList(t);
	const query = useGetArticlesInfiniteListInfiniteQuery({
		...serializeFilters(filterModel).params,
		company_id: props.companyId,
		archived: false,
		devise_prix_vente: props.documentDevise,
		pageSize: MODULES_PAGE_SIZE,
		search,
		prioritize_ids: [...props.existingArticleIds].join(',') || undefined,
		...(ordering ? { ordering } : {}),
	});
	const rows = getInfiniteRows(query.currentData?.pages);
	const count = Object.keys(selected).length;
	const queryKey = JSON.stringify([search, filterModel, ordering]);
	const previousQueryKey = useRef(queryKey);
	useEffect(() => {
		if (previousQueryKey.current === queryKey) return;
		previousQueryKey.current = queryKey;
		listRef.current?.scrollToOffset({ offset: 0, animated: false });
	}, [queryKey]);
	return (
		<BottomSheet
			visible
			title={t.addArticleModal.title}
			testID="add-article-modal"
			onClose={props.onClose}
			style={{ height: '85%' }}
			contentStyle={{ flex: 1 }}
		>
			<DataGridToolbar
				embedded
				columns={columns}
				loadedCount={rows.length}
				rowCount={query.currentData?.pages[0]?.count ?? 0}
				countLabel={t.addArticleModal.articleCount(rows.length, query.currentData?.pages[0]?.count ?? 0)}
				searchTerm={search}
				setSearchTerm={setSearch}
				filterModel={filterModel}
				onFilterModelChange={setFilterModel}
				filterOperatorsByType={getServerFilterOperators<ArticleClass>()}
				serializeFilters={serializeFilters}
				sorting={{ ordering, sortModel, onSortModelChange: setSortModel }}
			/>
			<FlatList
				ref={listRef}
				data={rows}
				keyExtractor={(item) => String(item.id)}
				style={{ flex: 1 }}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ gap: 12 }}
				onEndReached={() => {
					if (query.hasNextPage && !query.isFetching && !query.error) void query.fetchNextPage();
				}}
				onEndReachedThreshold={0.3}
				ListEmptyComponent={
					query.isFetching ? (
						<ActivityIndicator color={colors.brand} />
					) : query.isError ? (
						<QueryError error={query.error} onRetry={() => void query.refetch()} />
					) : (
						<Text className="py-4 font-sans text-slate-500 dark:text-slate-400">{t.common.noData}</Text>
					)
				}
				ListFooterComponent={
					query.isFetchNextPageError ? (
						<QueryError error={query.error} onRetry={() => void query.fetchNextPage()} />
					) : query.isFetchingNextPage ? (
						<ActivityIndicator color={colors.brand} />
					) : undefined
				}
				renderItem={({ item }) => (
					<View className="gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-600">
						<View className="flex-row items-center gap-3">
							{!!item.photo && <EntityImage image={item.photo} label={item.reference} icon="inventory-2" />}
							<View className="min-w-0 flex-1">
								<CustomCheckbox
									label={item.reference}
									checked={!!selected[item.id]}
									onChange={(checked) =>
										setSelected((previous) => {
											const next = { ...previous };
											if (checked) next[item.id] = item;
											else delete next[item.id];
											return next;
										})
									}
								/>
							</View>
						</View>
						<Text className="font-sans text-sm text-ink dark:text-slate-100">{item.designation}</Text>
						<Text className="font-poppins-semibold text-sm text-brand dark:text-blue-300">
							{formatNumberWithSpaces(item.prix_vente ?? 0, 2)} {item.devise_prix_vente}
						</Text>
						{item.stock_management_enabled && item.type_article === 'Produit' && (
							<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
								{t.addArticleModal.stockAvailable}: {formatNumberWithSpaces(item.available_quantity, 3)}
							</Text>
						)}
						<CustomBadge
							label={
								props.existingArticleIds.has(item.id) ? t.addArticleModal.statusExisting : t.addArticleModal.statusNew
							}
							tone={props.existingArticleIds.has(item.id) ? 'info' : 'success'}
						/>
						{!!selected[item.id] && (
							<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
								<CustomNumberInput
									formatted
									compact
									label={t.addArticleModal.colQuantite}
									accessibilityLabel={`${t.addArticleModal.colQuantite} ${item.reference}`}
									startIcon={<MaterialIcons name="inventory-2" size={20} color={colors.slate[400]} />}
									value={String(getRowPopupValues(item.id).quantity)}
									min={0.01}
									onChangeText={(quantity) => setRowPopupValues(item.id, { quantity })}
								/>
								{!props.disableRemise && (
									<>
										<CustomDropDownSelect
											compact
											label={t.addArticleModal.colTypeRemise}
											startIcon={<MaterialIcons name="sell" size={20} color={colors.slate[400]} />}
											items={remiseItems}
											value={getRowPopupValues(item.id).remise_type}
											getOptionLabel={(value) => remiseItems.find((option) => option.value === value)?.code ?? value}
											onChange={(value) =>
												setRowPopupValues(item.id, {
													remise_type: value as TypeRemiseType,
													remise: value ? getRowPopupValues(item.id).remise : 0,
												})
											}
										/>
										{!!getRowPopupValues(item.id).remise_type && (
											<CustomNumberInput
												formatted
												compact
												label={`${t.addArticleModal.colRemise} (${getRowPopupValues(item.id).remise_type === 'Pourcentage' ? '%' : props.documentDevise})`}
												accessibilityLabel={`${t.addArticleModal.colRemise} ${item.reference}`}
												startIcon={<MaterialIcons name="sell" size={20} color={colors.slate[400]} />}
												value={String(getRowPopupValues(item.id).remise)}
												max={getRowPopupValues(item.id).remise_type === 'Pourcentage' ? 100 : undefined}
												onChangeText={(remise) => setRowPopupValues(item.id, { remise })}
											/>
										)}
									</>
								)}
							</View>
						)}
					</View>
				)}
			/>
			<PrimaryLoadingButton
				buttonText={t.addArticleModal.addBtn(count)}
				loading={false}
				active={count > 0}
				onClick={() => {
					props.onAdd(
						Object.values(selected).map((articleData) => ({
							...getRowPopupValues(articleData.id),
							articleId: articleData.id,
							articleData,
							...(props.disableRemise ? { remise_type: '', remise: 0 } : {}),
						})),
					);
					props.onClose();
				}}
			/>
		</BottomSheet>
	);
};

export default AddArticleModal;
