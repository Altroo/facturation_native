import { useRef, useState, type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFormik, type FormikErrors } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { FactureClass, ReglementClass } from '@/models/classes';
import type { ReglementSchemaType } from '@/types/reglementTypes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { useGetClientsListQuery } from '@/store/services/client';
import { useGetFactureClientForPaymentQuery, useGetFactureClientQuery } from '@/store/services/factureClient';
import { useAddReglementMutation, useEditReglementMutation, useGetReglementQuery } from '@/store/services/reglement';
import {
	useGetModePaiementListQuery,
	useAddModePaiementMutation,
	useEditModePaiementMutation,
	useDeleteModePaiementMutation,
} from '@/store/services/parameter';
import { reglementSchema } from '@/utils/formValidationSchemas';
import {
	extractApiErrorMessage,
	formatLocalDate,
	formatNumberWithSpaces,
	parseEntityId,
	parseNumber,
	setFormikAutoErrors,
} from '@/utils/helpers';
import { FACTURE_CLIENT_ADD, FACTURE_CLIENT_VIEW } from '@/utils/routes';
import { colors, listSpacing } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import EntityCrudControls from '@/components/shared/entityCrudControls/entityCrudControls';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ReglementFinancialSummary from '@/components/shared/reglements/reglementFinancialSummary';

