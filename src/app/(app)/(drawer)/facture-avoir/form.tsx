import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getIn, useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import { useGetArticlesListQuery } from '@/store/services/article';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetFactureClientListQuery, useGetFactureClientQuery } from '@/store/services/factureClient';
import { useGetModePaiementListQuery } from '@/store/services/parameter';
import {
	useAddFactureAvoirMutation,
	useEditFactureAvoirMutation,
	useGetFactureAvoirFromFactureQuery,
	useGetFactureAvoirQuery,
	useGetNumFactureAvoirQuery,
	useLazyGetFactureAvoirFromFactureQuery,
	usePatchFactureAvoirStatutMutation,
} from '@/store/services/factureAvoir';
import { factureAvoirSchema } from '@/utils/formValidationSchemas';
import {
	calculateDocumentTotals,
	extractApiErrorMessage,
	formatLocalDate,
	getStatutLabel,
	parseEntityId,
	parseNumber,
	setFormikAutoErrors,
	ValidatePricesHelper,
} from '@/utils/helpers';
import { FACTURE_AVOIR_EDIT, FACTURE_AVOIR_VIEW } from '@/utils/routes';
import { colors } from '@/utils/themes';
import type { ArticleClass, CompanyClass, FactureAvoirClass } from '@/models/classes';
import type { SelectedArticlePopupValues } from '@/types/articleTypes';
import type {
	FactureAvoirFormValues,
	FactureAvoirFromFactureResponse,
	FactureAvoirMotif,
	FactureAvoirWriteData,
} from '@/types/companyDocumentsTypes';
import type { TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import CompanyDocumentNumberFields from '@/components/shared/company-documents-form/companyDocumentNumberFields';
import CompanyDocumentRemiseControls from '@/components/shared/company-documents-form/companyDocumentRemiseControls';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import FactureDevisTotalsCard from '@/components/shared/factureDevistotalCard/factureDevisTotalsCard';
import LinesGrid from '@/components/shared/linesGrid/linesGrid';
import AddArticleModal from '@/components/shared/addArticleModal/addArticleModal';
import GlobalRemiseModal from '@/components/shared/globalRemiseModal/globalRemiseModal';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import type { SearchParams } from '@/types/_initTypes';

const toFormLines = (lines: FactureAvoirClass['lignes'] = []): FactureAvoirFormValues['lignes'] =>
	lines.map((line) => ({
		id: line.id,
		article: line.article,
		designation: line.designation ?? line.article_designation ?? '',
		prix_achat: Number(line.prix_achat ?? 0),
		devise_prix_achat: line.devise_prix_achat || 'MAD',
		prix_vente: Number(line.prix_vente ?? 0),
		devise_prix_vente: line.devise_prix_vente || 'MAD',
		quantity: Number(line.quantity ?? 1),
		remise_type: line.remise_type || '',
		remise: Number(line.remise ?? 0),
	}));

type Props = {
	company: CompanyClass;
	role: string;
	canChangeStatus: boolean;
	id?: number;
	rawData?: FactureAvoirClass;
	prefill?: FactureAvoirFromFactureResponse;
	companySelect?: (disabled: boolean) => ReactNode;
};

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEdit = props.id !== undefined;
	const legacyFree = isEdit && !props.rawData?.facture_origine;
	const locked = isEdit && props.rawData?.statut !== 'Brouillon';
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const submitting = useRef(false);
	const originRequest = useRef<ReturnType<ReturnType<typeof useLazyGetFactureAvoirFromFactureQuery>[0]> | null>(null);
	const originSequence = useRef(0);
	const [attempted, setAttempted] = useState(false);
	const [selectedArticles, setSelectedArticles] = useState<Partial<ArticleClass>[]>([]);
	const [showArticles, setShowArticles] = useState(false);
	const [showRemise, setShowRemise] = useState(false);
	const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
	const [resettingNumber, setResettingNumber] = useState(false);
	const [loadFromFacture, originMutation] = useLazyGetFactureAvoirFromFactureQuery();
	const [addData, adding] = useAddFactureAvoirMutation();
	const [editData, editing] = useEditFactureAvoirMutation();
	const [patchStatut, patching] = usePatchFactureAvoirStatutMutation();
	const numberQuery = useGetNumFactureAvoirQuery(
		{ company_id: props.company.id },
		{ skip: !token || isEdit, refetchOnMountOrArgChange: true },
	);
	const clientsQuery = useGetClientsListQuery(
		{ company_id: props.company.id, with_pagination: false },
		{ skip: !token },
	);
	const invoicesQuery = useGetFactureClientListQuery(
		{ company_id: props.company.id, with_pagination: false },
		{ skip: !token },
	);
	const modesQuery = useGetModePaiementListQuery({ company_id: props.company.id }, { skip: !token });
	const initial = props.rawData ?? props.prefill;
	// Load a document once. A background balance/status refresh must not erase a draft.
	const [initialValues] = useState<FactureAvoirFormValues>(() => ({
		numero_part: props.rawData?.numero_avoir?.split('/')[0] ?? '',
		year_part: props.rawData?.numero_avoir?.split('/')[1] ?? '',
		date_avoir: initial?.date_avoir ?? formatLocalDate(new Date()),
		facture_origine: initial?.facture_origine ?? null,
		client: initial?.client ?? null,
		mode_paiement: initial?.mode_paiement ?? null,
		motif_avoir: (props.rawData?.motif_avoir ?? '') as FactureAvoirMotif | '',
		numero_bon_commande_client: initial?.numero_bon_commande_client ?? '',
		remarque: props.rawData?.remarque ?? '',
		fournisseur: initial?.fournisseur ?? '',
		fournisseur_email: initial?.fournisseur_email ?? '',
		statut: props.rawData?.statut ?? 'Brouillon',
		remise_type: initial?.remise_type ?? '',
		remise: Number(initial?.remise ?? 0),
		devise: initial?.devise ?? 'MAD',
		lignes: toFormLines(initial?.lignes),
		globalError: '',
	}));
	const schema = factureAvoirSchema.superRefine((values, ctx) => {
		if (!values.motif_avoir)
			ctx.addIssue({ code: 'custom', path: ['motif_avoir'], message: t.facturesAvoir.motifRequired });
		if (!legacyFree && !values.facture_origine)
			ctx.addIssue({ code: 'custom', path: ['facture_origine'], message: t.facturesAvoir.originRequired });
		if (!values.client) ctx.addIssue({ code: 'custom', path: ['client'], message: t.facturesAvoir.clientRequired });
		if (!values.lignes.length)
			ctx.addIssue({ code: 'custom', path: ['lignes'], message: t.facturesAvoir.linesRequired });
		values.lignes.forEach((line, index) => {
			const error = ValidatePricesHelper.validateRemise(
				Number(line.remise ?? 0),
				line.remise_type ?? '',
				line.prix_vente * line.quantity,
			);
			if (error) ctx.addIssue({ code: 'custom', path: ['lignes', index, 'remise'], message: error });
		});
	});
	const formik = useFormik<FactureAvoirFormValues>({
		initialValues,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(schema),
		onSubmit: async (values, { setFieldError }) => {
			if (locked || submitting.current || originMutation.isFetching) return;
			submitting.current = true;
			const payload: FactureAvoirWriteData = {
				date_avoir: values.date_avoir,
				facture_origine: values.facture_origine,
				client: values.client,
				mode_paiement: values.mode_paiement,
				motif_avoir: values.motif_avoir,
				numero_bon_commande_client: values.numero_bon_commande_client || null,
				remarque: values.remarque || null,
				fournisseur: values.fournisseur,
				fournisseur_email: values.fournisseur_email,
				remise_type: values.remise_type,
				remise: parseNumber(values.remise) ?? 0,
				devise: values.devise,
				// The backend generates the number and derives company from the original invoice.
				lignes: values.lignes.map((line) => ({
					id: typeof line.id === 'number' ? line.id : undefined,
					article: line.article,
					designation: line.designation,
					prix_achat: parseNumber(line.prix_achat) ?? 0,
					devise_prix_achat: line.devise_prix_achat,
					prix_vente: parseNumber(line.prix_vente) ?? 0,
					devise_prix_vente: line.devise_prix_vente,
					quantity: parseNumber(line.quantity) ?? 1,
					remise_type: line.remise_type ?? '',
					remise: parseNumber(line.remise ?? 0) ?? 0,
				})),
			};
			try {
				if (props.id !== undefined) {
					await editData({ id: props.id, data: payload }).unwrap();
					if (props.canChangeStatus && values.statut !== props.rawData?.statut)
						await patchStatut({ id: props.id, data: { statut: values.statut } }).unwrap();
					onSuccess(t.facturesAvoir.updateSuccess);
					const route = FACTURE_AVOIR_VIEW(props.id);
					router.replace({ ...route, params: { ...route.params, company_id: String(props.company.id) } });
				} else {
					const result = await addData({ data: payload }).unwrap();
					onSuccess(t.facturesAvoir.addSuccess);
					const route = FACTURE_AVOIR_EDIT(result.id);
					router.replace({ ...route, params: { ...route.params, company_id: String(props.company.id) } });
				}
			} catch (error) {
				setFormikAutoErrors({ e: error, setFieldError });
				onError(extractApiErrorMessage(error, isEdit ? t.facturesAvoir.updateError : t.facturesAvoir.addError));
			} finally {
				submitting.current = false;
			}
		},
	});
	const busy =
		formik.isSubmitting || adding.isLoading || editing.isLoading || patching.isLoading || originMutation.isFetching;
	const disabled = locked || busy;
	const articleIds = [...new Set(formik.values.lignes.map((line) => line.article))];
	const articlesQuery = useGetArticlesListQuery(
		{ company_id: props.company.id, with_pagination: false, ids: articleIds.join(',') },
		{ skip: !token || !articleIds.length },
	);
	const articles = [
		...(Array.isArray(articlesQuery.currentData) ? articlesQuery.currentData : []),
		...selectedArticles,
	];
	const missingArticles = articleIds.some((id) => !articles.some((article) => article.id === id));
	const totals = calculateDocumentTotals(
		formik.values.lignes,
		articles,
		formik.values.remise_type,
		formik.values.remise,
	);
	const invoices = Array.isArray(invoicesQuery.currentData)
		? invoicesQuery.currentData
		: (invoicesQuery.currentData?.results ?? []);
	const originItems = invoices.map((invoice) => ({
		value: String(invoice.id),
		code: `${invoice.numero_facture ?? ''} - ${invoice.client_name ?? ''}`.trim(),
	}));
	if (initial?.facture_origine && !originItems.some((item) => item.value === String(initial.facture_origine)))
		originItems.push({
			value: String(initial.facture_origine),
			code: initial.facture_origine_numero ?? String(initial.facture_origine),
		});
	const clients = Array.isArray(clientsQuery.currentData) ? clientsQuery.currentData : [];
	const clientItems = clients
		.filter((client) => !client.archived || client.id === formik.values.client)
		.map((client) => ({
			value: String(client.id),
			code: client.raison_sociale || [client.prenom, client.nom].filter(Boolean).join(' ') || client.code_client || '',
		}));
	if (formik.values.client && !clientItems.some((item) => item.value === String(formik.values.client)))
		clientItems.push({
			value: String(formik.values.client),
			code:
				invoices.find((invoice) => invoice.id === formik.values.facture_origine)?.client_name ??
				initial?.client_name ??
				String(formik.values.client),
		});
	const modeItems = (modesQuery.currentData ?? []).map((mode) => ({ value: String(mode.id), code: mode.nom }));
	const motifItems = [
		{ value: 'retour_marchandise', code: t.facturesAvoir.motifRetour },
		{ value: 'erreur_facturation', code: t.facturesAvoir.motifErreur },
		{ value: 'remise', code: t.facturesAvoir.motifRemise },
		{ value: 'annulation', code: t.facturesAvoir.motifAnnulation },
		{ value: 'autre', code: t.facturesAvoir.motifAutre },
	];
	const fieldError = (name: string) =>
		(attempted || getIn(formik.touched, name)) && typeof getIn(formik.errors, name) === 'string'
			? (getIn(formik.errors, name) as string)
			: undefined;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const field = (
		name: keyof FactureAvoirFormValues,
		label: string,
		iconName: ComponentProps<typeof MaterialIcons>['name'],
	) => ({
		nativeID: name,
		label,
		placeholder: label,
		value: String(formik.values[name] ?? ''),
		disabled,
		onChangeText: formik.handleChange(name),
		onBlur: formik.handleBlur(name),
		error: !!fieldError(name),
		helperText: fieldError(name),
		startIcon: icon(iconName),
	});
	useEffect(
		() => () => {
			originSequence.current += 1;
			originRequest.current?.abort();
			originRequest.current?.unsubscribe();
		},
		[],
	);
	const applyOrigin = async (id: number) => {
		if (disabled || isEdit || !invoices.some((invoice) => invoice.id === id && invoice.company === props.company.id))
			return;
		const sequence = ++originSequence.current;
		originRequest.current?.abort();
		originRequest.current?.unsubscribe();
		const request = loadFromFacture({ id }, false);
		originRequest.current = request;
		try {
			const data = await request.unwrap();
			if (sequence !== originSequence.current) return;
			// Copy the invoice snapshot together, so a failed/late response cannot mix two invoices.
			await formik.setValues((previous) => ({
				...previous,
				facture_origine: data.facture_origine ?? id,
				client: data.client ?? null,
				mode_paiement: data.mode_paiement ?? null,
				date_avoir: data.date_avoir ?? previous.date_avoir,
				numero_bon_commande_client: data.numero_bon_commande_client ?? '',
				fournisseur: data.fournisseur ?? '',
				fournisseur_email: data.fournisseur_email ?? '',
				devise: data.devise ?? 'MAD',
				remise_type: data.remise_type ?? '',
				remise: Number(data.remise ?? 0),
				lignes: toFormLines(data.lignes),
			}));
		} catch (error) {
			if (sequence === originSequence.current) onError(extractApiErrorMessage(error, t.facturesAvoir.addError));
		} finally {
			request.unsubscribe();
			if (sequence === originSequence.current) originRequest.current = null;
		}
	};
	const addArticles = (chosen: SelectedArticlePopupValues[]) => {
		setSelectedArticles((previous) => [
			...previous.filter((article) => !chosen.some((item) => item.articleId === article.id)),
			...chosen.map((item) => item.articleData),
		]);
		const lines = [...formik.values.lignes];
		for (const selection of chosen) {
			const article = selection.articleData;
			const quantity = Math.max(0.01, parseNumber(selection.quantity) ?? 1);
			const remise_type = selection.remise_type;
			const remise = remise_type ? Math.max(0, parseNumber(selection.remise) ?? 0) : 0;
			const index = lines.findIndex((line) => line.article === selection.articleId);
			if (index >= 0) lines[index] = { ...lines[index]!, quantity, remise_type, remise };
			else
				lines.push({
					article: selection.articleId,
					designation: article.designation ?? '',
					prix_achat: Number(article.prix_achat ?? 0),
					devise_prix_achat: article.devise_prix_achat || 'MAD',
					prix_vente: Number(article.prix_vente ?? 0),
					devise_prix_vente: article.devise_prix_vente || formik.values.devise,
					quantity,
					remise_type,
					remise,
				});
		}
		void formik.setFieldValue('lignes', lines);
	};
	const resetNumber = async () => {
		if (resettingNumber || disabled || isEdit) return;
		setResettingNumber(true);
		try {
			await numberQuery.refetch().unwrap();
		} catch (error) {
			onError(extractApiErrorMessage(error, t.common.genericError));
		} finally {
			setResettingNumber(false);
		}
	};
	const lineErrors: Record<string, string> = {};
	formik.values.lignes.forEach((_line, index) => {
		for (const name of ['quantity', 'prix_vente', 'remise']) {
			const error = fieldError(`lignes.${index}.${name}`);
			if (error) lineErrors[`lignes.${index}.${name}`] = error;
		}
	});
	const number = props.rawData?.numero_avoir ?? numberQuery.currentData?.numero_avoir ?? '';
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
				keyboardShouldPersistTaps="handled"
			>
				{formik.errors.globalError || (attempted && !formik.isValid) ? (
					<ApiAlert variant="banner" errorDetails={formik.errors.globalError || t.common.correctErrors} />
				) : null}
				{[clientsQuery, invoicesQuery, modesQuery, numberQuery].map((query, index) =>
					query.isError ? (
						<QueryError key={index} variant="banner" error={query.error} onRetry={() => void query.refetch()} />
					) : null,
				)}
				{props.companySelect && <SectionCard>{props.companySelect(disabled)}</SectionCard>}
				<SectionCard title={t.documentForm.documentInfoSection} icon="description">
					{locked && (
						<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">
							{t.facturesAvoir.onlyDraftEditable}
						</Text>
					)}
					<CompanyDocumentNumberFields
						numberInput={{ value: number.split('/')[0] ?? '', disabled: true, hideLockIcon: true }}
						yearInput={{ value: number.split('/')[1] ?? '', disabled: true, hideLockIcon: true }}
						reset={!isEdit ? { loading: resettingNumber, disabled, onPress: () => void resetNumber() } : undefined}
					/>
					<CustomDateInput
						label={t.facturesAvoir.fieldDate}
						value={formik.values.date_avoir}
						onChange={(value) => void formik.setFieldValue('date_avoir', value ?? '')}
						disabled={disabled}
						error={!!fieldError('date_avoir')}
						helperText={fieldError('date_avoir')}
					/>
					<CustomDropDownSelect
						label={t.facturesAvoir.fieldMotif}
						compact
						required
						items={motifItems}
						value={formik.values.motif_avoir}
						getOptionLabel={(value) => motifItems.find((item) => item.value === value)?.code ?? value}
						onChange={(value) => void formik.setFieldValue('motif_avoir', value)}
						startIcon={icon('description')}
						disabled={disabled}
						error={!!fieldError('motif_avoir')}
						helperText={fieldError('motif_avoir')}
					/>
					{isEdit && (
						<CustomDropDownSelect
							label={t.facturesAvoir.fieldStatut}
							compact
							items={['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Annulé', 'Expiré']}
							value={formik.values.statut}
							getOptionLabel={(value) => getStatutLabel(value, t)}
							startIcon={icon('flag')}
							disabled={disabled || !props.canChangeStatus}
							onChange={(value) => void formik.setFieldValue('statut', value as TypeFactureLivraisonDevisStatus)}
						/>
					)}
				</SectionCard>
				<SectionCard title={t.facturesAvoir.originLabel} icon="receipt-long">
					<CustomAutoCompleteSelect
						label={t.facturesAvoir.selectOrigin}
						required={!legacyFree}
						items={originItems}
						value={originItems.find((item) => item.value === String(formik.values.facture_origine)) ?? null}
						noOptionsText={t.common.noData}
						startIcon={icon('receipt-long')}
						disabled={disabled || isEdit}
						onChange={(_event, item) => {
							if (item) void applyOrigin(Number(item.value));
						}}
						onBlur={formik.handleBlur('facture_origine')}
						error={!!fieldError('facture_origine')}
						helperText={fieldError('facture_origine')}
					/>
				</SectionCard>
				<SectionCard title={t.documentForm.clientSection} icon="person-outline">
					<CustomAutoCompleteSelect
						id="client"
						label={t.documentForm.fieldClientLabel}
						items={clientItems}
						value={clientItems.find((item) => item.value === String(formik.values.client)) ?? null}
						noOptionsText={t.documentForm.noClientFound}
						required
						disabled={disabled || !legacyFree}
						startIcon={icon('person-outline')}
						onChange={(_event, item) => void formik.setFieldValue('client', item ? Number(item.value) : null)}
						onBlur={() => void formik.setFieldTouched('client', true)}
						error={!!fieldError('client')}
						helperText={fieldError('client')}
					/>
				</SectionCard>
				<SectionCard title={t.logistique.fieldFournisseur} icon="local-shipping">
					<CustomTextInput
						{...field('fournisseur', t.logistique.fieldFournisseur, 'local-shipping')}
						accessibilityLabel={t.logistique.fieldFournisseur}
						disabled={disabled || !legacyFree}
					/>
					<CustomTextInput
						{...field('fournisseur_email', t.logistique.fieldSupplierEmail, 'mail-outline')}
						keyboardType="email-address"
						autoCapitalize="none"
						disabled={disabled || !legacyFree}
					/>
				</SectionCard>
				{props.company.uses_foreign_currency && (
					<SectionCard title={t.documentForm.deviseSection} icon="currency-exchange">
						<CustomDropDownSelect
							label={t.documentForm.deviseLabel}
							startIcon={icon('currency-exchange')}
							items={['MAD', 'EUR', 'USD']}
							value={formik.values.devise}
							disabled
						/>
					</SectionCard>
				)}
				<SectionCard title={t.documentForm.paymentSection} icon="payments">
					<CustomAutoCompleteSelect
						label={t.documentForm.fieldModePaiementLabel}
						items={modeItems}
						value={modeItems.find((item) => item.value === String(formik.values.mode_paiement)) ?? null}
						noOptionsText={t.documentForm.noModePaiement}
						disabled={disabled}
						startIcon={icon('payments')}
						error={!!fieldError('mode_paiement')}
						helperText={fieldError('mode_paiement')}
						onBlur={() => void formik.setFieldTouched('mode_paiement', true)}
						onChange={(_event, item) => void formik.setFieldValue('mode_paiement', item ? Number(item.value) : null)}
					/>
					<CustomTextInput {...field('numero_bon_commande_client', t.facturesAvoir.fieldNumeroBonCommande, 'tag')} />
				</SectionCard>
				{articlesQuery.isError && (
					<QueryError variant="banner" error={articlesQuery.error} onRetry={() => void articlesQuery.refetch()} />
				)}
				<LinesGrid
					title={t.facturesAvoir.linesTitle}
					rows={formik.values.lignes}
					articles={articles}
					devise={formik.values.devise}
					disabled={disabled}
					canEditPrice={props.role === 'Caissier'}
					errors={lineErrors}
					onAddClick={locked ? undefined : () => setShowArticles(true)}
					onDelete={locked ? undefined : setDeleteIndex}
					onChange={
						locked
							? undefined
							: (index, name, value) => {
									const lines = [...formik.values.lignes];
									lines[index] = { ...lines[index]!, [name]: value };
									if (name === 'remise_type' && !value) lines[index]!.remise = 0;
									void formik.setFieldValue('lignes', lines);
								}
					}
				/>
				{!!fieldError('lignes') && (
					<Text className="pt-3 font-sans text-sm text-red-600 dark:text-red-300">{fieldError('lignes')}</Text>
				)}
				{!!formik.values.lignes.length && !missingArticles && (
					<FactureDevisTotalsCard totals={totals} devise={formik.values.devise}>
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
					</FactureDevisTotalsCard>
				)}
				<RemarkSection
					{...field('remarque', t.documentForm.remarqueLabel, 'notes')}
					title={t.documentForm.remarqueSection}
				/>
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					loading={busy}
					active={!disabled && !missingArticles && !resettingNumber}
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
			{showArticles && !locked && (
				<AddArticleModal
					companyId={props.company.id}
					documentDevise={formik.values.devise}
					existingArticleIds={new Set(articleIds)}
					existingArticleLineValues={Object.fromEntries(
						formik.values.lignes.map((line) => [
							line.article,
							{ quantity: line.quantity, remise_type: line.remise_type ?? '', remise: line.remise ?? 0 },
						]),
					)}
					onAdd={addArticles}
					onClose={() => setShowArticles(false)}
				/>
			)}
			{showRemise && !locked && (
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
			{deleteIndex !== null && !locked && (
				<ConfirmationModal
					title={t.documentForm.deleteLineTitle}
					body={t.facturesAvoir.deleteLineBody}
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

type LocalSearchParams = SearchParams & { facture_origine_id?: string | string[] };

const FactureAvoirFormPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompany = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const initialOrigin = params.facture_origine_id === undefined ? undefined : parseEntityId(params.facture_origine_id);
	const invalid = id === null || requestedCompany === null || initialOrigin === null;
	const { t } = useLanguage();
	const token = useInitAccessToken();
	const [selectedCompany, setSelectedCompany] = useState<number | null>(null);
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalid });
	const documentQuery = useGetFactureAvoirQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalid || id === undefined, refetchOnMountOrArgChange: true },
	);
	const originInvoiceQuery = useGetFactureClientQuery(
		{ id: initialOrigin ?? 0 },
		{ skip: !token || invalid || id !== undefined || initialOrigin === undefined },
	);
	const eligible = (companiesQuery.currentData ?? []).filter(
		(company) => company.role === 'Caissier' || company.role === 'Commercial',
	);
	const companyId =
		id !== undefined
			? documentQuery.currentData?.company
			: initialOrigin !== undefined
				? originInvoiceQuery.currentData?.company
				: (requestedCompany ?? selectedCompany ?? eligible[0]?.id);
	const company = eligible.find((item) => item.id === companyId);
	const companyQuery = useGetCompanyQuery({ id: company?.id ?? 0 }, { skip: !token || invalid || !company });
	const prefillQuery = useGetFactureAvoirFromFactureQuery(
		{ id: initialOrigin ?? 0 },
		{ skip: !token || invalid || !company || id !== undefined || initialOrigin === undefined },
	);
	if (invalid) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return <QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />;
	if (id !== undefined && !documentQuery.currentData)
		return documentQuery.isError ? (
			<QueryError error={documentQuery.error} onRetry={() => void documentQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (id === undefined && initialOrigin !== undefined && !originInvoiceQuery.currentData)
		return originInvoiceQuery.isError ? (
			<QueryError error={originInvoiceQuery.error} onRetry={() => void originInvoiceQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (!company || (requestedCompany !== undefined && company.id !== requestedCompany)) return <NoPermission />;
	if (id === undefined && initialOrigin !== undefined && !prefillQuery.currentData)
		return prefillQuery.isError ? (
			<QueryError error={prefillQuery.error} onRetry={() => void prefillQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (!companyQuery.currentData)
		return companyQuery.isError ? (
			<QueryError error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}:${initialOrigin ?? ''}`}
			company={companyQuery.currentData}
			role={company.role}
			canChangeStatus={company.can_change_document_status === true}
			id={id}
			rawData={documentQuery.currentData}
			prefill={prefillQuery.currentData}
			companySelect={
				id === undefined && requestedCompany === undefined && initialOrigin === undefined
					? (disabled) => (
							<CustomAutoCompleteSelect
								label={t.shared.selectCompany}
								items={eligible.map((item) => ({ value: String(item.id), code: item.raison_sociale }))}
								value={{ value: String(company.id), code: company.raison_sociale }}
								disabled={disabled}
								startIcon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
								noOptionsText={t.shared.noCompaniesFound}
								onChange={(_event, item) => {
									if (item) setSelectedCompany(Number(item.value));
								}}
							/>
						)
					: undefined
			}
		/>
	);
};

export default FactureAvoirFormPage;
