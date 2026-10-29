import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { getIn, useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { ArticleClass, CompanyClass } from '@/models/classes';
import type { TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetArticlesListQuery } from '@/store/services/article';
import {
	useGetModePaiementListQuery,
	useAddModePaiementMutation,
	useEditModePaiementMutation,
	useDeleteModePaiementMutation,
} from '@/store/services/parameter';
import {
	deviAddSchema,
	deviSchema,
	factureProformaSchema,
	factureProformaAddSchema,
	factureClientProformaSchema,
	factureClientProformaAddSchema,
	bonDeLivraisonAddSchema,
	bonDeLivraisonSchema,
} from '@/utils/formValidationSchemas';
import {
	calculateDocumentTotals,
	extractApiErrorMessage,
	formatLocalDate,
	getStatutLabel,
	isNectarRaisonSociale,
	parseNumber,
	setFormikAutoErrors,
	ValidatePricesHelper,
} from '@/utils/helpers';
import { devisFactureStatusItemsList, bonDeLivraisonStatusItemsList } from '@/utils/rawData';
import {
	CLIENTS_ADD,
	DEVIS_EDIT,
	FACTURE_PRO_FORMA_EDIT,
	FACTURE_CLIENT_EDIT,
	BON_DE_LIVRAISON_EDIT,
} from '@/utils/routes';
import { colors } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import CompanyDocumentLivreParField from './companyDocumentLivreParField';
import CompanyDocumentNumberFields from './companyDocumentNumberFields';
import CompanyDocumentRemiseControls from './companyDocumentRemiseControls';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import FactureDevisTotalsCard from '@/components/shared/factureDevistotalCard/factureDevisTotalsCard';
import EntityCrudControls from '@/components/shared/entityCrudControls/entityCrudControls';
import AddArticleModal from '@/components/shared/addArticleModal/addArticleModal';
import GlobalRemiseModal from '@/components/shared/globalRemiseModal/globalRemiseModal';
import LinesGrid from '@/components/shared/linesGrid/linesGrid';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import QueryError from '@/components/shared/queryError/queryError';
import type { DocumentData, DocumentFormSchema, DocumentType, DocumentWriteData } from '@/types/companyDocumentsTypes';
import type { SelectedArticlePopupValues } from '@/types/articleTypes';

type Props = {
	documentType: Exclude<DocumentType, 'facture-avoir'>;
	addData: (args: { data: DocumentWriteData }) => { unwrap: () => Promise<{ id: number }> };
	updateData: (args: { id: number; data: DocumentWriteData }) => { unwrap: () => Promise<unknown> };
	patchStatut: (args: { id: number; data: { statut: TypeFactureLivraisonDevisStatus } }) => {
		unwrap: () => Promise<{ statut: TypeFactureLivraisonDevisStatus }>;
	};
	mutationLoading: boolean;
	id?: number;
	company: CompanyClass;
	role: string;
	canChangeStatus: boolean;
	rawData?: DocumentData;
	initialNumber: string;
	numberQuery: {
		isError: boolean;
		error?: unknown;
		refetch: () => {
			unwrap: () => Promise<{ numero_devis?: string; numero_facture?: string; numero_bon_livraison?: string }>;
		};
	};
	companySelect?: (disabled: boolean) => ReactNode;
	scrollToLines: boolean;
	extraSections?: (statut: TypeFactureLivraisonDevisStatus) => ReactNode;
};

const CompanyDocumentFormContent = (props: Props) => {
	const { t } = useLanguage();
	const isDevis = props.documentType === 'devis';
	const isInvoice = props.documentType === 'facture-client';
	const isDelivery = props.documentType === 'bon-de-livraison';
	const labels = isDevis ? t.devis : isInvoice ? t.facturesClient : isDelivery ? t.bonsLivraison : t.facturesProforma;
	const editRoute = isDevis
		? DEVIS_EDIT
		: isInvoice
			? FACTURE_CLIENT_EDIT
			: isDelivery
				? BON_DE_LIVRAISON_EDIT
				: FACTURE_PRO_FORMA_EDIT;
	const numberField = isDevis ? 'numero_devis' : isDelivery ? 'numero_bon_livraison' : 'numero_facture';
	const dateField = isDevis ? 'date_devis' : isDelivery ? 'date_bon_livraison' : 'date_facture';
	const extraField = isDevis ? 'numero_demande_prix_client' : 'numero_bon_commande_client';
	const extraLabel = isDevis
		? t.devis.fieldNumeroDemandePrix
		: isInvoice
			? t.facturesClient.fieldNumeroBonCommande
			: isDelivery
				? t.bonsLivraison.fieldNumeroBonCommande
				: t.facturesProforma.fieldNumeroBonCommande;
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEdit = props.id !== undefined;
	const isNectar = isNectarRaisonSociale(props.company.raison_sociale);
	const inheritedSupplierSnapshotLocked =
		isEdit &&
		((isInvoice && !!(props.rawData?.source_proforma || props.rawData?.source_devis)) ||
			(isDelivery && !!props.rawData?.source_facture_client));
	const supplierNameLocked =
		inheritedSupplierSnapshotLocked ||
		(!isDevis &&
			!isInvoice &&
			!isDelivery &&
			!!props.rawData?.has_logistics_dossier &&
			!!props.rawData.fournisseur?.trim());
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const scrollToLinesPending = useRef(props.scrollToLines);
	const pending = useRef(false);
	const resetting = useRef(false);
	const statusPending = useRef(false);
	const [attempted, setAttempted] = useState(false);
	const [resettingNumber, setResettingNumber] = useState(false);
	const [showArticles, setShowArticles] = useState(false);
	const [showRemise, setShowRemise] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [selectedArticles, setSelectedArticles] = useState<Partial<ArticleClass>[]>([]);
	const [statut, setStatut] = useState<TypeFactureLivraisonDevisStatus>(props.rawData?.statut ?? 'Brouillon');
	// Stock-booked deliveries cannot send lines back to the API, even unchanged.
	const stockPosted = isDelivery && (statut === 'Accepté' || statut === 'Facturé');
	const clientsQuery = useGetClientsListQuery(
		{ company_id: props.company.id, with_pagination: false },
		{ skip: !token },
	);
	const modesQuery = useGetModePaiementListQuery({ company_id: props.company.id }, { skip: !token });
	const [addMode, addingMode] = useAddModePaiementMutation();
	const [editMode, editingMode] = useEditModePaiementMutation();
	const [deleteMode, deletingMode] = useDeleteModePaiementMutation();
	const parameterLoading = addingMode.isLoading || editingMode.isLoading || deletingMode.isLoading;
	const [numberPart, yearPart] = props.initialNumber.split('/');
	// Capture the first loaded document once. Status/parameter refetches must not
	// reset unsaved fields or article quantities, unlike enableReinitialize.
	const [initialValues] = useState<DocumentFormSchema>(() => ({
		numero_part: numberPart ?? '',
		year_part: yearPart || String(new Date().getFullYear()).slice(-2),
		client: props.rawData?.client ?? null,
		[dateField]: props.rawData?.[dateField] ?? formatLocalDate(new Date()),
		date_echeance: props.rawData?.date_echeance ?? null,
		[extraField]: props.rawData?.[extraField] ?? '',
		...(!isDevis && !isDelivery ? { termes_paiement: props.rawData?.termes_paiement ?? '' } : {}),
		...(isDelivery ? { livre_par: props.rawData?.livre_par ?? null } : {}),
		mode_paiement: props.rawData?.mode_paiement ?? null,
		fournisseur: props.rawData?.fournisseur ?? '',
		fournisseur_email: props.rawData?.fournisseur_email ?? '',
		remarque: isNectar ? null : (props.rawData?.remarque ?? ''),
		remise_type: isNectar ? '' : (props.rawData?.remise_type ?? ''),
		remise: isNectar ? 0 : Number(props.rawData?.remise ?? 0),
		devise: props.rawData?.devise ?? 'MAD',
		lignes: (props.rawData?.lignes ?? []).map((line) => ({
			id: line.id,
			article: line.article,
			designation: line.designation ?? line.article_designation ?? '',
			prix_achat: Number(line.prix_achat),
			devise_prix_achat: line.devise_prix_achat,
			prix_vente: Number(line.prix_vente),
			devise_prix_vente: line.devise_prix_vente,
			quantity: Number(line.quantity),
			remise_type: isNectar ? '' : (line.remise_type ?? ''),
			remise: isNectar ? 0 : Number(line.remise ?? 0),
		})),
		globalError: '',
	}));
	const savedLines = useRef(initialValues.lignes);
	const editSchema = (
		isDevis
			? deviSchema
			: isInvoice
				? factureClientProformaSchema
				: isDelivery
					? bonDeLivraisonSchema
					: factureProformaSchema
	).superRefine((data, ctx) => {
		const lines = data.lignes ?? [];
		if (!lines.length) ctx.addIssue({ code: 'custom', path: ['lignes'], message: t.documentForm.noArticlesError });
		for (const [index, line] of lines.entries()) {
			const error = ValidatePricesHelper.validateRemise(
				Number(line.remise ?? 0),
				line.remise_type ?? '',
				Number(line.prix_vente ?? 0) * line.quantity,
			);
			if (error) ctx.addIssue({ code: 'custom', path: ['lignes', index, 'remise'], message: error });
		}
	});
	const formik = useFormik<DocumentFormSchema>({
		initialValues,
		validationSchema: toFormikValidationSchema<unknown>(
			isEdit
				? editSchema
				: isDevis
					? deviAddSchema
					: isInvoice
						? factureClientProformaAddSchema
						: isDelivery
							? bonDeLivraisonAddSchema
							: factureProformaAddSchema,
		),
		validateOnMount: true,
		onSubmit: async (data, { setFieldError }) => {
			if (pending.current || statusPending.current || resetting.current) return;
			const globalError = ValidatePricesHelper.validateGlobalRemise(
				Number(data.remise),
				data.remise_type,
				totals.totalHT,
			);
			if (isEdit && globalError) {
				setFieldError('remise', globalError);
				onError(globalError);
				return;
			}
			if (isEdit && (articlesQuery.isError || missingArticles)) {
				onError(t.common.genericError);
				return;
			}
			pending.current = true;
			// Keep frontend-only number parts and error fields out of the API body.
			const payload = {
				[numberField]: `${data.numero_part}/${data.year_part}`,
				client: data.client,
				[dateField]: data[dateField],
				date_echeance: data.date_echeance || null,
				[extraField]: data[extraField] || null,
				...(!isDevis && !isDelivery ? { termes_paiement: data.termes_paiement || null } : {}),
				...(isDelivery ? { livre_par: data.livre_par ?? null } : {}),
				mode_paiement: data.mode_paiement,
				fournisseur: data.fournisseur.trim(),
				fournisseur_email: data.fournisseur_email.trim(),
				devise: data.devise,
				remarque: isNectar ? null : data.remarque || null,
				...(isEdit
					? {
							remise_type: isNectar ? ('' as const) : data.remise_type,
							remise: isNectar ? 0 : Number(data.remise),
							...(!stockPosted
								? {
										lignes: data.lignes.map((line) => ({
											...line,
											prix_achat: parseNumber(line.prix_achat) ?? 0,
											prix_vente: parseNumber(line.prix_vente) ?? 0,
											quantity: parseNumber(line.quantity) ?? 0,
											remise_type: isNectar ? ('' as const) : (line.remise_type ?? ''),
											remise: isNectar ? 0 : (parseNumber(line.remise ?? 0) ?? 0),
										})),
									}
								: {}),
						}
					: {}),
			};
			try {
				if (props.id !== undefined) {
					await props.updateData({ id: props.id, data: payload }).unwrap();
					savedLines.current = data.lignes;
					onSuccess(labels.updateSuccess);
				} else {
					const result = await props.addData({ data: payload }).unwrap();
					onSuccess(labels.addSuccess);
					// The web uses sessionStorage to scroll to articles after creation.
					// A transient route parameter does the same in Expo Router.
					const route = editRoute(result.id);
					router.replace({
						...route,
						params: { ...route.params, company_id: String(props.company.id), scrollToLines: 'true' },
					});
				}
			} catch (error) {
				setFormikAutoErrors({ e: error, setFieldError });
				onError(extractApiErrorMessage(error, isEdit ? labels.updateError : labels.addError));
			} finally {
				pending.current = false;
			}
		},
	});
	const articleIds = [...new Set(formik.values.lignes.map((line) => line.article))];
	const articlesQuery = useGetArticlesListQuery(
		{ company_id: props.company.id, with_pagination: false, ids: articleIds.join(',') },
		{ skip: !token || !articleIds.length },
	);
	const fetchedArticles = Array.isArray(articlesQuery.data) ? articlesQuery.data : [];
	const articles = [...fetchedArticles, ...selectedArticles];
	const missingArticles = articleIds.some((id) => !articles.some((article) => article.id === id));
	const totals = calculateDocumentTotals(
		formik.values.lignes,
		articles,
		formik.values.remise_type,
		formik.values.remise,
	);
	const disabled = formik.isSubmitting || props.mutationLoading;
	const fieldError = (name: string) =>
		(attempted || getIn(formik.touched, name)) && typeof getIn(formik.errors, name) === 'string'
			? (getIn(formik.errors, name) as string)
			: undefined;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const field = (
		name: keyof DocumentFormSchema,
		label: string,
		iconName: ComponentProps<typeof MaterialIcons>['name'],
	) => ({
		nativeID: name,
		label,
		placeholder: label,
		value: String(formik.values[name] ?? ''),
		onChangeText: (value: string) => void formik.setFieldValue(name, value),
		onBlur: formik.handleBlur(name),
		error: !!fieldError(name),
		helperText: fieldError(name),
		disabled,
		startIcon: icon(iconName),
	});
	const clients = Array.isArray(clientsQuery.currentData) ? clientsQuery.currentData : [];
	const clientItems = clients
		.filter((client) => !client.archived || client.id === formik.values.client)
		.map((client) => ({
			code: client.raison_sociale || [client.nom, client.prenom].filter(Boolean).join(' ') || client.code_client || '',
			value: String(client.id),
		}));
	const modes = (modesQuery.currentData ?? []).map((mode) => ({ code: mode.nom, value: String(mode.id) }));
	const selectedMode = modes.find((mode) => mode.value === String(formik.values.mode_paiement)) ?? null;
	// Derive errors from the current Formik result, as on web. Copying them into
	// separate state would leave a corrected quantity showing its previous error.
	const lineErrors: Record<string, string> = {};
	formik.values.lignes.forEach((_line, index) => {
		for (const name of ['quantity', 'prix_vente', 'remise']) {
			const error = fieldError(`lignes.${index}.${name}`);
			if (error) lineErrors[`lignes.${index}.${name}`] = error;
		}
	});
	const resetNumber = async () => {
		if (resetting.current || disabled) return;
		resetting.current = true;
		setResettingNumber(true);
		try {
			const result = await props.numberQuery.refetch().unwrap();
			const [number, year] = (result[numberField] ?? '').split('/');
			await formik.setFieldValue('numero_part', number ?? '');
			await formik.setFieldValue('year_part', year || String(new Date().getFullYear()).slice(-2));
		} catch (error) {
			onError(extractApiErrorMessage(error, t.common.genericError));
		} finally {
			resetting.current = false;
			setResettingNumber(false);
		}
	};
	const changeStatus = async (value: string) => {
		if (!props.id || !props.canChangeStatus || statusPending.current || disabled) return;
		// Status changes are separate writes. Never book the server's old lines
		// while the form is displaying unsaved quantities or prices.
		if (
			isDelivery &&
			['Accepté', 'Facturé'].includes(value) &&
			JSON.stringify(formik.values.lignes) !== JSON.stringify(savedLines.current)
		) {
			onError(t.bonsLivraison.saveLinesBeforePosting);
			return;
		}
		statusPending.current = true;
		try {
			const result = await props
				.patchStatut({
					id: props.id,
					data: { statut: value as TypeFactureLivraisonDevisStatus },
				})
				.unwrap();
			setStatut(result.statut);
			onSuccess(t.documentForm.statusUpdateSuccess);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.documentForm.statusUpdateError));
		} finally {
			statusPending.current = false;
		}
	};
	const addArticles = (chosen: SelectedArticlePopupValues[]) => {
		const chosenArticles = chosen.map((item) => item.articleData);
		setSelectedArticles((previous) => [
			...previous.filter((article) => !chosen.some((item) => item.articleId === article.id)),
			...chosenArticles,
		]);
		const lines = [...formik.values.lignes];
		for (const selection of chosen) {
			const article = selection.articleData;
			const quantity = Math.max(0.01, parseNumber(selection.quantity) ?? 1);
			const remise_type = isNectar ? '' : selection.remise_type;
			const remise = isNectar ? 0 : Math.max(0, parseNumber(selection.remise) ?? 0);
			const existingIndex = lines.findIndex((line) => line.article === selection.articleId);
			// Update the chosen quantity and discount without replacing an existing
			// line's negotiated price or duplicating the article.
			if (existingIndex >= 0) {
				lines[existingIndex] = { ...lines[existingIndex]!, quantity, remise_type, remise };
				continue;
			}
			lines.push({
				article: selection.articleId,
				reference: article.reference ?? '',
				designation: article.designation ?? '',
				prix_achat: Number(article.prix_achat ?? 0),
				devise_prix_achat: article.devise_prix_achat ?? 'MAD',
				prix_vente: Number(article.prix_vente ?? 0),
				devise_prix_vente: article.devise_prix_vente ?? formik.values.devise,
				quantity,
				remise_type,
				remise,
			});
		}
		void formik.setFieldValue('lignes', lines);
	};
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
				keyboardShouldPersistTaps="handled"
			>
				{props.companySelect && <SectionCard>{props.companySelect(disabled)}</SectionCard>}
				{[clientsQuery, modesQuery].map((query, index) =>
					query.isError ? (
						<QueryError key={index} variant="banner" error={query.error} onRetry={() => void query.refetch()} />
					) : null,
				)}
				{!isEdit && props.numberQuery.isError && (
					<QueryError variant="banner" error={props.numberQuery.error} onRetry={() => void resetNumber()} />
				)}
				{!!formik.errors.globalError && <ApiAlert variant="banner" errorDetails={formik.errors.globalError} />}
				<SectionCard title={t.documentForm.documentInfoSection} icon="description">
					<CompanyDocumentNumberFields
						numberInput={{
							...field('numero_part', t.documentForm.fieldNumeroLabel, 'tag'),
							required: true,
							onChangeText: (value) => {
								if (/^[A-Za-z0-9]*$/.test(value)) void formik.setFieldValue('numero_part', value.toUpperCase());
							},
						}}
						yearInput={
							!(isNectar && !isEdit)
								? {
										...field('year_part', t.documentForm.fieldAnneeLabel, 'event'),
										required: true,
										keyboardType: 'number-pad',
										maxLength: 2,
										onChangeText: (value) => {
											if (/^\d{0,2}$/.test(value)) void formik.setFieldValue('year_part', value);
										},
									}
								: undefined
						}
						reset={!isEdit ? { loading: resettingNumber, disabled, onPress: () => void resetNumber() } : undefined}
					/>
					<CustomDateInput
						label={labels.fieldDate}
						value={formik.values[dateField] ?? ''}
						disabled={disabled}
						onChange={(value) => void formik.setFieldValue(dateField, value)}
						error={!!fieldError(dateField)}
						helperText={fieldError(dateField)}
					/>
					{isNectar && (
						<CustomDateInput
							label={t.documentForm.fieldDateEcheanceLabel}
							value={formik.values.date_echeance ?? ''}
							minimumDate={formik.values[dateField] || undefined}
							disabled={disabled}
							onChange={(value) => void formik.setFieldValue('date_echeance', value || null)}
						/>
					)}
					{isEdit && (
						<CustomDropDownSelect
							label={labels.fieldStatut}
							compact
							startIcon={icon('flag')}
							items={(isDelivery ? bonDeLivraisonStatusItemsList : devisFactureStatusItemsList).filter(
								(item) => item.value,
							)}
							value={statut}
							getOptionLabel={(value) => getStatutLabel(value, t)}
							disabled={!props.canChangeStatus || disabled}
							onChange={(value) => void changeStatus(value)}
						/>
					)}
				</SectionCard>
				<SectionCard title={t.documentForm.clientSection} icon="person-outline">
					<CustomAutoCompleteSelect
						id="client"
						label={t.documentForm.fieldClientLabel}
						items={clientItems}
						value={clientItems.find((item) => item.value === String(formik.values.client)) ?? null}
						noOptionsText={t.documentForm.noClientFound}
						required
						disabled={disabled || clientsQuery.isLoading}
						startIcon={icon('person-outline')}
						error={!!fieldError('client')}
						helperText={fieldError('client')}
						onBlur={() => void formik.setFieldTouched('client', true)}
						onChange={(_event, value) => void formik.setFieldValue('client', value ? Number(value.value) : null)}
						labelActions={
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={t.clients.newClient}
								disabled={disabled}
								className="min-h-11 justify-center px-2"
								onPress={() => router.push({ pathname: CLIENTS_ADD, params: { company_id: String(props.company.id) } })}
							>
								<Text className="font-poppins-medium text-sm text-brand dark:text-blue-300">{t.common.add}</Text>
							</Pressable>
						}
					/>
				</SectionCard>
				<SectionCard title={t.logistique.fieldFournisseur} icon="local-shipping">
					<CustomTextInput
						{...field('fournisseur', t.logistique.fieldFournisseur, 'local-shipping')}
						accessibilityLabel={t.logistique.fieldFournisseur}
						disabled={disabled || supplierNameLocked}
					/>
					<CustomTextInput
						{...field('fournisseur_email', t.logistique.fieldSupplierEmail, 'mail-outline')}
						disabled={disabled || inheritedSupplierSnapshotLocked}
						keyboardType="email-address"
						autoCapitalize="none"
					/>
				</SectionCard>
				{props.company.uses_foreign_currency && (
					<SectionCard title={t.documentForm.deviseSection} icon="currency-exchange">
						<CustomDropDownSelect
							label={t.documentForm.deviseLabel}
							startIcon={icon('currency-exchange')}
							items={[
								{ code: t.documentForm.deviseMAD, value: 'MAD' },
								{ code: t.documentForm.deviseEUR, value: 'EUR' },
								{ code: t.documentForm.deviseUSD, value: 'USD' },
							]}
							value={formik.values.devise}
							disabled={disabled || !!formik.values.lignes.length}
							helperText={formik.values.lignes.length ? t.documentForm.deviseLockedHelper : t.documentForm.deviseHelper}
							onChange={(value) => void formik.setFieldValue('devise', value)}
						/>
					</SectionCard>
				)}
				<SectionCard title={t.documentForm.paymentSection} icon="payments">
					<CustomAutoCompleteSelect
						label={t.documentForm.fieldModePaiementLabel}
						items={modes}
						value={selectedMode}
						noOptionsText={t.documentForm.noModePaiement}
						startIcon={icon('payments')}
						disabled={disabled || parameterLoading || modesQuery.isLoading}
						error={!!fieldError('mode_paiement')}
						helperText={fieldError('mode_paiement')}
						onChange={(_event, value) => void formik.setFieldValue('mode_paiement', value ? Number(value.value) : null)}
						labelActions={
							<EntityCrudControls
								iconOnly
								label={t.documentForm.modePaiementLabel}
								selectedItem={selectedMode}
								disabled={disabled || parameterLoading}
								addEntity={({ data }) => addMode({ data: { ...data, company: props.company.id } })}
								editEntity={({ id, data }) => editMode({ id, data: { ...data, company: props.company.id } })}
								deleteEntity={deleteMode}
								onAddSuccess={(id) => void formik.setFieldValue('mode_paiement', id)}
								onDeleteSuccess={() => void formik.setFieldValue('mode_paiement', null)}
							/>
						}
					/>
					{!isDevis && !isDelivery && (
						<CustomTextInput
							{...field('termes_paiement', t.documentForm.fieldTermesPaiementLabel, 'notes')}
							multiline
							numberOfLines={3}
						/>
					)}
					{isDelivery && (
						<CompanyDocumentLivreParField
							companyId={props.company.id}
							value={formik.values.livre_par ?? null}
							onChange={(value) => void formik.setFieldValue('livre_par', value)}
							disabled={disabled}
							error={fieldError('livre_par')}
							onBlur={() => void formik.setFieldTouched('livre_par', true)}
						/>
					)}
					<CustomTextInput {...field(extraField, extraLabel, 'tag')} />
				</SectionCard>
				{isEdit && (
					<View
						onLayout={(event) => {
							if (scrollToLinesPending.current) {
								scrollToLinesPending.current = false;
								scrollRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true });
							}
						}}
					>
						{articlesQuery.isError && (
							<QueryError error={articlesQuery.error} onRetry={() => void articlesQuery.refetch()} variant="banner" />
						)}
						{stockPosted && (
							<View className="mb-3 flex-row items-start gap-3">
								<MaterialIcons name="lock-outline" size={20} color={colors.slate[400]} />
								<Text className="flex-1 font-sans text-sm leading-6 text-slate-500 dark:text-slate-300">
									{t.bonsLivraison.stockPostedLinesHint}
								</Text>
							</View>
						)}
						<LinesGrid
							title={labels.linesTitle}
							rows={formik.values.lignes}
							articles={articles}
							devise={formik.values.devise}
							disabled={disabled}
							canEditPrice={props.role === 'Caissier'}
							disableRemise={isNectar}
							errors={lineErrors}
							onAddClick={stockPosted ? undefined : () => setShowArticles(true)}
							onDelete={stockPosted ? undefined : setDeleteIndex}
							onChange={
								stockPosted
									? undefined
									: (index, name, value) => {
											void formik.setFieldValue(`lignes.${index}.${name}`, value);
											if (name === 'remise_type' && value === '')
												void formik.setFieldValue(`lignes.${index}.remise`, 0);
										}
							}
						/>
						{!!fieldError('lignes') && (
							<Text className="pt-3 font-sans text-sm text-red-600 dark:text-red-300">{fieldError('lignes')}</Text>
						)}
					</View>
				)}
				{isEdit && !missingArticles && (
					<FactureDevisTotalsCard
						totals={totals}
						devise={formik.values.devise}
						showDiscountTotal={!isNectar}
						showPurchaseTotal={!isNectar}
					>
						{!isNectar && (
							<CompanyDocumentRemiseControls
								type={formik.values.remise_type}
								value={formik.values.remise}
								devise={formik.values.devise}
								disabled={disabled}
								error={fieldError('remise')}
								onApply={() => setShowRemise(true)}
								onRemove={() => {
									void formik.setFieldValue('remise_type', '');
									void formik.setFieldValue('remise', 0);
								}}
							/>
						)}
					</FactureDevisTotalsCard>
				)}
				{!isNectar && (
					<RemarkSection
						{...field('remarque', t.documentForm.remarqueLabel, 'notes')}
						title={t.documentForm.remarqueSection}
					/>
				)}
				{props.extraSections?.(statut)}
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					loading={disabled}
					active={
						!disabled &&
						!parameterLoading &&
						!resettingNumber &&
						(!isEdit || (!missingArticles && !articlesQuery.isError))
					}
					onClick={() => {
						setAttempted(true);
						void formik.submitForm();
						if (!formik.isValid) {
							onError(t.common.correctErrors);
							scrollRef.current?.scrollTo({ y: 0, animated: true });
						}
					}}
				/>
			</PageActionBar>
			{showArticles && (
				<AddArticleModal
					companyId={props.company.id}
					documentDevise={formik.values.devise}
					existingArticleIds={new Set(articleIds)}
					existingArticleLineValues={Object.fromEntries(
						formik.values.lignes.map((line) => [
							line.article,
							{
								quantity: line.quantity,
								remise_type: line.remise_type ?? '',
								remise: line.remise ?? 0,
							},
						]),
					)}
					disableRemise={isNectar}
					onAdd={addArticles}
					onClose={() => setShowArticles(false)}
				/>
			)}
			{showRemise && (
				<GlobalRemiseModal
					currentType={formik.values.remise_type}
					currentValue={formik.values.remise}
					devise={formik.values.devise}
					maximum={totals.totalHT}
					onApply={(type, value) => {
						void formik.setFieldValue('remise_type', type);
						void formik.setFieldValue('remise', value);
					}}
					onClose={() => setShowRemise(false)}
				/>
			)}
			{deleteIndex !== null && (
				<ConfirmationModal
					title={t.documentForm.deleteLineTitle}
					body={labels.deleteLineBody}
					action="delete"
					recordName={formik.values.lignes[deleteIndex]?.designation}
					confirmText={t.common.delete}
					loading={false}
					onClose={() => setDeleteIndex(null)}
					onConfirm={() => {
						void formik.setFieldValue(
							'lignes',
							formik.values.lignes.filter((_line, index) => index !== deleteIndex),
						);
						setDeleteIndex(null);
					}}
				/>
			)}
		</View>
	);
};

export default CompanyDocumentFormContent;
