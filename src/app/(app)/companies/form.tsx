import type { UserClass } from '@/models/classes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { runWithCleanup } from '@/utils/runWithCleanup';
import type { DropDownType } from '@/types/accountTypes';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import NoPermission from '@/components/shared/noPermission/noPermission';
import { ScrollView, View, KeyboardAvoidingView, Platform, Text, Switch, type ScrollViewInstance } from 'react-native';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type FC } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useGetCompanyQuery, useAddCompanyMutation, useEditCompanyMutation } from '@/store/services/company';
import { useGetUsersListQuery } from '@/store/services/account';
import { getProfilState, getGroupesState } from '@/store/selectors';
import { useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { normalizeApiError, setFormikAutoErrors, getLabelForKey } from '@/utils/helpers';
import { companySchema } from '@/utils/formValidationSchemas';
import { nbrEmployeItemsList, civiliteItemsList } from '@/utils/rawData';
import { COMPANIES_LIST, parseEntityId } from '@/utils/routes';
import type {
	ManagedByType,
	CompanyFormValuesType,
	CompaniesFormFormikContentProps as FormikContentProps,
} from '@/types/companyTypes';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import CustomSquareImageUploading from '@/components/formikElements/customSquareImageUploading/customSquareImageUploading';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ManagedByTableSection from '@/components/shared/addManagedByTable/addManagedByTable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const FormikContent: FC<FormikContentProps> = (props: FormikContentProps) => {
	const { id } = props;
	const token = useInitAccessToken();
	const { first_name, last_name } = useAppSelector(getProfilState);
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const scrollRef = useRef<ScrollViewInstance>(null);
	const isEditMode = id !== undefined;

	const {
		currentData: rawData,
		isLoading: isDataLoading,
		error: dataError,
		refetch: refetchData,
	} = useGetCompanyQuery({ id: id! }, { skip: !token || !isEditMode });

	const [addData, { isLoading: isAddLoading, error: addError }] = useAddCompanyMutation();
	const [updateData, { isLoading: isUpdateLoading, error: updateError }] = useEditCompanyMutation();
	const { data: rawUsersData, isLoading: isUsersLoading } = useGetUsersListQuery(
		{ with_pagination: false },
		{ skip: !token },
	);
	// enforce the type of the users data
	const usersData = rawUsersData as Array<Partial<UserClass>> | undefined;
	const error = isEditMode ? dataError || updateError : addError;
	const axiosError = error ? normalizeApiError(error) : undefined;
	const { id: userID } = useAppSelector(getProfilState);
	const groupes = useAppSelector(getGroupesState).filter((role): role is string => typeof role === 'string');
	const [isPending, setIsPending] = useState(false);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const computedManagedBy = (() => {
		let admins: Array<ManagedByType> = [];

		if (isEditMode && rawData?.admins && Array.isArray(rawData.admins)) {
			admins = rawData.admins;
		} else if (!isEditMode && groupes.length && userID) {
			admins = [
				{
					id: userID,
					first_name: first_name ?? 'Moi',
					last_name: last_name ?? '',
					role: 'Caissier',
					can_validate_factures: true,
					can_change_document_status: true,
				},
			];
		}

		// Return the correct type with first_name and last_name
		return admins.map((u) => ({
			pk: u.id,
			role: u.role,
			first_name: u.first_name,
			last_name: u.last_name,
			can_validate_factures: u.can_validate_factures ?? false,
			can_change_document_status: u.can_change_document_status ?? false,
		}));
	})();

	const [selectedUser, setSelectedUser] = useState<DropDownType | null>(null);
	const [selectedRole, setSelectedRole] = useState<string>('');
	const roleOptions = groupes.map((role) => ({ value: role, code: role }));
	const formik = useFormik<CompanyFormValuesType>({
		initialValues: {
			raison_sociale: rawData?.raison_sociale ?? '',
			email: rawData?.email ?? '',
			nbr_employe: rawData?.nbr_employe ?? '',
			civilite_responsable: rawData?.civilite_responsable ?? '',
			nom_responsable: rawData?.nom_responsable ?? '',
			gsm_responsable: rawData?.gsm_responsable ?? '',
			adresse: rawData?.adresse ?? '',
			telephone: rawData?.telephone ?? '',
			fax: rawData?.fax ?? '',
			site_web: rawData?.site_web ?? '',
			numero_du_compte: rawData?.numero_du_compte ?? '',
			ICE: rawData?.ICE ?? '',
			registre_de_commerce: rawData?.registre_de_commerce ?? '',
			identifiant_fiscal: rawData?.identifiant_fiscal ?? '',
			tax_professionnelle: rawData?.tax_professionnelle ?? '',
			CNSS: rawData?.CNSS ?? '',
			logo: rawData?.logo ?? '',
			logo_cropped: rawData?.logo_cropped ?? '',
			cachet: rawData?.cachet ?? '',
			cachet_cropped: rawData?.cachet_cropped ?? '',
			managed_by: computedManagedBy,
			uses_foreign_currency: rawData?.uses_foreign_currency ?? false,
			stock_management_enabled: rawData?.stock_management_enabled ?? false,
			inventory_management_enabled: rawData?.inventory_management_enabled ?? false,
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(companySchema),
		onSubmit: async (data, { setFieldError }) => {
			setHasAttemptedSubmit(true);
			setIsPending(true);
			const { globalError: _globalError, ...payload } = data;
			await runWithCleanup(
				async () => {
					try {
						if (isEditMode) {
							await updateData({ data: payload, id: id }).unwrap();
							onSuccess(t.companies.updateSuccess);
						} else {
							await addData({ data: payload }).unwrap();
							onSuccess(t.companies.addSuccess);
						}
						if (!isEditMode) {
							router.dismissTo(COMPANIES_LIST);
						}
					} catch (e) {
						if (isEditMode) {
							onError(t.companies.updateError);
						} else {
							onError(t.companies.addError);
						}
						setFormikAutoErrors({ e, setFieldError });
					}
				},
				() => {
					setIsPending(false);
				},
			);
		},
	});

	const adminUsers: Array<ManagedByType> = formik.values.managed_by.map((entry) => ({
		id: entry.pk,
		first_name: entry.first_name || '',
		last_name: entry.last_name || '',
		role: entry.role || '',
		can_validate_factures: entry.can_validate_factures ?? false,
		can_change_document_status: entry.can_change_document_status ?? false,
	}));

	const managedIds = formik.values.managed_by.map((entry) => entry.pk);
	const availableUsers: DropDownType[] = Array.isArray(usersData)
		? usersData
				.filter(
					(user): user is { id: number; first_name: string; last_name: string; role: string } =>
						typeof user.id === 'number',
				)
				.filter((user) => !managedIds.includes(user.id))
				.map((user) => ({
					value: user.id.toString(),
					code: `${user.first_name} ${user.last_name}`,
				}))
		: [];

	const handleAddCompany = () => {
		if (selectedUser && selectedRole) {
			const userId = parseInt(selectedUser.value);
			const userData = usersData?.find((u) => u.id === userId);
			if (userData?.id && userData.first_name && userData.last_name) {
				void formik.setFieldValue('managed_by', [
					...formik.values.managed_by,
					{
						pk: userData.id,
						role: selectedRole,
						first_name: userData.first_name,
						last_name: userData.last_name,
						can_validate_factures: false,
						can_change_document_status: false,
					},
				]);
				setSelectedUser(null);
				setSelectedRole('');
			}
		}
	};

	// Collect validation errors from Formik
	const fieldLabels = {
		raison_sociale: t.companies.fieldRaisonSociale,
		email: t.companies.fieldEmail,
		nbr_employe: t.companies.fieldNbrEmploye,
		civilite_responsable: t.companies.fieldCivilite,
		nom_responsable: t.companies.fieldNomResponsable,
		gsm_responsable: t.companies.fieldGsmResponsable,
		adresse: t.companies.fieldAdresse,
		site_web: t.companies.fieldSiteWeb,
		telephone: t.companies.fieldTelephone,
		fax: t.companies.fieldFax,
		numero_du_compte: t.companies.fieldNumeroCompte,
		ICE: t.companies.fieldICE,
		registre_de_commerce: t.companies.fieldRegistreCommerce,
		identifiant_fiscal: t.companies.fieldIdentifiantFiscal,
		tax_professionnelle: t.companies.fieldTaxeProfessionnelle,
		CNSS: t.companies.fieldCNSS,
		logo: t.companies.logoLabel,
		logo_cropped: t.companies.logoLabel,
		cachet: t.companies.stampLabel,
		cachet_cropped: t.companies.stampLabel,
		managed_by: t.companies.managersSection,
		uses_foreign_currency: t.companies.foreignCurrencyLabel,
		stock_management_enabled: t.companies.stockManagementLabel,
		inventory_management_enabled: t.companies.inventoryManagementLabel,
		globalError: t.common.genericError,
	} as Record<string, string>;

	const validationErrors = (() => {
		const errors: Record<string, string> = {};
		if (hasAttemptedSubmit) {
			Object.entries(formik.errors).forEach(([key, value]) => {
				if (key !== 'globalError' && typeof value === 'string') {
					errors[key] = value;
				}
			});
		}
		return errors;
	})();

	const hasValidationErrors = Object.keys(validationErrors).length > 0;

	const isLoading = isUsersLoading || isAddLoading || isUpdateLoading || isPending || (isEditMode && isDataLoading);
	const shouldShowError = (axiosError?.status_code ?? 0) > 400 && !isLoading;

	const validationMessage = [
		formik.errors.globalError,
		...Object.entries(validationErrors).map(([key, error]) => `${getLabelForKey(fieldLabels, key)} : ${error}`),
	]
		.filter(Boolean)
		.join('\n');
	if (isLoading) return <ApiProgress />;
	if (isEditMode && !rawData)
		return dataError ? (
			<View className="gap-3 p-5">
				<ApiAlert errorDetails={axiosError?.details} />
				<PrimaryLoadingButton
					buttonText={t.common.retry}
					onClick={() => void refetchData()}
					active
					loading={false}
					inverted
				/>
			</View>
		) : (
			<ApiProgress />
		);
	if (shouldShowError) return <ApiAlert errorDetails={axiosError?.details} />;

	return (
		<KeyboardAvoidingView
			style={{
				flex: 1,
			}}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			keyboardVerticalOffset={100}
		>
			<ScrollView
				ref={scrollRef}
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<>
					<View className="flex-row items-center gap-4 py-1">
						<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-panel">
							<MaterialIcons name={'business'} size={25} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{isEditMode ? t.companies.editTitle : t.companies.addTitle}
							</Text>
							{!!rawData?.raison_sociale && (
								<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{rawData?.raison_sociale}</Text>
							)}
						</View>
					</View>
					<>
						{formik.errors.globalError || hasValidationErrors ? (
							<View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
								<MaterialIcons name="error-outline" size={22} color="#dc2626" />
								<Text
									accessibilityRole="alert"
									className="font-sans flex-1 text-sm leading-6 text-red-700 dark:text-red-300"
								>
									{validationMessage || t.common.correctErrors}
								</Text>
							</View>
						) : null}
					</>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'image'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.logoSection}
								</Text>
							</View>
						</View>
						<>
							<CustomSquareImageUploading
								label={t.companies.logoLabel}
								image={formik.values.logo}
								croppedImage={formik.values.logo_cropped}
								error={formik.errors.logo || formik.errors.logo_cropped}
								onChange={(value) => void formik.setFieldValue('logo', value)}
								onCrop={(value) => void formik.setFieldValue('logo_cropped', value)}
								disabled={isPending}
							/>
							<CustomSquareImageUploading
								label={t.companies.stampLabel}
								image={formik.values.cachet}
								croppedImage={formik.values.cachet_cropped}
								error={formik.errors.cachet || formik.errors.cachet_cropped}
								onChange={(value) => void formik.setFieldValue('cachet', value)}
								onCrop={(value) => void formik.setFieldValue('cachet_cropped', value)}
								disabled={isPending}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'business'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.generalSection}
								</Text>
							</View>
						</View>
						<>
							<CustomTextInput
								id="raison_sociale"
								label={t.companies.fieldRaisonSociale + ' *'}
								placeholder={t.companies.fieldRaisonSociale}
								value={formik.values.raison_sociale}
								onChangeText={formik.handleChange('raison_sociale')}
								onBlur={formik.handleBlur('raison_sociale')}
								disabled={isPending}
								error={formik.touched.raison_sociale && Boolean(formik.errors.raison_sociale)}
								helperText={formik.touched.raison_sociale ? formik.errors.raison_sociale : ''}
								startIcon={
									<MaterialIcons
										name="business"
										size={20}
										color={formik.touched.raison_sociale && formik.errors.raison_sociale ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="email"
								label={t.companies.fieldEmail}
								placeholder={t.companies.fieldEmail}
								value={formik.values.email}
								onChangeText={formik.handleChange('email')}
								onBlur={formik.handleBlur('email')}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								disabled={isPending}
								error={formik.touched.email && Boolean(formik.errors.email)}
								helperText={formik.touched.email ? formik.errors.email : ''}
								startIcon={
									<MaterialIcons
										name="mail-outline"
										size={20}
										color={formik.touched.email && formik.errors.email ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomDropDownSelect
								id="nbr_employe"
								label={t.companies.fieldNbrEmploye + ' *'}
								value={formik.values.nbr_employe}
								items={nbrEmployeItemsList}
								onChange={(value) => void formik.setFieldValue('nbr_employe', value)}
								onBlur={formik.handleBlur('nbr_employe')}
								helperText={formik.touched.nbr_employe ? formik.errors.nbr_employe : undefined}
								disabled={isPending}
								error={Boolean(formik.touched.nbr_employe ? formik.errors.nbr_employe : undefined)}
								startIcon={<MaterialIcons name="groups" size={20} color={'#94a3b8'} />}
							/>
							<CustomTextInput
								id="adresse"
								label={t.companies.fieldAdresse}
								placeholder={t.companies.fieldAdresse}
								value={formik.values.adresse}
								onChangeText={formik.handleChange('adresse')}
								onBlur={formik.handleBlur('adresse')}
								multiline
								disabled={isPending}
								error={formik.touched.adresse && Boolean(formik.errors.adresse)}
								helperText={formik.touched.adresse ? formik.errors.adresse : ''}
								startIcon={
									<MaterialIcons
										name="location-on"
										size={20}
										color={formik.touched.adresse && formik.errors.adresse ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="site_web"
								label={t.companies.fieldSiteWeb}
								placeholder={t.companies.fieldSiteWeb}
								value={formik.values.site_web}
								onChangeText={formik.handleChange('site_web')}
								onBlur={formik.handleBlur('site_web')}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="url"
								disabled={isPending}
								error={formik.touched.site_web && Boolean(formik.errors.site_web)}
								helperText={formik.touched.site_web ? formik.errors.site_web : ''}
								startIcon={
									<MaterialIcons
										name="language"
										size={20}
										color={formik.touched.site_web && formik.errors.site_web ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'person-outline'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.responsableSection}
								</Text>
							</View>
						</View>
						<>
							<CustomDropDownSelect
								id="civilite_responsable"
								label={t.companies.fieldCivilite}
								value={formik.values.civilite_responsable}
								items={civiliteItemsList}
								onChange={(value) => void formik.setFieldValue('civilite_responsable', value)}
								disabled={isPending}
								startIcon={<MaterialIcons name="person" size={20} color={'#94a3b8'} />}
							/>
							<CustomTextInput
								id="nom_responsable"
								label={t.companies.fieldNomResponsable}
								placeholder={t.companies.fieldNomResponsable}
								value={formik.values.nom_responsable}
								onChangeText={formik.handleChange('nom_responsable')}
								onBlur={formik.handleBlur('nom_responsable')}
								disabled={isPending}
								error={formik.touched.nom_responsable && Boolean(formik.errors.nom_responsable)}
								helperText={formik.touched.nom_responsable ? formik.errors.nom_responsable : ''}
								startIcon={
									<MaterialIcons
										name="person-outline"
										size={20}
										color={formik.touched.nom_responsable && formik.errors.nom_responsable ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="gsm_responsable"
								label={t.companies.fieldGsmResponsable}
								placeholder={t.companies.fieldGsmResponsable}
								value={formik.values.gsm_responsable}
								onChangeText={formik.handleChange('gsm_responsable')}
								onBlur={formik.handleBlur('gsm_responsable')}
								keyboardType="phone-pad"
								disabled={isPending}
								error={formik.touched.gsm_responsable && Boolean(formik.errors.gsm_responsable)}
								helperText={formik.touched.gsm_responsable ? formik.errors.gsm_responsable : ''}
								startIcon={
									<MaterialIcons
										name="smartphone"
										size={20}
										color={formik.touched.gsm_responsable && formik.errors.gsm_responsable ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'contacts'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.contactSection}
								</Text>
							</View>
						</View>
						<>
							<CustomTextInput
								id="telephone"
								label={t.companies.fieldTelephone}
								placeholder={t.companies.fieldTelephone}
								value={formik.values.telephone}
								onChangeText={formik.handleChange('telephone')}
								onBlur={formik.handleBlur('telephone')}
								keyboardType="phone-pad"
								disabled={isPending}
								error={formik.touched.telephone && Boolean(formik.errors.telephone)}
								helperText={formik.touched.telephone ? formik.errors.telephone : ''}
								startIcon={
									<MaterialIcons
										name="phone"
										size={20}
										color={formik.touched.telephone && formik.errors.telephone ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="fax"
								label={t.companies.fieldFax}
								placeholder={t.companies.fieldFax}
								value={formik.values.fax}
								onChangeText={formik.handleChange('fax')}
								onBlur={formik.handleBlur('fax')}
								keyboardType="phone-pad"
								disabled={isPending}
								error={formik.touched.fax && Boolean(formik.errors.fax)}
								helperText={formik.touched.fax ? formik.errors.fax : ''}
								startIcon={
									<MaterialIcons
										name="print"
										size={20}
										color={formik.touched.fax && formik.errors.fax ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'account-balance'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.adminSection}
								</Text>
							</View>
						</View>
						<>
							<CustomTextInput
								id="numero_du_compte"
								label={t.companies.fieldNumeroCompte}
								placeholder={t.companies.fieldNumeroCompte}
								value={formik.values.numero_du_compte}
								onChangeText={formik.handleChange('numero_du_compte')}
								onBlur={formik.handleBlur('numero_du_compte')}
								disabled={isPending}
								error={formik.touched.numero_du_compte && Boolean(formik.errors.numero_du_compte)}
								helperText={formik.touched.numero_du_compte ? formik.errors.numero_du_compte : ''}
								startIcon={
									<MaterialIcons
										name="credit-card"
										size={20}
										color={formik.touched.numero_du_compte && formik.errors.numero_du_compte ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="ICE"
								label={t.companies.fieldICE + ' *'}
								placeholder={t.companies.fieldICE}
								value={formik.values.ICE}
								onChangeText={formik.handleChange('ICE')}
								onBlur={formik.handleBlur('ICE')}
								disabled={isPending}
								error={formik.touched.ICE && Boolean(formik.errors.ICE)}
								helperText={formik.touched.ICE ? formik.errors.ICE : ''}
								startIcon={
									<MaterialIcons
										name="fingerprint"
										size={20}
										color={formik.touched.ICE && formik.errors.ICE ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="registre_de_commerce"
								label={t.companies.fieldRegistreCommerce}
								placeholder={t.companies.fieldRegistreCommerce}
								value={formik.values.registre_de_commerce}
								onChangeText={formik.handleChange('registre_de_commerce')}
								onBlur={formik.handleBlur('registre_de_commerce')}
								disabled={isPending}
								error={formik.touched.registre_de_commerce && Boolean(formik.errors.registre_de_commerce)}
								helperText={formik.touched.registre_de_commerce ? formik.errors.registre_de_commerce : ''}
								startIcon={
									<MaterialIcons
										name="description"
										size={20}
										color={
											formik.touched.registre_de_commerce && formik.errors.registre_de_commerce ? '#dc2626' : '#94a3b8'
										}
									/>
								}
							/>
							<CustomTextInput
								id="identifiant_fiscal"
								label={t.companies.fieldIdentifiantFiscal}
								placeholder={t.companies.fieldIdentifiantFiscal}
								value={formik.values.identifiant_fiscal}
								onChangeText={formik.handleChange('identifiant_fiscal')}
								onBlur={formik.handleBlur('identifiant_fiscal')}
								disabled={isPending}
								error={formik.touched.identifiant_fiscal && Boolean(formik.errors.identifiant_fiscal)}
								helperText={formik.touched.identifiant_fiscal ? formik.errors.identifiant_fiscal : ''}
								startIcon={
									<MaterialIcons
										name="badge"
										size={20}
										color={
											formik.touched.identifiant_fiscal && formik.errors.identifiant_fiscal ? '#dc2626' : '#94a3b8'
										}
									/>
								}
							/>
							<CustomTextInput
								id="tax_professionnelle"
								label={t.companies.fieldTaxeProfessionnelle}
								placeholder={t.companies.fieldTaxeProfessionnelle}
								value={formik.values.tax_professionnelle}
								onChangeText={formik.handleChange('tax_professionnelle')}
								onBlur={formik.handleBlur('tax_professionnelle')}
								disabled={isPending}
								error={formik.touched.tax_professionnelle && Boolean(formik.errors.tax_professionnelle)}
								helperText={formik.touched.tax_professionnelle ? formik.errors.tax_professionnelle : ''}
								startIcon={
									<MaterialIcons
										name="receipt-long"
										size={20}
										color={
											formik.touched.tax_professionnelle && formik.errors.tax_professionnelle ? '#dc2626' : '#94a3b8'
										}
									/>
								}
							/>
							<CustomTextInput
								id="CNSS"
								label={t.companies.fieldCNSS}
								placeholder={t.companies.fieldCNSS}
								value={formik.values.CNSS}
								onChangeText={formik.handleChange('CNSS')}
								onBlur={formik.handleBlur('CNSS')}
								disabled={isPending}
								error={formik.touched.CNSS && Boolean(formik.errors.CNSS)}
								helperText={formik.touched.CNSS ? formik.errors.CNSS : ''}
								startIcon={
									<MaterialIcons
										name="verified-user"
										size={20}
										color={formik.touched.CNSS && formik.errors.CNSS ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'settings'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.companies.settingsSection}
								</Text>
							</View>
						</View>
						<>
							<View className={'flex-row items-center gap-3 py-2 ' + (isPending ? 'opacity-60' : '')}>
								<View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
									<MaterialIcons name={'currency-exchange'} size={21} color="#64748b" />
								</View>
								<View className="flex-1 gap-1">
									<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
										{t.companies.foreignCurrencyLabel}
									</Text>
									{!!t.companies.foreignCurrencyHelper && (
										<Text className="font-sans text-xs leading-5 text-slate-500 dark:text-slate-400">
											{t.companies.foreignCurrencyHelper}
										</Text>
									)}
								</View>
								<Switch
									accessibilityLabel={t.companies.foreignCurrencyLabel}
									value={formik.values.uses_foreign_currency}
									onValueChange={(value) => void formik.setFieldValue('uses_foreign_currency', value)}
									disabled={isPending}
									trackColor={{
										false: '#cbd5e1',
										true: '#0274d7',
									}}
									thumbColor="#fff"
								/>
							</View>
							<View
								className={
									'flex-row items-center gap-3 py-2 ' +
									(!!rawData?.stock_management_enabled || isPending ? 'opacity-60' : '')
								}
							>
								<View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
									<MaterialIcons name={'inventory-2'} size={21} color="#64748b" />
								</View>
								<View className="flex-1 gap-1">
									<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
										{t.companies.stockManagementLabel}
									</Text>
									{!!t.companies.stockManagementHelper && (
										<Text className="font-sans text-xs leading-5 text-slate-500 dark:text-slate-400">
											{t.companies.stockManagementHelper}
										</Text>
									)}
								</View>
								<Switch
									accessibilityLabel={t.companies.stockManagementLabel}
									value={formik.values.stock_management_enabled}
									onValueChange={(value) => {
										void formik.setFieldValue('stock_management_enabled', value);
										if (!value) void formik.setFieldValue('inventory_management_enabled', false);
									}}
									disabled={!!rawData?.stock_management_enabled || isPending}
									trackColor={{
										false: '#cbd5e1',
										true: '#0274d7',
									}}
									thumbColor="#fff"
								/>
							</View>
							<View
								className={
									'flex-row items-center gap-3 py-2 ' +
									(!formik.values.stock_management_enabled || isPending ? 'opacity-60' : '')
								}
							>
								<View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
									<MaterialIcons name={'fact-check'} size={21} color="#64748b" />
								</View>
								<View className="flex-1 gap-1">
									<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
										{t.companies.inventoryManagementLabel}
									</Text>
									{!!t.companies.inventoryManagementHelper && (
										<Text className="font-sans text-xs leading-5 text-slate-500 dark:text-slate-400">
											{t.companies.inventoryManagementHelper}
										</Text>
									)}
								</View>
								<Switch
									accessibilityLabel={t.companies.inventoryManagementLabel}
									value={formik.values.inventory_management_enabled}
									onValueChange={(value) => void formik.setFieldValue('inventory_management_enabled', value)}
									disabled={!formik.values.stock_management_enabled || isPending}
									trackColor={{
										false: '#cbd5e1',
										true: '#0274d7',
									}}
									thumbColor="#fff"
								/>
							</View>
						</>
					</View>

					<ManagedByTableSection
						title={t.companies.managersSection}
						icon={<MaterialIcons name="manage-accounts" size={21} color="#0274d7" />}
						emptyIcon={<MaterialIcons name="group" size={36} color="#94a3b8" />}
						emptyMessage={t.companies.noManager}
						headers={['Utilisateur', 'Rôle']}
						isUserTable
						currentUserId={userID}
						data={adminUsers}
						roleOptions={roleOptions}
						disabled={isPending}
						onRoleChange={(index, role) => void formik.setFieldValue(`managed_by.${index}.role`, role)}
						onInvoiceValidationChange={(index, value) =>
							void formik.setFieldValue(`managed_by.${index}.can_validate_factures`, value)
						}
						onDocumentStatusChangePermissionChange={(index, value) =>
							void formik.setFieldValue(`managed_by.${index}.can_change_document_status`, value)
						}
						onDelete={(index) =>
							void formik.setFieldValue(
								'managed_by',
								formik.values.managed_by.filter((_, i) => i !== index),
							)
						}
						showInvoiceValidationPermission
						showDocumentStatusChangePermission
						addSectionProps={{
							title: t.shared.addUser,
							selectId: 'new_company_select',
							selectLabel: t.shared.selectUser,
							selectItems: availableUsers,
							selectValue: selectedUser,
							onSelectChange: (_event, newValue) => setSelectedUser(newValue),
							selectIcon: <MaterialIcons name="person-add" size={20} color="#94a3b8" />,
							roleId: 'new_company_role',
							roleLabel: t.shared.role,
							roleOptions,
							roleValue: selectedRole,
							onRoleChange: setSelectedRole,
							roleIcon: <MaterialIcons name="shield" size={20} color="#94a3b8" />,
							onAdd: handleAddCompany,
							isAddDisabled: !selectedUser || !selectedRole,
						}}
					/>
					<>
						{formik.errors.globalError || hasValidationErrors ? (
							<View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
								<MaterialIcons name="error-outline" size={22} color="#dc2626" />
								<Text
									accessibilityRole="alert"
									className="font-sans flex-1 text-sm leading-6 text-red-700 dark:text-red-300"
								>
									{validationMessage || t.common.correctErrors}
								</Text>
							</View>
						) : null}
					</>
					<PrimaryLoadingButton
						buttonText={isEditMode ? t.common.update : t.companies.addTitle}
						loading={isPending}
						onClick={() => {
							setHasAttemptedSubmit(true);
							void formik.submitForm();
							if (!formik.isValid) {
								onError(t.common.correctErrors);
								scrollRef.current?.scrollTo({ y: 0, animated: true });
							}
						}}
						active
						startIcon={<MaterialIcons name={isEditMode ? 'save' : 'add'} size={20} color={'#fff'} />}
					/>
				</>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const CompaniesForm = () => {
	const params = useLocalSearchParams<{ id?: string | string[] }>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const { t } = useLanguage();
	const { is_staff } = usePermission();
	const profile = useAppSelector(getProfilState);
	const allowed = !!profile.id && is_staff;

	if (!allowed) return <NoPermission />;
	if (id === null)
		return (
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 }}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<ApiAlert errorDetails={t.notFound.message} />
					<PrimaryLoadingButton
						buttonText={t.common.back}
						onClick={() => router.dismissTo(COMPANIES_LIST)}
						inverted
						active
						loading={false}
					/>
				</View>
			</ScrollView>
		);
	return <FormikContent key={id ?? 'new'} id={id} />;
};

export default CompaniesForm;
