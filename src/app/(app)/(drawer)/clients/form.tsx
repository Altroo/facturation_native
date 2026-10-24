import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import {
	useGetClientQuery,
	useGetCodeClientQuery,
	useAddClientMutation,
	useEditClientMutation,
} from '@/store/services/client';
import {
	useGetCitiesListQuery,
	useAddCityMutation,
	useEditCityMutation,
	useDeleteCityMutation,
} from '@/store/services/parameter';
import type { ClientClass } from '@/models/classes';
import type { ClientSchemaType, TypeClientType } from '@/types/clientTypes';
import type { CompaniesUserCompaniesType } from '@/types/companyTypes';
import { useLanguage, useToast } from '@/utils/hooks';
import { clientSchema } from '@/utils/formValidationSchemas';
import { extractApiErrorMessage, isNectarRaisonSociale, parseEntityId, setFormikAutoErrors } from '@/utils/helpers';
import { pmRequired, ppRequired } from '@/utils/rawData';
import { CLIENTS_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import EntityCrudControls from '@/components/shared/entityCrudControls/entityCrudControls';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = {
	id?: number;
	company: CompaniesUserCompaniesType;
	rawData?: ClientClass;
	companySelect?: (disabled: boolean) => ReactNode;
	initialCode: string;
	codeQuery: ReturnType<typeof useGetCodeClientQuery>;
};

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEditMode = props.id !== undefined;
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const pending = useRef(false);
	const resettingCode = useRef(false);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const [isResettingCode, setIsResettingCode] = useState(false);
	const [addClient, addMutation] = useAddClientMutation();
	const [editClient, editMutation] = useEditClientMutation();
	const citiesQuery = useGetCitiesListQuery({ company_id: props.company.id }, { skip: !token });
	const [addCity, addCityMutation] = useAddCityMutation();
	const [editCity, editCityMutation] = useEditCityMutation();
	const [deleteCity, deleteCityMutation] = useDeleteCityMutation();

	const cityLoading = addCityMutation.isLoading || editCityMutation.isLoading || deleteCityMutation.isLoading;
	// The parent waits for initial data before mounting us. Keeping these initial
	// values stable prevents a code/city refetch from erasing the user's edits.
	const [initialValues] = useState<ClientSchemaType>(() => ({
		client_type: (props.rawData?.client_type as TypeClientType) ?? 'PM',
		company: props.company.id,
		code_client: props.initialCode,
		raison_sociale: props.rawData?.raison_sociale ?? '',
		nom: props.rawData?.nom ?? '',
		prenom: props.rawData?.prenom ?? '',
		adresse: props.rawData?.adresse ?? '',
		ville: props.rawData?.ville ?? null,
		tel: props.rawData?.tel ?? '',
		email: props.rawData?.email ?? '',
		delai_de_paiement: props.rawData?.delai_de_paiement ?? 60,
		remarque: props.rawData?.remarque ?? '',
		numero_du_compte: props.rawData?.numero_du_compte ?? '',
		ICE: props.rawData?.ICE ?? '',
		registre_de_commerce: props.rawData?.registre_de_commerce ?? '',
		identifiant_fiscal: props.rawData?.identifiant_fiscal ?? '',
		taxe_professionnelle: props.rawData?.taxe_professionnelle ?? '',
		CNSS: props.rawData?.CNSS ?? '',
		globalError: '',
	}));
	const formik = useFormik<ClientSchemaType>({
		initialValues,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(clientSchema),
		onSubmit: async (data, { setFieldError }) => {
			if (pending.current) return;
			pending.current = true;
			const payload = { ...data };
			delete payload.globalError;
			// Clear fields hidden by the client type, as on the web. The phone
			// remains visible for every type, so preserve its entered value.
			if (data.client_type === 'PP') {
				payload.raison_sociale = null;
				payload.ICE = null;
				payload.registre_de_commerce = null;
			} else {
				payload.nom = null;
				payload.prenom = null;
			}
			try {
				if (props.id !== undefined) {
					await editClient({ id: props.id, data: payload }).unwrap();
					onSuccess(t.clients.updateSuccess);
				} else {
					await addClient({ data: payload }).unwrap();
					onSuccess(t.clients.addSuccess);
					router.dismissTo(CLIENTS_LIST);
				}
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
				onError(isEditMode ? t.clients.updateError : t.clients.addError);
			} finally {
				pending.current = false;
			}
		},
	});
	const disabled = formik.isSubmitting || addMutation.isLoading || editMutation.isLoading;
	const isPP = formik.values.client_type === 'PP';
	const requiredFields: readonly string[] = formik.values.client_type === 'PM' ? pmRequired : isPP ? ppRequired : [];
	const cityItems = (citiesQuery.currentData ?? []).map((city) => ({ code: city.nom, value: String(city.id) }));
	const selectedCity = cityItems.find((city) => city.value === String(formik.values.ville)) ?? null;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const typeLabels = {
		PM: t.clients.typePersonneMorale,
		PP: t.clients.typePersonnePhysique,
		CD: t.clients.typeClientDivers,
	};
	const fieldLabels: Record<string, string> = {
		client_type: t.clients.typeSection,
		code_client: t.clients.fieldCodeClient,
		raison_sociale: t.clients.fieldRaisonSociale,
		nom: t.clients.fieldNom,
		prenom: t.clients.fieldPrenom,
		adresse: t.clients.fieldAdresse,
		email: t.clients.fieldEmail,
		tel: t.clients.fieldTelephone,
		numero_du_compte: t.clients.fieldNumeroCompte,
		ICE: t.clients.fieldICE,
		registre_de_commerce: t.clients.fieldRegistreCommerce,
		identifiant_fiscal: t.clients.fieldIdentifiantFiscal,
		taxe_professionnelle: t.clients.fieldTaxeProfessionnelle,
		CNSS: t.clients.fieldCNSS,
		ville: t.clients.fieldVille,
		delai_de_paiement: t.clients.fieldDelaiPaiement,
		remarque: t.clients.fieldRemarque,
	};
	// All text fields keep Formik's web contract; native inputs provide text
	// directly instead of a DOM change event.
	const textFieldProps = (name: keyof ClientSchemaType, iconName: ComponentProps<typeof MaterialIcons>['name']) => ({
		nativeID: name,
		label: fieldLabels[name],
		placeholder: fieldLabels[name],
		value: String(formik.values[name] ?? ''),
		required: name === 'code_client' || requiredFields.includes(name),
		onChangeText: (value: string) => void formik.setFieldValue(name, value),
		onBlur: formik.handleBlur(name),
		error: !!formik.errors[name] && (!!formik.touched[name] || hasAttemptedSubmit),
		helperText: formik.touched[name] || hasAttemptedSubmit ? formik.errors[name] : undefined,
		disabled,
		startIcon: icon(iconName),
	});
	const validationMessage = [
		formik.errors.globalError,
		...(hasAttemptedSubmit
			? Object.entries(formik.errors)
					.filter(([key]) => key !== 'globalError')
					.map(([key, message]) => `${fieldLabels[key] ?? key} : ${message}`)
			: []),
	]
		.filter(Boolean)
		.join('\n');
	const resetCode = async () => {
		if (disabled || resettingCode.current) return;
		resettingCode.current = true;
		setIsResettingCode(true);
		try {
			const result = await props.codeQuery.refetch().unwrap();
			if (result.code_client) await formik.setFieldValue('code_client', result.code_client);
			else onError(t.common.genericError);
		} catch (e) {
			onError(extractApiErrorMessage(e, t.common.genericError));
		} finally {
			resettingCode.current = false;
			setIsResettingCode(false);
		}
	};

	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 }}
			>
				{props.companySelect?.(disabled)}
				{!!validationMessage && <ApiAlert variant="banner" errorDetails={validationMessage} />}
				<SectionCard title={t.clients.typeSection} icon="person-outline">
					<CustomDropDownSelect
						label={t.clients.typeSection}
						required
						items={isNectarRaisonSociale(props.company.raison_sociale) ? ['PM', 'PP', 'CD'] : ['PM', 'PP']}
						value={formik.values.client_type}
						getOptionLabel={(value) => typeLabels[value as TypeClientType] ?? value}
						onChange={(value) => {
							void formik.setFieldValue('client_type', value);
							formik.setErrors({});
						}}
						disabled={disabled}
						startIcon={icon('category')}
					/>
					<CustomTextInput
						{...textFieldProps('code_client', 'tag')}
						autoCapitalize="characters"
						endIcon={
							!isEditMode ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={t.clients.resetCode}
									accessibilityState={{ disabled: disabled || isResettingCode }}
									disabled={disabled || isResettingCode}
									onPress={() => void resetCode()}
									className="h-12 w-12 items-center justify-center"
								>
									<MaterialIcons name="refresh" size={22} color={colors.brand} />
								</Pressable>
							) : undefined
						}
					/>
					{!isEditMode && props.codeQuery.isError && (
						<QueryError
							variant="banner"
							error={props.codeQuery.error}
							loading={isResettingCode}
							disabled={disabled}
							onRetry={() => void resetCode()}
						/>
					)}
				</SectionCard>
				<SectionCard title={t.clients.identitySection} icon="badge">
					{isPP ? (
						<>
							<CustomTextInput {...textFieldProps('nom', 'person-outline')} autoCapitalize="words" />
							<CustomTextInput {...textFieldProps('prenom', 'person-outline')} autoCapitalize="words" />
						</>
					) : (
						<>
							<CustomTextInput {...textFieldProps('raison_sociale', 'business')} />
							<CustomTextInput
								{...textFieldProps('email', 'email')}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
							/>
							<CustomTextInput {...textFieldProps('ICE', 'badge')} />
							<CustomTextInput {...textFieldProps('registre_de_commerce', 'description')} />
						</>
					)}
					<CustomTextInput {...textFieldProps('adresse', 'place')} multiline numberOfLines={2} />
				</SectionCard>
				<SectionCard title={t.clients.contactSection} icon="phone">
					<CustomTextInput {...textFieldProps('tel', 'phone')} keyboardType="phone-pad" />
				</SectionCard>
				<SectionCard title={t.clients.adminSection} icon="description">
					<CustomTextInput {...textFieldProps('numero_du_compte', 'account-balance')} />
					<CustomTextInput {...textFieldProps('identifiant_fiscal', 'description')} />
					<CustomTextInput {...textFieldProps('taxe_professionnelle', 'receipt-long')} />
					<CustomTextInput {...textFieldProps('CNSS', 'badge')} />
				</SectionCard>
				<SectionCard title={t.clients.villeSection} icon="location-city">
					{citiesQuery.isError && (
						<QueryError
							variant="banner"
							error={citiesQuery.error}
							loading={citiesQuery.isFetching}
							disabled={disabled}
							onRetry={() => void citiesQuery.refetch()}
						/>
					)}
					<CustomAutoCompleteSelect
						id="ville"
						label={t.clients.fieldVille}
						required={requiredFields.includes('ville')}
						items={cityItems}
						value={selectedCity}
						noOptionsText={t.clients.noVille}
						onChange={(_event, value) => void formik.setFieldValue('ville', value ? Number(value.value) : null)}
						// Selection already validates the new value. A blur immediately
						// afterward must not validate Formik's previous city again.
						onBlur={() => void formik.setFieldTouched('ville', true, false)}
						disabled={disabled || cityLoading || citiesQuery.isLoading}
						startIcon={icon('location-city')}
						error={!!formik.errors.ville && (!!formik.touched.ville || hasAttemptedSubmit)}
						helperText={formik.touched.ville || hasAttemptedSubmit ? formik.errors.ville : undefined}
						labelActions={
							<EntityCrudControls
								label={t.clients.fieldVille}
								icon={icon('location-city')}
								selectedItem={selectedCity}
								disabled={disabled || cityLoading}
								addEntity={({ data }) => addCity({ data: { ...data, company: props.company.id } })}
								editEntity={({ id, data }) => editCity({ id, data: { ...data, company: props.company.id } })}
								deleteEntity={deleteCity}
								onAddSuccess={(id) => void formik.setFieldValue('ville', id)}
								onDeleteSuccess={() => void formik.setFieldValue('ville', null)}
							/>
						}
					/>
					<CustomNumberInput
						{...textFieldProps('delai_de_paiement', 'schedule')}
						keyboardType="number-pad"
						onChangeText={(value) => {
							if (/^\d*$/.test(value))
								void formik.setFieldValue('delai_de_paiement', value === '' ? null : Number(value));
						}}
					/>
				</SectionCard>
				<RemarkSection {...textFieldProps('remarque', 'notes')} title={t.clients.remarkSection} />
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					active={!disabled && !cityLoading && !isResettingCode}
					loading={disabled}
					onClick={() => {
						setHasAttemptedSubmit(true);
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

const ClientsFormPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompanyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const invalidParams = id === null || requestedCompanyId === null;
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalidParams });
	const clientQuery = useGetClientQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalidParams || id === undefined, refetchOnMountOrArgChange: true },
	);
	const companies = companiesQuery.currentData ?? [];
	const eligibleCompanies = companies.filter((company) => company.role === 'Caissier' || company.role === 'Commercial');
	// Editing derives the company from the fetched client. A route parameter must
	// never move an existing client to a different company or bypass its role.
	const companyId =
		id !== undefined
			? clientQuery.currentData?.company
			: (requestedCompanyId ?? selectedCompanyId ?? eligibleCompanies[0]?.id);
	const company = eligibleCompanies.find((entry) => entry.id === companyId);
	const codeQuery = useGetCodeClientQuery(
		{ company_id: company?.id ?? 0 },
		{ skip: !token || !company || invalidParams || id !== undefined, refetchOnMountOrArgChange: true },
	);

	if (invalidParams)
		return (
			<View className="p-5">
				<ApiAlert errorDetails={t.notFound.message} />
			</View>
		);
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return (
			<View className="p-5">
				<QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />
			</View>
		);
	if (id !== undefined && !clientQuery.currentData)
		return clientQuery.isError ? (
			<View className="p-5">
				<QueryError error={clientQuery.error} onRetry={() => void clientQuery.refetch()} />
			</View>
		) : (
			<ApiProgress />
		);
	if (!company || (requestedCompanyId !== undefined && requestedCompanyId !== company.id)) return <NoPermission />;
	// isLoading covers the first request. isFetching also covers retries; hiding
	// the form during a retry would unmount Formik and discard its draft values.
	if (id === undefined && (codeQuery.isLoading || codeQuery.isUninitialized)) return <ApiProgress />;

	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}`}
			id={id}
			company={company}
			rawData={clientQuery.currentData}
			initialCode={clientQuery.currentData?.code_client ?? codeQuery.currentData?.code_client ?? ''}
			codeQuery={codeQuery}
			companySelect={
				id === undefined && requestedCompanyId === undefined
					? (disabled) => (
							<CustomAutoCompleteSelect
								label={t.shared.selectCompany}
								items={eligibleCompanies.map((item) => ({ code: item.raison_sociale, value: String(item.id) }))}
								value={{ code: company.raison_sociale, value: String(company.id) }}
								noOptionsText={t.shared.noCompaniesFound}
								disabled={disabled}
								startIcon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
								onChange={(_event, value) => {
									if (value) setSelectedCompanyId(Number(value.value));
								}}
							/>
						)
					: undefined
			}
		/>
	);
};

export default ClientsFormPage;
