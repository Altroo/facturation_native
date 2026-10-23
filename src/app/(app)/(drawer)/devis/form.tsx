import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { getIn, useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { ArticleClass, CompanyClass, DeviClass } from '@/models/classes';
import type { DevisFormSchema, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetArticlesListQuery } from '@/store/services/article';
import {
	useAddDeviMutation,
	useEditDeviMutation,
	useGetDeviQuery,
	useGetNumDevisQuery,
	usePatchStatutMutation,
} from '@/store/services/devi';
import {
	useGetModePaiementListQuery,
	useAddModePaiementMutation,
	useEditModePaiementMutation,
	useDeleteModePaiementMutation,
} from '@/store/services/parameter';
import { deviAddSchema, deviSchema } from '@/utils/formValidationSchemas';
import {
	calculateDocumentTotals,
	extractApiErrorMessage,
	formatLocalDate,
	formatNumberWithSpaces,
	getStatutLabel,
	isNectarRaisonSociale,
	parseEntityId,
	parseNumber,
	setFormikAutoErrors,
	ValidatePricesHelper,
} from '@/utils/helpers';
import { devisFactureStatusItemsList } from '@/utils/rawData';
import { CLIENTS_ADD, DEVIS_EDIT } from '@/utils/routes';
import { colors } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
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
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = {
	id?: number;
	company: CompanyClass;
	role: string;
	canChangeStatus: boolean;
	rawData?: DeviClass;
	initialNumber: string;
	numberQuery: ReturnType<typeof useGetNumDevisQuery>;
	companySelect?: (disabled: boolean) => ReactNode;
	scrollToLines: boolean;
};

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEdit = props.id !== undefined;
	const isNectar = isNectarRaisonSociale(props.company.raison_sociale);
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
	const [selectedArticles, setSelectedArticles] = useState<ArticleClass[]>([]);
	const [statut, setStatut] = useState<TypeFactureLivraisonDevisStatus>(props.rawData?.statut ?? 'Brouillon');
	const [addDevi, adding] = useAddDeviMutation();
	const [editDevi, editing] = useEditDeviMutation();
	const [patchStatut, patching] = usePatchStatutMutation();
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
	const [initialValues] = useState<DevisFormSchema>(() => ({
		numero_part: numberPart ?? '',
		year_part: yearPart || String(new Date().getFullYear()).slice(-2),
		client: props.rawData?.client ?? null,
		date_devis: props.rawData?.date_devis ?? formatLocalDate(new Date()),
		date_echeance: props.rawData?.date_echeance ?? null,
		numero_demande_prix_client: props.rawData?.numero_demande_prix_client ?? '',
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
	const editSchema = deviSchema.superRefine((data, ctx) => {
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
	const formik = useFormik<DevisFormSchema>({
		initialValues,
		validationSchema: toFormikValidationSchema(isEdit ? editSchema : deviAddSchema),
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
				numero_devis: `${data.numero_part}/${data.year_part}`,
				client: data.client,
				date_devis: data.date_devis,
				date_echeance: data.date_echeance || null,
				numero_demande_prix_client: data.numero_demande_prix_client || null,
				mode_paiement: data.mode_paiement,
				fournisseur: data.fournisseur.trim(),
				fournisseur_email: data.fournisseur_email.trim(),
				devise: data.devise,
				remarque: isNectar ? null : data.remarque || null,
				...(isEdit
					? {
							remise_type: isNectar ? ('' as const) : data.remise_type,
							remise: isNectar ? 0 : Number(data.remise),
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
			};
			try {
				if (props.id !== undefined) {
					await editDevi({ id: props.id, data: payload }).unwrap();
					onSuccess(t.devis.updateSuccess);
				} else {
					const result = await addDevi({ data: payload }).unwrap();
					onSuccess(t.devis.addSuccess);
					// The web uses sessionStorage to scroll to articles after creation.
					// A transient route parameter does the same in Expo Router.
					const route = DEVIS_EDIT(result.id);
					router.replace({
						...route,
						params: { ...route.params, company_id: String(props.company.id), scrollToLines: 'true' },
					});
				}
			} catch (error) {
				setFormikAutoErrors({ e: error, setFieldError });
				onError(extractApiErrorMessage(error, isEdit ? t.devis.updateError : t.devis.addError));
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
	const disabled = formik.isSubmitting || adding.isLoading || editing.isLoading || patching.isLoading;
	const fieldError = (name: string) =>
		(attempted || getIn(formik.touched, name)) && typeof getIn(formik.errors, name) === 'string'
			? (getIn(formik.errors, name) as string)
			: undefined;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const field = (
		name: keyof DevisFormSchema,
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
			const [number, year] = result.numero_devis.split('/');
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
		statusPending.current = true;
		try {
			const result = await patchStatut({
				id: props.id,
				data: { statut: value as TypeFactureLivraisonDevisStatus },
			}).unwrap();
			setStatut(result.statut);
			onSuccess(t.documentForm.statusUpdateSuccess);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.documentForm.statusUpdateError));
		} finally {
			statusPending.current = false;
		}
	};
	const addArticles = (chosen: ArticleClass[]) => {
		setSelectedArticles((previous) => [
			...previous.filter((article) => !chosen.some((item) => item.id === article.id)),
			...chosen,
		]);
		const lines = [...formik.values.lignes];
		for (const article of chosen) {
			// Selecting an existing article does not duplicate it or replace its
			// negotiated price. Quantities/discounts remain editable in its card.
			if (lines.some((line) => line.article === article.id)) continue;
			lines.push({
				article: article.id,
				reference: article.reference,
				designation: article.designation ?? '',
				prix_achat: Number(article.prix_achat ?? 0),
				devise_prix_achat: article.devise_prix_achat,
				prix_vente: Number(article.prix_vente ?? 0),
				devise_prix_vente: article.devise_prix_vente,
				quantity: 1,
				remise_type: '',
				remise: 0,
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
					<View className="flex-row items-start gap-3">
						<View className="min-w-0 flex-1">
							<CustomTextInput
								{...field('numero_part', t.documentForm.fieldNumeroLabel, 'tag')}
								compact
								required
								onChangeText={(value) => {
									if (/^[A-Za-z0-9]*$/.test(value)) void formik.setFieldValue('numero_part', value.toUpperCase());
								}}
							/>
						</View>
						{!(isNectar && !isEdit) && (
							<View className="w-20">
								<CustomTextInput
									{...field('year_part', t.documentForm.fieldAnneeLabel, 'event')}
									compact
									required
									keyboardType="number-pad"
									maxLength={2}
									onChangeText={(value) => {
										if (/^\d{0,2}$/.test(value)) void formik.setFieldValue('year_part', value);
									}}
								/>
							</View>
						)}
					</View>
					{!isEdit && (
						<PrimaryLoadingButton
							buttonText={t.documentForm.resetNumero}
							loading={resettingNumber}
							active={!disabled && !resettingNumber}
							inverted
							startIcon={icon('refresh')}
							onClick={() => void resetNumber()}
						/>
					)}
					<CustomDateInput
						label={t.devis.fieldDate}
						value={formik.values.date_devis}
						disabled={disabled}
						onChange={(value) => void formik.setFieldValue('date_devis', value)}
					/>
					{!!fieldError('date_devis') && (
						<Text className="font-sans text-xs text-red-600 dark:text-red-300">{fieldError('date_devis')}</Text>
					)}
					{isNectar && (
						<CustomDateInput
							label={t.documentForm.fieldDateEcheanceLabel}
							value={formik.values.date_echeance ?? ''}
							minimumDate={formik.values.date_devis || undefined}
							disabled={disabled}
							onChange={(value) => void formik.setFieldValue('date_echeance', value || null)}
						/>
					)}
					{isEdit && (
						<CustomDropDownSelect
							label={t.devis.fieldStatut}
							compact
							startIcon={icon('flag')}
							items={devisFactureStatusItemsList.filter((item) => item.value)}
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
						label={undefined}
						accessibilityLabel={t.logistique.fieldFournisseur}
					/>
					<CustomTextInput
						{...field('fournisseur_email', t.logistique.fieldSupplierEmail, 'mail-outline')}
						keyboardType="email-address"
						autoCapitalize="none"
					/>
				</SectionCard>
				{props.company.uses_foreign_currency && (
					<SectionCard title={t.documentForm.deviseSection} icon="currency-exchange">
						<CustomDropDownSelect
							label={t.documentForm.deviseLabel}
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
					<CustomTextInput {...field('numero_demande_prix_client', t.devis.fieldNumeroDemandePrix, 'tag')} />
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
						<LinesGrid
							title={t.devis.linesTitle}
							rows={formik.values.lignes}
							articles={articles}
							devise={formik.values.devise}
							disabled={disabled}
							canEditPrice={props.role === 'Caissier'}
							disableRemise={isNectar}
							errors={lineErrors}
							onAddClick={() => setShowArticles(true)}
							onDelete={setDeleteIndex}
							onChange={(index, name, value) => {
								void formik.setFieldValue(`lignes.${index}.${name}`, value);
								if (name === 'remise_type' && value === '') void formik.setFieldValue(`lignes.${index}.remise`, 0);
							}}
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
							<>
								<View className="flex-row items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
									<MaterialIcons name="sell" size={20} color={colors.brand} />
									<View className="min-w-0 flex-1 gap-1">
										<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">
											{t.documentForm.remiseGlobaleSection}
										</Text>
										<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
											{formik.values.remise_type
												? `${formatNumberWithSpaces(formik.values.remise, 2)} ${formik.values.remise_type === 'Pourcentage' ? '%' : formik.values.devise}`
												: t.globalRemiseModal.typeNone}
										</Text>
									</View>
									<PrimaryLoadingButton
										buttonText={t.documentForm.applyGlobalRemise}
										loading={false}
										active={!disabled}
										iconOnly
										inverted
										startIcon={icon(formik.values.remise_type ? 'edit' : 'add')}
										onClick={() => setShowRemise(true)}
									/>
									{!!formik.values.remise_type && (
										<PrimaryLoadingButton
											buttonText={t.documentForm.removeGlobalRemise}
											loading={false}
											active={!disabled}
											iconOnly
											inverted
											danger
											startIcon={icon('close')}
											onClick={() => {
												void formik.setFieldValue('remise_type', '');
												void formik.setFieldValue('remise', 0);
											}}
										/>
									)}
								</View>
								{!!fieldError('remise') && (
									<Text className="font-sans text-xs text-red-600 dark:text-red-300">{fieldError('remise')}</Text>
								)}
							</>
						)}
					</FactureDevisTotalsCard>
				)}
				{!isNectar && (
					<RemarkSection
						{...field('remarque', t.documentForm.remarqueLabel, 'notes')}
						title={t.documentForm.remarqueSection}
					/>
				)}
			</KeyboardAwareScrollView>
			<PageActionBar>
				<PrimaryLoadingButton
					buttonText={isEdit ? t.common.update : t.common.add}
					loading={disabled}
					active={
						!disabled &&
						!parameterLoading &&
						!resettingNumber &&
						(!isEdit || (!missingArticles && !articlesQuery.isError))
					}
					startIcon={icon('save')}
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
					body={t.devis.deleteLineBody}
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

const DevisFormPage = () => {
	const params = useLocalSearchParams<{
		id?: string | string[];
		company_id?: string | string[];
		scrollToLines?: string;
	}>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompanyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const invalidParams = id === null || requestedCompanyId === null;
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalidParams });
	const quoteQuery = useGetDeviQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalidParams || id === undefined, refetchOnMountOrArgChange: true },
	);
	const eligibleCompanies = (companiesQuery.currentData ?? []).filter(
		(company) => company.role === 'Caissier' || company.role === 'Commercial',
	);
	// Verify edit permissions against the API's company, never a caller's URL alone.
	const companyId =
		id !== undefined
			? quoteQuery.currentData?.company
			: (requestedCompanyId ?? selectedCompanyId ?? eligibleCompanies[0]?.id);
	const company = eligibleCompanies.find((item) => item.id === companyId);
	const companyQuery = useGetCompanyQuery({ id: company?.id ?? 0 }, { skip: !token || !company || invalidParams });
	const numberQuery = useGetNumDevisQuery(
		{ company_id: company?.id ?? 0 },
		{ skip: !token || !company || invalidParams || id !== undefined, refetchOnMountOrArgChange: true },
	);
	if (invalidParams) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return <QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />;
	if (id !== undefined && !quoteQuery.currentData)
		return quoteQuery.isError ? (
			<QueryError error={quoteQuery.error} onRetry={() => void quoteQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (!company || (requestedCompanyId !== undefined && requestedCompanyId !== company.id)) return <NoPermission />;
	if (!companyQuery.currentData)
		return companyQuery.isError ? (
			<QueryError error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (id === undefined && (numberQuery.isLoading || numberQuery.isUninitialized)) return <ApiProgress />;
	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}`}
			id={id}
			company={companyQuery.currentData}
			role={company.role}
			canChangeStatus={!!company.can_change_document_status}
			rawData={quoteQuery.currentData}
			initialNumber={quoteQuery.currentData?.numero_devis ?? numberQuery.currentData?.numero_devis ?? ''}
			numberQuery={numberQuery}
			scrollToLines={params.scrollToLines === 'true'}
			companySelect={
				id === undefined && requestedCompanyId === undefined
					? (disabled) => (
							<CustomAutoCompleteSelect
								label={t.shared.selectCompany}
								items={eligibleCompanies.map((item) => ({ code: item.raison_sociale, value: String(item.id) }))}
								value={{ code: company.raison_sociale, value: String(company.id) }}
								noOptionsText={t.shared.noCompaniesFound}
								disabled={disabled}
								onChange={(_event, value) => {
									if (value) setSelectedCompanyId(Number(value.value));
								}}
								startIcon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
							/>
						)
					: undefined
			}
		/>
	);
};

export default DevisFormPage;
