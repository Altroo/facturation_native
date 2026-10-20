import CustomSwitch from '@/components/formikElements/customSwitch/customSwitch';
import type { CompanyClass } from '@/models/classes';
import { useInitAccessToken } from '@/contexts/InitContext';
import type { DropDownType } from '@/types/accountTypes';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import NoPermission from '@/components/shared/noPermission/noPermission';
import { ScrollView, View, Platform, Text } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type FC } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import {
	useGetUserQuery,
	useAddUserMutation,
	useEditUserMutation,
	useCheckEmailMutation,
} from '@/store/services/account';
import { useGetCompaniesListQuery } from '@/store/services/company';
import { getProfilState, getGroupesState } from '@/store/selectors';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import {
	normalizeApiError,
	setFormikAutoErrors,
	getLabelForKey,
	parseEntityId,
	runWithCleanup,
	runWithErrorHandler,
} from '@/utils/helpers';
import { userSchema } from '@/utils/formValidationSchemas';
import { genderItemsList } from '@/utils/rawData';
import { USERS_LIST } from '@/utils/routes';
import type { UserCompaniesType, UsersFormValuesType } from '@/types/usersTypes';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import CustomSquareImageUploading from '@/components/formikElements/customSquareImageUploading/customSquareImageUploading';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ManagedByTableSection from '@/components/shared/addManagedByTable/addManagedByTable';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type FormikContentProps = {
	id?: number;
};