type Props = { company_id: number; invoice?: FactureClass; rawData?: ReglementClass };

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEdit = !!props.rawData;
	const pending = useRef(false);
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const [attempted, setAttempted] = useState(false);
	const [selectedClientId, setSelectedClientId] = useState<number | null>(
		props.rawData?.client ?? props.invoice?.client ?? null,
	);
	const facturesQuery = useGetFactureClientForPaymentQuery(
		{ company_id: props.company_id, client_id: selectedClientId ?? undefined },
		{ skip: !token || isEdit, refetchOnMountOrArgChange: true },
	);
	const clientsQuery = useGetClientsListQuery(
		{ company_id: props.company_id, with_pagination: false },
		{ skip: !token },
	);
	const modesQuery = useGetModePaiementListQuery({ company_id: props.company_id }, { skip: !token });
	const [addReglement, adding] = useAddReglementMutation();
	const [editReglement, editing] = useEditReglementMutation();
	const [addMode, addingMode] = useAddModePaiementMutation();
	const [editMode, editingMode] = useEditModePaiementMutation();
	const [deleteMode, deletingMode] = useDeleteModePaiementMutation();
	const parameterLoading = addingMode.isLoading || editingMode.isLoading || deletingMode.isLoading;
	// A fully paid invoice is absent from for_payment. Editing keeps its invoice
	// fixed and adds this payment back to the balance, as the backend validator does.
	const factures = props.rawData
		? [
				{
					id: props.rawData.facture_client,
					numero_facture: props.rawData.facture_client_numero,
					client_name: props.rawData.client_name,
					devise: props.rawData.devise,
					remaining_amount:
						Math.round(
							(Number(props.rawData.reste_a_payer ?? 0) +
								(props.rawData.statut === 'Valide' ? Number(props.rawData.montant) : 0)) *
								100,
						) / 100,
				},
			]
		: (facturesQuery.currentData ?? []);
	const formik = useFormik<ReglementSchemaType>({
		initialValues: {
			facture_client: props.rawData?.facture_client ?? props.invoice?.id ?? 0,
			mode_reglement: props.rawData?.mode_reglement ?? null,
			libelle: props.rawData?.libelle ?? '',
			observations: props.rawData?.observations ?? '',
			montant: props.rawData?.montant ?? '',
			date_reglement: props.rawData?.date_reglement ?? formatLocalDate(new Date()),
			globalError: '',
		},
		validationSchema: toFormikValidationSchema<unknown>(reglementSchema),
		validateOnMount: true,
		validate: (values) => {
			const errors: FormikErrors<ReglementSchemaType> = {};
			const invoice = factures.find((item) => item.id === values.facture_client);
			if (values.facture_client && !invoice) errors.facture_client = t.reglements.noFacture;
			if (invoice && (parseNumber(values.montant) ?? 0) > Number(invoice.remaining_amount))
				errors.montant = t.reglements.maxLabel(
					`${formatNumberWithSpaces(invoice.remaining_amount, 2)} ${invoice.devise}`,
				);
			return errors;
		},
		onSubmit: async (data, { setFieldError }) => {
			if (pending.current || (!isEdit && (facturesQuery.isFetching || facturesQuery.isError)) || parameterLoading)
				return;
			// The server supplies eligible invoices and their remaining balance. Do not
			// trust a route parameter or a balance copied from the previous screen.
			const invoice = factures.find((item) => item.id === data.facture_client);
			if (!invoice) return;
			pending.current = true;
			try {
				const payload = {
					facture_client: data.facture_client,
					mode_reglement: data.mode_reglement,
					libelle: data.libelle?.trim() ?? '',
					observations: data.observations?.trim() ?? '',
					montant: parseNumber(data.montant) ?? 0,
					date_reglement: data.date_reglement,
				};
				if (props.rawData) {
					await editReglement({ id: props.rawData.id, data: payload }).unwrap();
					onSuccess(t.reglements.updateSuccess);
					return;
				}
				await addReglement({ data: payload }).unwrap();
				onSuccess(t.reglements.addSuccess);
				// Return to the actual edit/detail activity. The mutation refreshes its
				// payment history and invoice balance through RTK Query invalidation.
				if (router.canGoBack()) router.back();
				else {
					const route = FACTURE_CLIENT_VIEW(data.facture_client);
					router.replace({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
				}
			} catch (error) {
				setFormikAutoErrors({ e: error, setFieldError });
				onError(extractApiErrorMessage(error, isEdit ? t.reglements.updateError : t.reglements.addError));
			} finally {
				pending.current = false;
			}
		},
	});
	const disabled = adding.isLoading || editing.isLoading || formik.isSubmitting;
	const selectedInvoice = factures.find((item) => item.id === formik.values.facture_client);
	const clients = Array.isArray(clientsQuery.currentData) ? clientsQuery.currentData : [];
	const clientItems = clients.map((client) => ({
		code:
			client.raison_sociale ||
			[client.nom, client.prenom].filter(Boolean).join(' ') ||
			client.code_client ||
			t.common.noData,
		value: String(client.id),
	}));
	if (props.rawData && !clientItems.some((item) => item.value === String(props.rawData!.client)))
		clientItems.unshift({ code: props.rawData.client_name || t.common.noData, value: String(props.rawData.client) });
	const invoiceItems = factures.map((invoice) => ({
		code: `${invoice.numero_facture} · ${invoice.client_name}`,
		value: String(invoice.id),
	}));
	const modeItems = (modesQuery.currentData ?? []).map((mode) => ({ code: mode.nom, value: String(mode.id) }));
	const selectedMode = modeItems.find((mode) => mode.value === String(formik.values.mode_reglement)) ?? null;
	const fieldError = (name: keyof ReglementSchemaType) =>
		attempted || formik.touched[name] ? formik.errors[name] : undefined;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const field = (name: 'libelle' | 'observations' | 'montant', label: string) => ({
		nativeID: name,
		label,
		placeholder: label,
		value: String(formik.values[name] ?? ''),
		onChangeText: (value: string) => void formik.setFieldValue(name, value),
		onBlur: formik.handleBlur(name),
		error: !!fieldError(name),
		helperText: fieldError(name),
		disabled,
	});
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				className="flex-1"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: listSpacing, gap: listSpacing }}
			>
				{formik.errors.globalError && <ApiAlert variant="banner" errorDetails={formik.errors.globalError} />}
				{props.rawData && <ReglementFinancialSummary payment={props.rawData} />}
				<SectionCard title={t.reglements.labelFactureClient} icon="receipt-long">
					<CustomAutoCompleteSelect
						label={t.reglements.labelClient}
						items={clientItems}
						value={clientItems.find((client) => client.value === String(selectedClientId)) ?? null}
						noOptionsText={t.documentForm.noClientFound}
						disabled={disabled || isEdit || clientsQuery.isFetching}
						startIcon={icon('person-outline')}
						onChange={(_event, value) => {
							setSelectedClientId(value ? Number(value.value) : null);
							void formik.setFieldValue('facture_client', 0);
							void formik.setFieldValue('montant', '');
						}}
					/>
					{clientsQuery.isError && (
						<QueryError variant="banner" error={clientsQuery.error} onRetry={() => void clientsQuery.refetch()} />
					)}
					<CustomAutoCompleteSelect
						label={t.reglements.fieldFactureClient}
						items={invoiceItems}
						value={invoiceItems.find((invoice) => invoice.value === String(formik.values.facture_client)) ?? null}
						noOptionsText={t.reglements.noFacture}
						disabled={disabled || isEdit || facturesQuery.isFetching}
						startIcon={icon('receipt-long')}
						error={!!fieldError('facture_client')}
						helperText={fieldError('facture_client')}
						labelActions={
							!isEdit && (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={t.facturesClient.addTitle}
									disabled={disabled}
									onPress={() =>
										router.push({ pathname: FACTURE_CLIENT_ADD, params: { company_id: String(props.company_id) } })
									}
									className="min-h-11 justify-center px-2"
								>
									<Text className="font-poppins-medium text-sm text-brand dark:text-blue-300">{t.common.add}</Text>
								</Pressable>
							)
						}
						onChange={(_event, value) => {
							void formik.setFieldValue('facture_client', value ? Number(value.value) : 0);
							void formik.setFieldValue('montant', '');
						}}
					/>
					{!isEdit && facturesQuery.isError && (
						<QueryError variant="banner" error={facturesQuery.error} onRetry={() => void facturesQuery.refetch()} />
					)}
				</SectionCard>
				<SectionCard title={t.reglements.detailsReglement} icon="payments">
					<CustomAutoCompleteSelect
						label={t.reglements.fieldModeReglement}
						items={modeItems}
						value={selectedMode}
						noOptionsText={t.reglements.noModeReglement}
						disabled={disabled || parameterLoading || modesQuery.isFetching}
						startIcon={icon('payments')}
						error={!!fieldError('mode_reglement')}
						helperText={fieldError('mode_reglement')}
						onChange={(_event, value) =>
							void formik.setFieldValue('mode_reglement', value ? Number(value.value) : null)
						}
						labelActions={
							<EntityCrudControls
								label={t.reglements.fieldModeReglement}
								icon={icon('payments')}
								selectedItem={selectedMode}
								disabled={disabled || parameterLoading}
								addEntity={({ data }) => addMode({ data: { ...data, company: props.company_id } })}
								editEntity={({ id, data }) => editMode({ id, data: { ...data, company: props.company_id } })}
								deleteEntity={deleteMode}
								onAddSuccess={(id) => void formik.setFieldValue('mode_reglement', id)}
								onDeleteSuccess={() => void formik.setFieldValue('mode_reglement', null)}
							/>
						}
					/>
					{modesQuery.isError && (
						<QueryError variant="banner" error={modesQuery.error} onRetry={() => void modesQuery.refetch()} />
					)}
					<CustomTextInput
						{...field('montant', `${t.reglements.colMontant} (${selectedInvoice?.devise ?? 'MAD'}) *`)}
						keyboardType="decimal-pad"
						startIcon={icon('attach-money')}
						disabled={disabled || !selectedInvoice || (!isEdit && facturesQuery.isFetching)}
						helperText={
							fieldError('montant') ??
							(selectedInvoice
								? t.reglements.maxLabel(
										`${formatNumberWithSpaces(selectedInvoice.remaining_amount, 2)} ${selectedInvoice.devise}`,
									)
								: t.reglements.helpSelectFacture)
						}
					/>
					<CustomTextInput {...field('libelle', t.reglements.fieldLibelle)} startIcon={icon('tag')} maxLength={255} />
					<CustomDateInput
						label={t.reglements.fieldDateReglement}
						value={formik.values.date_reglement}
						disabled={disabled}
						onChange={(value) => void formik.setFieldValue('date_reglement', value)}
					/>
					{fieldError('date_reglement') && <ApiAlert variant="banner" errorDetails={fieldError('date_reglement')} />}
				</SectionCard>
				<RemarkSection {...field('observations', t.reglements.fieldObservations)} maxLength={2000} />
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					active={!disabled && !parameterLoading && (isEdit || (!facturesQuery.isFetching && !facturesQuery.isError))}
					loading={disabled}
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
		</View>
	);
};

