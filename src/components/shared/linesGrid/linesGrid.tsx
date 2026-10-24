import { useState } from 'react';
import { View, Text } from 'react-native';
import {
	applyFilter,
	applySearch,
	applySorting,
	type ColumnDef,
	type FilterModel,
	type SortModel,
} from 'expo-flash-datagrid';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import EmptyState from '@/components/shared/emptyState/emptyState';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EntityImage from '@/components/shared/entityImage/entityImage';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import DataGridToolbar from '@/components/shared/paginatedDataGrid/dataGridToolbar';
import {
	extractCustomFilterParams,
	getServerFilterOperators,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import { useLanguage } from '@/utils/hooks';
import { calculateDocumentTotals, formatNumberWithSpaces, parseNumber } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import type { ArticleClass, DeviFactureLivraisonLineClass } from '@/models/classes';
import type { DeviFactureLineFormValues } from '@/types/devisTypes';

type Props = {
	title: string;
	rows: Array<DeviFactureLineFormValues & { stock_coverage?: DeviFactureLivraisonLineClass['stock_coverage'] }>;
	articles: Partial<ArticleClass>[];
	devise: string;
	disabled?: boolean;
	canEditPrice?: boolean;
	disableRemise?: boolean;
	errors?: Record<string, string>;
	onChange?: (index: number, field: keyof DeviFactureLineFormValues, value: string | number) => void;
	onDelete?: (index: number) => void;
	onAddClick?: () => void;
};

// Wide web table rows become stacked cards. Form and detail pages share their
// identity, amounts and spacing; only the form supplies editing callbacks.
const LinesGrid = (props: Props) => {
	const { t } = useLanguage();
	const [search, setSearch] = useState('');
	const [filterModel, setFilterModel] = useState<FilterModel>({ items: [], logicOperator: 'and' });
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const remiseItems = [
		{ code: t.globalRemiseModal.typeNone, value: '' },
		{ code: t.rawData.remiseTypes.percentage, value: 'Pourcentage' },
		{ code: t.rawData.remiseTypes.fixed, value: 'Fixe' },
	];
	// These are the complete document draft, not a page of catalogue results.
	// Keep the Formik index while changing only the displayed order/visibility.
	const rows = props.rows.map((line, index) => {
		const article = props.articles.find((item) => item.id === line.article);
		return {
			...article,
			...line,
			line,
			index,
			reference: article?.reference ?? line.reference ?? '',
			designation: line.designation || article?.designation || '',
			quantity: parseNumber(line.quantity),
			prix_achat: parseNumber(line.prix_achat),
			prix_vente: parseNumber(line.prix_vente),
			remise: parseNumber(line.remise ?? 0),
			montant: calculateDocumentTotals([line], props.articles).totalHT,
		};
	});
	type Row = (typeof rows)[number];
	const columns: ColumnDef<Row>[] = [
		{ field: 'reference', headerName: t.addArticleModal.colReference },
		{ field: 'designation', headerName: t.addArticleModal.colDesignation },
		{ field: 'marque_name', headerName: t.addArticleModal.colMarque },
		{ field: 'categorie_name', headerName: t.addArticleModal.colCategorie },
		{ field: 'unite_name', headerName: t.addArticleModal.colUnite },
		{ field: 'emplacement_name', headerName: t.addArticleModal.colEmplacement },
		{ field: 'quantity', headerName: t.documentForm.colQuantite, type: 'number' },
		{ field: 'prix_vente', headerName: t.documentForm.colPrixUnitaire, type: 'number' },
		...(!props.disableRemise
			? [
					{ field: 'prix_achat', headerName: t.documentForm.colPrixAchat, type: 'number' as const },
					{
						field: 'remise_type',
						headerName: t.documentForm.colTypeRemise,
						filterSelectOptions: remiseItems.map((item) => ({ value: item.value || 'none', label: item.code })),
						valueGetter: (row: Row) => row.remise_type || 'none',
						filterForceOperator: 'equals',
						filterHideOperator: true,
					},
					{ field: 'remise', headerName: t.documentForm.colRemise, type: 'number' as const },
				]
			: []),
		{ field: 'tva', headerName: t.documentForm.colTaxes, type: 'number' },
		{ field: 'montant', headerName: t.documentForm.colMontant, type: 'number' },
	];
	const operators = getServerFilterOperators<Row>();
	const visibleRows = applySorting(
		applyFilter(applySearch(rows, columns, search), columns, filterModel, { filterOperatorsByType: operators }),
		columns,
		sortModel,
	);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	return (
		<View className="gap-3">
			<SectionCard title={props.title} icon="shopping-cart">
				{props.onAddClick && (
					<PrimaryLoadingButton
						buttonText={t.documentForm.addArticlesBtn}
						active={!props.disabled}
						loading={false}
						inverted
						onClick={props.onAddClick}
						startIcon={<MaterialIcons name="add" size={20} color={colors.brand} />}
					/>
				)}
				<DataGridToolbar
					embedded
					unframed
					columns={columns}
					loadedCount={visibleRows.length}
					rowCount={props.rows.length}
					countLabel={t.addArticleModal.articleCount(visibleRows.length, props.rows.length)}
					searchTerm={search}
					setSearchTerm={setSearch}
					filterModel={filterModel}
					onFilterModelChange={setFilterModel}
					filterOperatorsByType={operators}
					serializeFilters={extractCustomFilterParams}
					sorting={{ ordering, sortModel, onSortModelChange: setSortModel }}
					disabled={props.disabled}
				/>
			</SectionCard>
			{!visibleRows.length && (
				<EmptyState message={props.rows.length ? t.common.noResults : t.common.noData} />
			)}
			{visibleRows.map(({ line, index }) => {
				const article = props.articles.find((item) => item.id === line.article);
				const coverage = line.stock_coverage;
				const stockLabels = {
					disponible: t.documentView.stockAvailable,
					couvert_par_stock_entrant: t.documentView.stockIncomingCovered,
					a_approvisionner: t.documentView.stockShortage,
					not_managed: t.common.noData,
				};
				const input = (field: 'quantity' | 'prix_vente' | 'remise', label: string) => {
					const error = props.errors?.[`lignes.${index}.${field}`];
					const inputProps = {
						compact: true,
						label,
						startIcon: (
							<MaterialIcons
								name={field === 'quantity' ? 'inventory-2' : field === 'prix_vente' ? 'payments' : 'sell'}
								size={20}
								color={colors.slate[400]}
							/>
						),
						value: String(line[field] ?? ''),
						disabled: props.disabled || (field === 'prix_vente' && !props.canEditPrice),
						error: !!error,
						helperText: error,
					};
					return field === 'prix_vente' ? (
						<CustomTextInput
							{...inputProps}
							keyboardType="decimal-pad"
							onChangeText={(value) => {
								if (/^\d*([.,]\d*)?$/.test(value)) props.onChange?.(index, field, value);
							}}
						/>
					) : (
						<CustomNumberInput
							{...inputProps}
							min={field === 'quantity' ? 0.01 : 0}
							max={field === 'remise' && line.remise_type === 'Pourcentage' ? 100 : undefined}
							onChangeText={(value) => props.onChange?.(index, field, value)}
						/>
					);
				};
				return (
					<ListCard
						key={line.id ?? `article-${line.article}`}
						testID={`document-line-${line.article}`}
						header={
							<View className="flex-row items-center gap-3">
								{!!article?.photo && (
									<EntityImage image={article.photo} label={article.reference ?? ''} icon="inventory-2" />
								)}
								<View className="min-w-0 flex-1 gap-1">
									<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
										{article?.reference ?? line.reference ?? ''}
									</Text>
									<Text className="font-sans text-sm text-ink dark:text-slate-100">
										{line.designation || article?.designation}
									</Text>
								</View>
							</View>
						}
						actions={
							props.onDelete ? (
								<PrimaryLoadingButton
									buttonText={t.documentForm.deleteLineAriaLabel}
									loading={false}
									active={!props.disabled}
									iconOnly
									danger
									inverted
									onClick={() => props.onDelete?.(index)}
									startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
								/>
							) : undefined
						}
					>
						{article?.archived && <CustomBadge label={t.common.archived} />}
						{coverage && coverage.status !== 'not_managed' && (
							<CustomBadge
								label={stockLabels[coverage.status]}
								tone={
									coverage.status === 'disponible'
										? 'success'
										: coverage.status === 'a_approvisionner'
											? 'warning'
											: 'info'
								}
							/>
						)}
						<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
							{[
								{ label: t.documentView.colMarque, value: article?.marque_name, icon: 'sell' },
								{ label: t.documentView.colCategorie, value: article?.categorie_name, icon: 'category' },
								{ label: t.articles.fieldUnite, value: article?.unite_name, icon: 'straighten' },
							].map((item) =>
								item.value ? (
									<InfoRow
										key={item.icon}
										dense
										inline={!!props.onChange}
										label={item.label}
										value={item.value}
										icon={
											<MaterialIcons
												name={item.icon as 'sell' | 'category' | 'straighten'}
												size={18}
												color={colors.slate[400]}
											/>
										}
									/>
								) : null,
							)}
							{props.onChange ? (
								<>
									{input('quantity', t.documentForm.colQuantite)}
									{input('prix_vente', `${t.documentForm.colPrixUnitaire} (${props.devise})`)}
									{!props.disableRemise && (
										<>
											<CustomDropDownSelect
												compact
												label={t.documentForm.colTypeRemise}
												startIcon={<MaterialIcons name="sell" size={20} color={colors.slate[400]} />}
												items={remiseItems}
												value={line.remise_type ?? ''}
												getOptionLabel={(value) => remiseItems.find((item) => item.value === value)?.code ?? value}
												disabled={props.disabled}
												onChange={(value) => props.onChange?.(index, 'remise_type', value)}
											/>
											{!!line.remise_type &&
												input(
													'remise',
													line.remise_type === 'Pourcentage'
														? `${t.documentForm.colRemise} (%)`
														: `${t.documentForm.colRemise} (${props.devise})`,
												)}
										</>
									)}
								</>
							) : (
								<>
									<InfoRow
										dense
										icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
										label={t.documentView.colQuantite}
										value={formatNumberWithSpaces(Number(line.quantity), 3)}
									/>
									<InfoRow
										dense
										icon={<MaterialIcons name="payments" size={18} color={colors.slate[400]} />}
										label={t.documentForm.colPrixUnitaire}
										value={`${formatNumberWithSpaces(Number(line.prix_vente), 2)} ${props.devise}`}
									/>
									{!props.disableRemise && !!line.remise_type && (
										<InfoRow
											dense
											icon={<MaterialIcons name="sell" size={18} color={colors.slate[400]} />}
											label={t.documentView.colRemise}
											value={`${formatNumberWithSpaces(Number(line.remise), 2)} ${line.remise_type === 'Pourcentage' ? '%' : props.devise}`}
										/>
									)}
								</>
							)}
							{!props.disableRemise && (
								<InfoRow
									dense
									inline={!!props.onChange}
									icon={<MaterialIcons name="shopping-cart" size={18} color={colors.slate[400]} />}
									label={t.documentForm.colPrixAchat}
									value={`${formatNumberWithSpaces(Number(line.prix_achat), 2)} ${line.devise_prix_achat}`}
								/>
							)}
							<InfoRow
								dense
								inline={!!props.onChange}
								icon={<MaterialIcons name="percent" size={18} color={colors.slate[400]} />}
								label={t.documentForm.colTaxes}
								value={article ? `${formatNumberWithSpaces(Number(article.tva ?? 0), 2)} %` : null}
							/>
							<InfoRow
								dense
								inline={!!props.onChange}
								icon={<MaterialIcons name="receipt" size={18} color={colors.brand} />}
								label={t.documentForm.colMontant}
								value={`${formatNumberWithSpaces(calculateDocumentTotals([line], props.articles).totalHT, 2)} ${props.devise}`}
							/>
						</View>
					</ListCard>
				);
			})}
		</View>
	);
};

export default LinesGrid;