const FormikContent: FC<FormikContentProps> = (props: FormikContentProps) => {
	const { id } = props;
	const token = useInitAccessToken();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const isEditMode = id !== undefined;

	const {
		currentData: rawData,
		isLoading: isDataLoading,
		error: dataError,
		refetch: refetchData,
	} = useGetUserQuery({ id: id! }, { skip: !token || !isEditMode });

	const [addUser, { isLoading: isAddLoading, error: addError }] = useAddUserMutation();
	const [checkEmail, { isLoading: isCheckEmailLoading, error: checkEmailError }] = useCheckEmailMutation();
	const [updateUser, { isLoading: isUpdateLoading, error: updateError }] = useEditUserMutation();

	// Compose error without local state or effects
	const error = checkEmailError || (isEditMode ? dataError || updateError : addError);
	const axiosError = error ? normalizeApiError(error) : undefined;

	const groupes = useAppSelector(getGroupesState).filter((role): role is string => typeof role === 'string');
	const [isPending, setIsPending] = useState(false);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

	const { data: companiesRawData, isLoading: isCompaniesLoading } = useGetCompaniesListQuery(
		{ with_pagination: false },
		{ skip: !token },
	);

	// Enforce the type of the companies data returned
	const companiesData = companiesRawData as Array<Partial<CompanyClass>> | undefined;

	const formik = useFormik<UsersFormValuesType>({
		initialValues: {
			first_name: rawData?.first_name ?? '',
			last_name: rawData?.last_name ?? '',
			email: rawData?.email ?? '',
			gender: rawData?.gender ?? '',
			is_active: rawData?.is_active ?? true,
			is_staff: rawData?.is_staff ?? true,
			avatar: rawData?.avatar ?? '',
			avatar_cropped: rawData?.avatar_cropped ?? '',
			// Initialize with server companies; Formik will reinitialize when rawData changes
			companies: Array.isArray(rawData?.companies) ? (rawData!.companies as UserCompaniesType[]) : [],
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(userSchema),
		onSubmit: async (data, { setFieldError }) => {
			setHasAttemptedSubmit(true);
			setIsPending(true);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Exclude the local Formik error from the API payload.
			const { globalError, ...payload } = data;
			await runWithCleanup(
				async () => {
					await runWithErrorHandler(
						async () => {
							if (rawData?.email !== data.email) {
								await checkEmail({ email: data.email }).unwrap();
							}
							if (isEditMode) {
								await updateUser({ data: payload, id: id }).unwrap();
								onSuccess(t.users.updateSuccess);
							} else {
								await addUser({ data: payload }).unwrap();
								onSuccess(t.users.addSuccess);
							}
							if (!isEditMode) {
								router.dismissTo(USERS_LIST);
							}
						},
						(e) => {
							if (isEditMode) {
								onError(t.users.updateError);
							} else {
								onError(t.users.addError);
							}
							setFormikAutoErrors({ e, setFieldError });
						},
					);
				},
				() => {
					setIsPending(false);
				},
			);
		},
	});

	// Derive role options
	const roleOptions = groupes.map((role) => ({ value: role, code: role }));

	// Expose companies to your table under the same name, derived from Formik
	const companiesAdmin: Array<UserCompaniesType> = formik.values.companies ?? [];

	// Expose a setter with the same name that writes back into Formik
	const setCompaniesAdmin = (next: Array<UserCompaniesType>) => {
		void formik.setFieldValue('companies', next, true);
	};

	const managedCompanyIds = companiesAdmin.map((entry) => entry.company_id);

	const availableCompanies: DropDownType[] = (companiesData ?? [])
		.filter(
			(company): company is Partial<CompanyClass> & { id: number; raison_sociale: string } =>
				typeof company.id === 'number' &&
				typeof company.raison_sociale === 'string' &&
				!managedCompanyIds.includes(company.id),
		)
		.map((company) => ({
			value: company.id.toString(),
			code: company.raison_sociale,
		}));

	const [selectedCompany, setSelectedCompany] = useState<DropDownType | null>(null);
	const [selectedRole, setSelectedRole] = useState<string>('');

	// Add via Formik-backed setter; no local state effects needed
	const handleAddCompany = () => {
		if (selectedCompany && selectedRole) {
			const companyId = parseInt(selectedCompany.value, 10);
			const companyData = companiesData?.find((c) => c.id === companyId);
			if (
				companyData &&
				companyData.id &&
				companyData.raison_sociale &&
				!companiesAdmin.some((c) => c.company_id === companyId)
			) {
				const newCompany: UserCompaniesType = {
					membership_id: 0,
					company_id: companyData.id,
					raison_sociale: companyData.raison_sociale,
					role: selectedRole,
					can_validate_factures: false,
					can_change_document_status: false,
				};
				setCompaniesAdmin([...companiesAdmin, newCompany]);
				setSelectedCompany(null);
				setSelectedRole('');
			}
		}
	};

	// Collect validation errors from Formik
	const fieldLabels = {
		email: t.users.fieldEmail,
		first_name: t.users.fieldNom,
		last_name: t.users.fieldPrenom,
		gender: t.users.fieldSexe,
		is_active: t.users.isActiveLabel,
		is_staff: t.users.isAdminLabel,
		companies: t.users.companiesSection,
		avatar: t.users.photoSection,
		avatar_cropped: t.users.fieldAvatarCropped,
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

	const isLoading = isCompaniesLoading || (isEditMode && isDataLoading);
	const shouldShowError = !!dataError && (axiosError?.status_code ?? 0) > 400 && !isLoading;

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
		<View
			className="bg-slate-50 dark:bg-night"
			style={{
				flex: 1,
			}}
		>
			<KeyboardAwareScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
							<MaterialIcons name={'person-outline'} size={25} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{isEditMode ? t.users.editTitle : t.users.addTitle}
							</Text>
							{!!(isEditMode ? [rawData?.first_name, rawData?.last_name].filter(Boolean).join(' ') : undefined) && (
								<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">
									{isEditMode ? [rawData?.first_name, rawData?.last_name].filter(Boolean).join(' ') : undefined}
								</Text>
							)}
						</View>
					</View>
					<>
						{formik.errors.globalError || hasValidationErrors ? (
							<ApiAlert variant="banner" errorDetails={validationMessage || t.common.correctErrors} />
						) : null}
					</>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'account-circle'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.users.photoSection}
								</Text>
							</View>
						</View>
						<>
							<CustomSquareImageUploading
								label={t.users.fieldAvatar}
								avatar
								image={formik.values.avatar}
								croppedImage={formik.values.avatar_cropped}
								error={formik.errors.avatar || formik.errors.avatar_cropped}
								onChange={(value) => void formik.setFieldValue('avatar', value)}
								onCrop={(value) => void formik.setFieldValue('avatar_cropped', value)}
								disabled={isPending}
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
									{t.users.personalSection}
								</Text>
							</View>
						</View>
						<>
							<CustomTextInput
								id="email"
								label={t.users.fieldEmail}
								placeholder={t.users.fieldEmail.replace(' *', '')}
								value={formik.values.email}
								onChangeText={formik.handleChange('email')}
								onBlur={formik.handleBlur('email')}
								autoCapitalize="none"
								autoCorrect={false}
								keyboardType="email-address"
								autoComplete="email"
								disabled={isPending || isEditMode}
								error={Boolean(formik.touched.email ? formik.errors.email : undefined)}
								helperText={formik.touched.email ? formik.errors.email : undefined}
								startIcon={
									<MaterialIcons
										name="mail-outline"
										size={20}
										color={(formik.touched.email ? formik.errors.email : undefined) ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="first_name"
								label={t.users.fieldNom}
								placeholder={t.users.fieldNom.replace(' *', '')}
								value={formik.values.first_name}
								onChangeText={formik.handleChange('first_name')}
								onBlur={formik.handleBlur('first_name')}
								autoCapitalize="words"
								disabled={isPending}
								error={Boolean(formik.touched.first_name ? formik.errors.first_name : undefined)}
								helperText={formik.touched.first_name ? formik.errors.first_name : undefined}
								startIcon={
									<MaterialIcons
										name="person-outline"
										size={20}
										color={(formik.touched.first_name ? formik.errors.first_name : undefined) ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomTextInput
								id="last_name"
								label={t.users.fieldPrenom}
								placeholder={t.users.fieldPrenom.replace(' *', '')}
								value={formik.values.last_name}
								onChangeText={formik.handleChange('last_name')}
								onBlur={formik.handleBlur('last_name')}
								autoCapitalize="words"
								disabled={isPending}
								error={Boolean(formik.touched.last_name ? formik.errors.last_name : undefined)}
								helperText={formik.touched.last_name ? formik.errors.last_name : undefined}
								startIcon={
									<MaterialIcons
										name="badge"
										size={20}
										color={(formik.touched.last_name ? formik.errors.last_name : undefined) ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomDropDownSelect
								id="gender"
								label={t.users.fieldSexe}
								value={formik.values.gender}
								items={genderItemsList}
								onChange={(value) => void formik.setFieldValue('gender', value)}
								onBlur={formik.handleBlur('gender')}
								helperText={formik.touched.gender ? formik.errors.gender : undefined}
								disabled={isPending}
								error={Boolean(formik.touched.gender ? formik.errors.gender : undefined)}
								startIcon={<MaterialIcons name="groups" size={20} color={'#94a3b8'} />}
							/>
						</>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'admin-panel-settings'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.users.accountSection}
								</Text>
							</View>
						</View>
						<>
							<CustomSwitch
								label={t.users.isActiveLabel}
								value={formik.values.is_active}
								onValueChange={(value) => void formik.setFieldValue('is_active', value)}
								disabled={isPending}
								startIcon={<MaterialIcons name={'check-circle-outline'} size={21} color="#64748b" />}
							/>
							<CustomSwitch
								label={t.users.isAdminLabel}
								value={formik.values.is_staff}
								onValueChange={(value) => void formik.setFieldValue('is_staff', value)}
								disabled={isPending}
								startIcon={<MaterialIcons name={'admin-panel-settings'} size={21} color="#64748b" />}
							/>
						</>
					</View>

					<ManagedByTableSection
						title={t.users.companiesSection}
						icon={<MaterialIcons name="business" size={21} color="#0274d7" />}
						emptyIcon={<MaterialIcons name="business" size={36} color="#94a3b8" />}
						emptyMessage={t.users.noCompany}
						headers={[t.shared.companyHeader, t.shared.roleHeader]}
						isUserTable={false}
						data={companiesAdmin}
						roleOptions={roleOptions}
						disabled={isPending}
						onRoleChange={(index, role) =>
							setCompaniesAdmin(companiesAdmin.map((company, i) => (i === index ? { ...company, role } : company)))
						}
						onInvoiceValidationChange={(index, value) =>
							void formik.setFieldValue(`companies.${index}.can_validate_factures`, value)
						}
						onDocumentStatusChangePermissionChange={(index, value) =>
							void formik.setFieldValue(`companies.${index}.can_change_document_status`, value)
						}
						onDelete={(index) => setCompaniesAdmin(companiesAdmin.filter((_, i) => i !== index))}
						showInvoiceValidationPermission
						showDocumentStatusChangePermission
						addSectionProps={{
							title: t.shared.addCompany,
							selectId: 'new_user_select',
							selectLabel: t.shared.selectCompany,
							selectItems: availableCompanies,
							selectValue: selectedCompany,
							onSelectChange: (_event, newValue) => setSelectedCompany(newValue),
							selectIcon: <MaterialIcons name="business" size={20} color="#94a3b8" />,
							roleId: 'new_user_role',
							roleLabel: t.shared.role,
							roleOptions,
							roleValue: selectedRole,
							onRoleChange: setSelectedRole,
							roleIcon: <MaterialIcons name="shield" size={20} color="#94a3b8" />,
							onAdd: handleAddCompany,
							isAddDisabled: !selectedCompany || !selectedRole,
						}}
					/>
					<>
						{formik.errors.globalError || hasValidationErrors ? (
							<ApiAlert variant="banner" errorDetails={validationMessage || t.common.correctErrors} />
						) : null}
					</>
					<PrimaryLoadingButton
						buttonText={isEditMode ? t.common.update : t.users.addTitle}
						loading={isPending || isAddLoading || isCheckEmailLoading || isUpdateLoading}
						onClick={() => {
							setHasAttemptedSubmit(true);
							void formik.submitForm();
							if (!formik.isValid) {
								onError(t.common.correctErrors);
								scrollRef.current?.scrollTo({ y: 0, animated: true });
							}
						}}
						active
						startIcon={<MaterialIcons name={isEditMode ? 'save' : 'person-add'} size={20} color={'#fff'} />}
					/>
				</>
			</KeyboardAwareScrollView>
		</View>
	);
};

const UsersFormPage = () => {
	const params = useLocalSearchParams<{
		id?: string | string[];
	}>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const { t } = useLanguage();
	const profile = useAppSelector(getProfilState);
	const allowed = !!profile.id && profile.is_staff && id !== profile?.id;

	if (!allowed) return <NoPermission />;
	if (id === null)
		return (
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<ApiAlert errorDetails={t.notFound.message} />
					<PrimaryLoadingButton
						buttonText={t.common.back}
						onClick={() => router.dismissTo(USERS_LIST)}
						inverted
						active
						loading={false}
					/>
				</View>
			</ScrollView>
		);
	return <FormikContent key={id ?? 'new'} id={id} />;
};

export default UsersFormPage;
