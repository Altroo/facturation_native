import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useState } from 'react';
import { runWithCleanup } from '@/utils/runWithCleanup';
import { ScrollView, View, KeyboardAvoidingView, Platform, Text } from 'react-native';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useGetProfilQuery, useEditProfilMutation } from '@/store/services/account';
import { accountEditProfilAction } from '@/store/actions/accountActions';
import { useAppDispatch, useLanguage, useToast } from '@/utils/hooks';
import { profilSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, setFormikAutoErrors } from '@/utils/helpers';
import { genderItemsList } from '@/utils/rawData';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import CustomSquareImageUploading from '@/components/formikElements/customSquareImageUploading/customSquareImageUploading';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const EditProfilClient = () => {
	const token = useInitAccessToken();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const {
		currentData: profilData,
		isLoading: isProfilLoading,
		error,
		refetch,
	} = useGetProfilQuery(undefined, { skip: !token });
	const [editProfil, { isLoading: isEditLoading }] = useEditProfilMutation();
	const dispatch = useAppDispatch();
	const [isPending, setIsPending] = useState(false);

	const formik = useFormik({
		initialValues: {
			first_name: profilData?.first_name ?? '',
			last_name: profilData?.last_name ?? '',
			gender: profilData?.gender ?? '',
			avatar: profilData?.avatar ?? '',
			avatar_cropped: profilData?.avatar_cropped ?? '',
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(profilSchema),
		onSubmit: async (data, { setFieldError }) => {
			setIsPending(true);
			const { globalError: _globalError, ...payload } = data;
			await runWithCleanup(
				async () => {
					try {
						const response = await editProfil({ data: payload }).unwrap();
						if (response && profilData) {
							dispatch(
								accountEditProfilAction({
									...profilData,
									...response,
									gender:
										response.gender === 'H'
											? 'Homme'
											: response.gender === 'F'
												? 'Femme'
												: (response.gender ?? profilData.gender),
								}),
							);
							onSuccess(t.settings.profileUpdateSuccess);
						}
					} catch (e) {
						onError(t.settings.profileUpdateError);
						setFormikAutoErrors({ e, setFieldError });
					}
				},
				() => {
					setIsPending(false);
				},
			);
		},
	});

	if (isProfilLoading) return <ApiProgress />;
	if (!profilData)
		return error ? (
			<View className="gap-3 p-5">
				<ApiAlert errorDetails={normalizeApiError(error).message} />
				<PrimaryLoadingButton
					buttonText={t.common.retry}
					onClick={() => void refetch()}
					active
					loading={false}
					inverted
				/>
			</View>
		) : (
			<ApiProgress />
		);

	return (
		<KeyboardAvoidingView
			style={{
				flex: 1,
			}}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
			keyboardVerticalOffset={100}
		>
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
				<>
					<View className="flex-row items-center gap-4 py-1">
						<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-panel">
							<MaterialIcons name={'account-circle'} size={25} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{t.settings.profileTitle}
							</Text>
							{!![profilData?.first_name, profilData?.last_name].filter(Boolean).join(' ') && (
								<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">
									{[profilData?.first_name, profilData?.last_name].filter(Boolean).join(' ')}
								</Text>
							)}
						</View>
					</View>
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'add-photo-alternate'} size={21} color="#0274d7" />
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
								label={t.settings.fieldEmail}
								placeholder={t.settings.fieldEmail}
								value={profilData?.email}
								keyboardType="email-address"
								disabled={true}
								startIcon={<MaterialIcons name="mail-outline" size={20} color={'#94a3b8'} />}
							/>
							<CustomTextInput
								id="first_name"
								label={t.settings.fieldNom}
								placeholder={t.settings.fieldNom}
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
								label={t.settings.fieldPrenom}
								placeholder={t.settings.fieldPrenom}
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
								label={t.settings.fieldGenre}
								value={formik.values.gender}
								items={genderItemsList}
								onChange={(value) => void formik.setFieldValue('gender', value)}
								helperText={formik.touched.gender ? formik.errors.gender : undefined}
								disabled={isPending}
								error={Boolean(formik.touched.gender ? formik.errors.gender : undefined)}
								startIcon={<MaterialIcons name="groups" size={20} color={'#94a3b8'} />}
							/>
						</>
					</View>
					<>
						{formik.errors.globalError || (formik.submitCount > 0 && !formik.isValid) ? (
							<View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
								<MaterialIcons name="error-outline" size={22} color="#dc2626" />
								<Text
									accessibilityRole="alert"
									className="font-sans flex-1 text-sm leading-6 text-red-700 dark:text-red-300"
								>
									{formik.errors.globalError || t.common.correctErrors}
								</Text>
							</View>
						) : null}
					</>
					<PrimaryLoadingButton
						buttonText={t.settings.updateBtn}
						loading={isPending || isEditLoading}
						onClick={() => void formik.submitForm()}
						active
						startIcon={<MaterialIcons name="save" size={20} color={'#fff'} />}
					/>
				</>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

export default EditProfilClient;
