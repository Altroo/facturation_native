import { useEffect, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import PaginatedDataGrid, {
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
import TextButton from '@/components/nativeElements/buttons/textButton/textButton';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import InvoicePaymentSummary from '@/components/shared/facture-client/invoicePaymentSummary';

import { useGetClientsListQuery } from '@/store/services/client';
import { useGetModePaiementListQuery } from '@/store/services/parameter';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, formatDate, formatNumberWithSpaces, getStatutLabel } from '@/utils/helpers';
import { devisFactureStatusItemsList, bonDeLivraisonStatusItemsList } from '@/utils/rawData';
import {
	BON_DE_LIVRAISON_ADD,
	BON_DE_LIVRAISON_EDIT,
	BON_DE_LIVRAISON_VIEW,
	DEVIS_ADD,
	DEVIS_EDIT,
	DEVIS_VIEW,
	FACTURE_PRO_FORMA_ADD,
	FACTURE_PRO_FORMA_EDIT,
	FACTURE_PRO_FORMA_VIEW,
	FACTURE_CLIENT_ADD,
	FACTURE_CLIENT_EDIT,
	CLIENTS_VIEW,
	FACTURE_CLIENT_VIEW,
	FACTURE_AVOIR_ADD,
	FACTURE_AVOIR_EDIT,
	FACTURE_AVOIR_VIEW,
} from '@/utils/routes';
import { colors } from '@/utils/themes';
import type { LivreParClass } from '@/models/classes';
import type { DocumentData, DocumentType } from '@/types/companyDocumentsTypes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DocumentPdfType } from '@/types/devisTypes';
import type { DevisQueryParams } from '@/types/devisTypes';

type Props = {
	company_id: number;
	role: string;
	tabs: ReactNode;
	documentType: DocumentType;
	queryArgs: DevisQueryParams;
	searchTerm: string;
	setSearchTerm: Dispatch<SetStateAction<string>>;
	sortModel: SortModel;
	setSortModel: (value: SortModel) => void;
	filterModel: FilterModel;
	setFilterModel: (value: FilterModel) => void;
	query: {
		currentData?: { pages: PaginationResponseType<DocumentData>[] };
		isLoading: boolean;
		isFetching: boolean;
		isFetchingNextPage: boolean;
		isFetchNextPageError: boolean;
		hasNextPage: boolean;
		error?: unknown;
		refetch: () => unknown;
		fetchNextPage: () => unknown;
	};
	fetchAllIds: (
		args: DevisQueryParams,
		preferCacheValue?: boolean,
	) => {
		unwrap: () => Promise<Array<Partial<DocumentData>> | { results: Array<Partial<DocumentData>> }>;
		abort: () => void;
		unsubscribe: () => void;
	};
	deleteRecord: (args: { id: number }) => { unwrap: () => Promise<unknown> };
	bulkDeleteRecords: (args: { ids: number[] }) => { unwrap: () => Promise<unknown> };
	deliveryPeople?: LivreParClass[];
	convertToDelivery?: (args: { id: number }) => { unwrap: () => Promise<{ id: number }> };
	convertToProforma?: (args: { id: number }) => { unwrap: () => Promise<{ id: number }> };
	convertToInvoice?: (args: { id: number }) => { unwrap: () => Promise<{ id: number }> };
	header?: ReactNode;
	bulkDeleteEnabled?: boolean;
	printingEnabled?: boolean;
	busy: boolean;
	openPdf: (id: number, type: DocumentPdfType, language: 'fr' | 'en' | 'nl') => Promise<boolean>;
};

const CompanyDocumentsListContent = (props: Props) => {
	const { t } = useLanguage();
	const isDevis = props.documentType === 'devis';
	const isInvoice = props.documentType === 'facture-client';
	const isDelivery = props.documentType === 'bon-de-livraison';
	const isCredit = props.documentType === 'facture-avoir';
	const labels = isCredit
		? t.facturesAvoir
		: isDevis
			? t.devis
			: isInvoice
				? t.facturesClient
				: isDelivery
					? t.bonsLivraison
					: t.facturesProforma;
	const documentName = isDevis
		? t.navigation.devis
		: isInvoice
			? t.navigation.facturesClient
			: isCredit
				? t.navigation.facturesAvoir
				: isDelivery
					? t.navigation.bonsLivraison
					: t.navigation.facturesProforma;
	const addRoute = isCredit
		? FACTURE_AVOIR_ADD
		: isDevis
			? DEVIS_ADD
			: isInvoice
				? FACTURE_CLIENT_ADD
				: isDelivery
					? BON_DE_LIVRAISON_ADD
					: FACTURE_PRO_FORMA_ADD;
	const editRoute = isCredit
		? FACTURE_AVOIR_EDIT
		: isDevis
			? DEVIS_EDIT
			: isInvoice
				? FACTURE_CLIENT_EDIT
				: isDelivery
					? BON_DE_LIVRAISON_EDIT
					: FACTURE_PRO_FORMA_EDIT;
	const viewRoute = isCredit
		? FACTURE_AVOIR_VIEW
		: isDevis
			? DEVIS_VIEW
			: isInvoice
				? FACTURE_CLIENT_VIEW
				: isDelivery
					? BON_DE_LIVRAISON_VIEW
					: FACTURE_PRO_FORMA_VIEW;
	const numberField = isCredit
		? 'numero_avoir'
		: isDevis
			? 'numero_devis'
			: isDelivery
				? 'numero_bon_livraison'
				: 'numero_facture';
	const dateField = isCredit
		? 'date_avoir'
		: isDevis
			? 'date_devis'
			: isDelivery
				? 'date_bon_livraison'
				: 'date_facture';
	const extraField = isCredit ? 'motif_avoir' : isDevis ? 'numero_demande_prix_client' : 'numero_bon_commande_client';
	const numberLabel = isCredit
		? t.facturesAvoir.colNumeroAvoir
		: isDevis
			? t.devis.colNumeroDevis
			: isInvoice
				? t.facturesClient.colNumeroFacture
				: isDelivery
					? t.bonsLivraison.colNumeroBL
					: t.facturesProforma.colNumeroFacture;
	const dateLabel = isCredit
		? t.facturesAvoir.colDateAvoir
		: isDevis
			? t.devis.colDateDevis
			: isInvoice
				? t.facturesClient.colDateFacture
				: isDelivery
					? t.bonsLivraison.colDateBL
					: t.facturesProforma.colDateFacture;
	const extraLabel = isCredit
		? t.facturesAvoir.colMotif
		: isDevis
			? t.devis.colNumeroDemandePrix
			: isInvoice
				? t.facturesClient.colNumeroBonCommande
				: isDelivery
					? t.bonsLivraison.colNumeroBonCommande
					: t.facturesProforma.colNumeroBonCommande;
	const {
		searchTerm,
		setSearchTerm,
		sortModel,
		setSortModel,
		filterModel,
		setFilterModel,
		queryArgs,
		query,
		fetchAllIds,
		busy,
	} = props;

	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const canView = ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(props.role);
	const canEdit = props.role === 'Caissier' || props.role === 'Commercial';
	const canDelete = props.role === 'Caissier';
	const canSelect = canDelete && props.bulkDeleteEnabled !== false;
	const canPrint = canView && props.role !== 'Lecture' && props.printingEnabled !== false;
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [loadingIds, setLoadingIds] = useState(false);
	const [confirmation, setConfirmation] = useState<{ ids: number[]; bulk: boolean } | null>(null);
	const [pdfId, setPdfId] = useState<number | null>(null);
	const [conversion, setConversion] = useState<{ id: number; target: 'proforma' | 'invoice' | 'delivery' } | null>(
		null,
	);
	const pendingConversion = useRef(false);
	const pendingSelection = useRef<ReturnType<typeof fetchAllIds> | null>(null);
	const selectionRequest = useRef(0);
	const pendingDelete = useRef(false);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
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
		if (!canSelect || pendingSelection.current || busy || query.isFetching) return;
		const requestId = ++selectionRequest.current;
		setLoadingIds(true);
		const request = fetchAllIds({ ...queryArgs, with_pagination: false }, false);
		pendingSelection.current = request;
		try {
			const result = await request.unwrap();
			if (requestId !== selectionRequest.current) return;
			const records = Array.isArray(result) ? result : result?.results;
			if (!Array.isArray(records) || records.some((item) => !Number.isSafeInteger(item.id) || Number(item.id) <= 0)) {
				onError(t.common.genericError);
				return;
			}
			setSelectedIds([...new Set(records.map((item) => item.id!))]);
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
				await props.bulkDeleteRecords({ ids: confirmation.ids }).unwrap();
				onSuccess(t.documentList.bulkDeleteSuccess(confirmation.ids.length, documentName));
			} else {
				await props.deleteRecord({ id: confirmation.ids[0] }).unwrap();
				onSuccess(labels.deleteSuccess);
			}
			clearSelection();
		} catch (error) {
			onError(extractApiErrorMessage(error, labels.deleteError));
		} finally {
			pendingDelete.current = false;
			setConfirmation(null);
		}
	};
	const confirmConversion = async () => {
		const record = rows.find((row) => row.id === conversion?.id);
		const convert =
			conversion?.target === 'proforma'
				? props.convertToProforma
				: conversion?.target === 'delivery'
					? props.convertToDelivery
					: props.convertToInvoice;
		if (!isDevis && !isInvoice && record?.converted_facture_client) return;
		if (!canEdit || !record || !['Envoyé', 'Accepté'].includes(record.statut) || !convert || pendingConversion.current)
			return;
		pendingConversion.current = true;
		try {
			const result = await convert({ id: record.id }).unwrap();
			onSuccess(t.documentList.convertSuccess(documentName));
			const route =
				conversion?.target === 'proforma'
					? FACTURE_PRO_FORMA_EDIT(result.id)
					: conversion?.target === 'delivery'
						? BON_DE_LIVRAISON_EDIT(result.id)
						: FACTURE_CLIENT_EDIT(result.id);
			router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
		} catch (error) {
			onError(extractApiErrorMessage(error, t.documentList.convertError(documentName)));
		} finally {
			pendingConversion.current = false;
			setConversion(null);
		}
	};
	const columns: ColumnDef<DocumentData>[] = (
		[
			{ field: numberField, headerName: numberLabel },
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
			{
				field: extraField,
				headerName: extraLabel,
				...(isCredit
					? {
							filterSelectOptions: [
								{ value: 'retour_marchandise', label: t.facturesAvoir.motifRetour },
								{ value: 'erreur_facturation', label: t.facturesAvoir.motifErreur },
								{ value: 'remise', label: t.facturesAvoir.motifRemise },
								{ value: 'annulation', label: t.facturesAvoir.motifAnnulation },
								{ value: 'autre', label: t.facturesAvoir.motifAutre },
							],
							filterForceOperator: 'equals',
							filterHideOperator: true,
						}
					: {}),
			},
			...(isCredit ? [{ field: 'facture_origine_numero', headerName: t.facturesAvoir.colFactureOrigine }] : []),
			{
				field: 'statut',
				headerName: t.documentList.colStatut,
				filterSelectOptions: (isDelivery ? bonDeLivraisonStatusItemsList : devisFactureStatusItemsList)
					.filter((item) => item.value && (!isCredit || item.value !== 'Facturé'))
					.map((item) => ({ value: item.value, label: getStatutLabel(item.value, t) })),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
			...(isDelivery
				? [
						{
							field: 'livre_par_ids',
							headerName: t.bonsLivraison.filterLivrePar,
							sortable: false,
							filterSelectOptions: (props.deliveryPeople ?? []).map((person) => ({
								value: String(person.id),
								label: person.nom,
							})),
							filterForceOperator: 'equals',
							filterHideOperator: true,
						},
					]
				: []),
			{ field: 'total_ttc_apres_remise', headerName: t.documentList.colTotalTTC, type: 'number' },
			{ field: 'lignes_count', headerName: t.documentList.colNombreArticles, type: 'number' },
			{ field: dateField, headerName: dateLabel, type: 'date' },
			{
				field: 'mode_paiement_ids',
				headerName: t.documentView.modePaiementLabel,
				sortable: false,
				filterSelectOptions: (modesQuery.currentData ?? []).map((mode) => ({
					value: String(mode.id),
					label: mode.nom,
				})),
				filterForceOperator: 'equals',
				filterHideOperator: true,
			},
		] satisfies ColumnDef<DocumentData>[]
	).map((column) => ({
		...column,
		filterOperators:
			getServerFilterOperators<DocumentData>()[
				column.type === 'date' ? 'date' : column.type === 'number' ? 'number' : 'string'
			],
	}));
	const navigate = (row: DocumentData, editing = false) => {
		const route = editing ? editRoute(row.id) : viewRoute(row.id);
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
			<PaginatedDataGrid<DocumentData>
				testID={`${props.documentType}-grid`}
				rows={rows}
				columns={columns}
				getRowId={(row) => String(row.id)}
				rowCount={count}
				header={
					<>
						{props.tabs}
						{props.header}
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
								label: isCredit
									? t.facturesAvoir.newFactureAvoir
									: isDevis
										? t.devis.newDevis
										: isInvoice
											? t.facturesClient.newFacture
											: isDelivery
												? t.bonsLivraison.newBL
												: t.facturesProforma.newFacture,
								onPress: () =>
									router.push({
										pathname: addRoute,
										params: { company_id: String(props.company_id) },
									}),
							}
						: undefined
				}
				selectionControl={
					canSelect &&
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
					canSelect && (
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
						testID={`${props.documentType}-card-${row.id}`}
						disabled={disabled}
						onPress={() => navigate(row)}
						accessibilityLabel={`${t.common.view} ${row[numberField]}`}
						selection={
							canSelect
								? {
										label: `${t.shared.selectAll}: ${row[numberField]}`,
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
							<Text className="font-poppins-semibold text-lg text-ink dark:text-slate-100">{row[numberField]}</Text>
						}
						actions={
							<ListCardActions
								disabled={disabled}
								onEdit={canEdit && (!isCredit || row.statut === 'Brouillon') ? () => navigate(row, true) : undefined}
								onDelete={canDelete ? () => setConfirmation({ ids: [row.id], bulk: false }) : undefined}
								extraActions={[
									...(canPrint
										? [
												{
													label:
														isInvoice && !['Brouillon', 'Accepté'].includes(row.statut)
															? t.facturesClient.printRequiresValidation
															: t.common.print,
													disabled: isInvoice && !['Brouillon', 'Accepté'].includes(row.statut),
													onClick: () => setPdfId(row.id),
													icon: <MaterialIcons name="picture-as-pdf" size={22} color={colors.brand} />,
												},
											]
										: []),
									...(canEdit && !isCredit && !isDelivery
										? [
												...(isDevis
													? [
															{
																label: t.devis.labelFactureProforma,
																disabled: !props.convertToProforma || !['Envoyé', 'Accepté'].includes(row.statut),
																onClick: () => setConversion({ id: row.id, target: 'proforma' }),
																icon: <MaterialIcons name="receipt-long" size={22} color={colors.conversion} />,
															},
														]
													: []),
												...(isInvoice
													? [
															{
																label: t.facturesClient.labelBonLivraison,
																disabled: !props.convertToDelivery || !['Envoyé', 'Accepté'].includes(row.statut),
																onClick: () => setConversion({ id: row.id, target: 'delivery' }),
																icon: <MaterialIcons name="local-shipping" size={22} color={colors.conversion} />,
															},
														]
													: [
															{
																label:
																	!isDevis && row.converted_facture_client
																		? t.facturesProforma.alreadyConverted
																		: isDevis
																			? t.devis.labelFactureClient
																			: t.facturesProforma.labelFactureClient,
																disabled:
																	(!isDevis && !!row.converted_facture_client) ||
																	!props.convertToInvoice ||
																	!['Envoyé', 'Accepté'].includes(row.statut),
																onClick: () => setConversion({ id: row.id, target: 'invoice' }),
																icon: <MaterialIcons name="receipt" size={22} color={colors.conversion} />,
															},
														]),
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
								value={
									row.client !== null && Number.isSafeInteger(row.client) && row.client > 0 && row.client_name ? (
										<TextButton
											buttonText={row.client_name}
											disabled={disabled}
											onClick={(event) => {
												event.stopPropagation();
												const route = CLIENTS_VIEW(Number(row.client));
												router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
											}}
										/>
									) : (
										row.client_name
									)
								}
							/>
							{!!row[extraField] && (
								<InfoRow
									dense
									icon={<MaterialIcons name="tag" size={18} color={colors.slate[400]} />}
									label={extraLabel}
									value={isCredit ? row.motif_avoir_label : row[extraField]}
								/>
							)}
							{isCredit && (
								<InfoRow
									dense
									icon={<MaterialIcons name="receipt-long" size={18} color={colors.slate[400]} />}
									label={t.facturesAvoir.colFactureOrigine}
									value={
										row.facture_origine && row.facture_origine_numero ? (
											<TextButton
												buttonText={row.facture_origine_numero}
												disabled={disabled}
												onClick={(event) => {
													event.stopPropagation();
													const route = FACTURE_CLIENT_VIEW(row.facture_origine!);
													router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
												}}
											/>
										) : (
											t.facturesAvoir.freeOriginLabel
										)
									}
								/>
							)}
							<InfoRow
								dense
								icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
								label={dateLabel}
								value={formatDate(row[dateField] ?? null, false)}
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
							{isInvoice && <InvoicePaymentSummary document={row} dense />}
						</View>
					</ListCard>
				)}
			/>
			{confirmation && (
				<ConfirmationModal
					title={confirmation.bulk ? t.documentList.bulkDeleteTitle(confirmation.ids.length) : labels.deleteModalTitle}
					body={t.common.irreversible}
					recordName={confirmation.bulk ? undefined : rows.find((row) => row.id === confirmation.ids[0])?.[numberField]}
					action="delete"
					confirmText={t.common.delete}
					loading={busy}
					onClose={() => {
						if (!pendingDelete.current) setConfirmation(null);
					}}
					onConfirm={() => void confirmDelete()}
				/>
			)}
			{conversion !== null && (
				<ConfirmationModal
					title={
						conversion.target === 'proforma'
							? t.devis.convertToProformaTitle
							: conversion.target === 'delivery'
								? t.facturesClient.convertToBLTitle
								: isDevis
									? t.devis.convertToFactureTitle
									: t.facturesProforma.convertToFactureTitle
					}
					body={
						conversion.target === 'proforma'
							? t.devis.convertToProformaBody
							: conversion.target === 'delivery'
								? t.facturesClient.convertToBLBody
								: isDevis
									? t.devis.convertToFactureBody
									: t.facturesProforma.convertToFactureBody
					}
					recordName={rows.find((row) => row.id === conversion.id)?.[numberField]}
					action="convert"
					confirmText={t.common.convert}
					loading={busy}
					onConfirm={() => void confirmConversion()}
					onClose={() => {
						if (!pendingConversion.current) setConversion(null);
					}}
				/>
			)}
			{pdfId !== null && (
				<DocumentPdfModal
					normal={isDelivery}
					onClose={() => setPdfId(null)}
					onOpen={(type, language) => props.openPdf(pdfId, type, language)}
				/>
			)}
		</>
	);
};

export default CompanyDocumentsListContent;