const ReglementFormPage = () => {
	const params = useLocalSearchParams<{
		id?: string | string[];
		company_id?: string | string[];
		facture_client_id?: string | string[];
	}>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const companyId = parseEntityId(params.company_id);
	const invoiceId = params.facture_client_id === undefined ? undefined : parseEntityId(params.facture_client_id);
	const invalid = id === null || companyId === null || invoiceId === null;
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const companiesQuery = useGetUserCompaniesQuery(undefined, {
		skip: !token || invalid,
		refetchOnMountOrArgChange: true,
	});
	const company = companiesQuery.currentData?.find((item) => item.id === companyId);
	const allowed = company?.role === 'Caissier' || company?.role === 'Commercial';
	const invoiceQuery = useGetFactureClientQuery(
		{ id: invoiceId ?? 0 },
		{
			skip: !token || invalid || !allowed || invoiceId === undefined || id !== undefined,
			refetchOnMountOrArgChange: true,
		},
	);
	const reglementQuery = useGetReglementQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalid || !allowed || id === undefined, refetchOnMountOrArgChange: true },
	);
	if (invalid) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError)
		return <QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />;
	if (!allowed || !company) return <NoPermission />;
	if (id !== undefined) {
		if (reglementQuery.isError)
			return <QueryError error={reglementQuery.error} onRetry={() => void reglementQuery.refetch()} />;
		if (!reglementQuery.currentData) return <ApiProgress />;
		if (reglementQuery.currentData.company !== company.id) return <NoPermission />;
	}
	if (id === undefined && invoiceId !== undefined) {
		if (invoiceQuery.isError)
			return <QueryError error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />;
		if (!invoiceQuery.currentData) return <ApiProgress />;
		if (invoiceQuery.currentData.company !== company.id) return <NoPermission />;
	}
	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}:${invoiceId ?? 'all'}`}
			company_id={company.id}
			invoice={invoiceQuery.currentData}
			rawData={id !== undefined ? reglementQuery.currentData : undefined}
		/>
	);
};

export default ReglementFormPage;
