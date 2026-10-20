import { useState } from 'react';
import { runWithCleanup } from '@/utils/runWithCleanup';
import { Text, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useEditPasswordMutation, profilApi } from '@/store/services/account';
import { accountEditProfilAction } from '@/store/actions/accountActions';
import { getProfilState } from '@/store/selectors';
import { useAppDispatch, useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { changePasswordSchema } from '@/utils/formValidationSchemas';
import { setFormikAutoErrors } from '@/utils/helpers';
import CustomPasswordInput from '@/components/formikElements/customPasswordInput/customPasswordInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';

const PasswordClient = () => {
	const [isPending, setIsPending] = useState(false);
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const dispatch = useAppDispatch();
	const profil = useAppSelector(getProfilState);
	const [changePassword, { isLoading: isChangePasswordLoading }] = useEditPasswordMutation();
	const formik = useFormik({
		initialValues: {
			old_password: '',
			new_password: '',
			new_password2: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(changePasswordSchema),
		onSubmit: async (values, { setFieldError, resetForm }) => {
			setIsPending(true);
			await runWithCleanup(
				async () => {
					try {
						await changePassword({
							data: {
								old_password: values.old_password,
								new_password: values.new_password,
								new_password2: values.new_password2,
							},
						}).unwrap();
						if (profil.id)
							dispatch(
								accountEditProfilAction({
									...profil,
									default_password_set: false,
								}),
							);
						const request = dispatch(
							profilApi.endpoints.getProfil.initiate(undefined, {
								forceRefetch: true,
							}),
						);
						try {
							dispatch(accountEditProfilAction(await request.unwrap()));
						} catch {
							/* A failed refresh does not undo a successful password change. */
						} finally {
							request.unsubscribe();
						}
						onSuccess(t.settings.passwordChangeSuccess);
						resetForm();
					} catch (e) {
						onError(t.settings.passwordChangeError);
						setFormikAutoErrors({ e, setFieldError });
					}
				},
				() => setIsPending(false),
			);
		},
	});
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
							<MaterialIcons name={'lock-outline'} size={25} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{t.settings.passwordTitle}
							</Text>
						</View>
					</View>
					{profil?.default_password_set && (
						<View className="flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
							<MaterialIcons name="warning-amber" size={22} color="#d97706" />
							<Text className="font-sans flex-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
								{t.settings.defaultPasswordWarning}
							</Text>
						</View>
					)}
					<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
						<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={'lock-reset'} size={21} color="#0274d7" />
							</View>
							<View className="flex-1 gap-1">
								<Text
									accessibilityRole="header"
									className="text-ink dark:text-slate-100 font-poppins-semibold text-base"
								>
									{t.settings.passwordTitle}
								</Text>
							</View>
						</View>
						<>
							<CustomPasswordInput
								id="old_password"
								label={t.settings.fieldOldPassword}
								placeholder={t.settings.fieldOldPassword}
								value={formik.values.old_password}
								autoComplete="current-password"
								onChangeText={formik.handleChange('old_password')}
								onBlur={formik.handleBlur('old_password')}
								disabled={isPending}
								error={formik.touched.old_password && Boolean(formik.errors.old_password)}
								helperText={formik.touched.old_password ? formik.errors.old_password : ''}
								startIcon={
									<MaterialIcons
										name="lock-outline"
										size={20}
										color={formik.touched.old_password && formik.errors.old_password ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomPasswordInput
								id="new_password"
								label={t.settings.fieldNewPassword}
								placeholder={t.settings.fieldNewPassword}
								value={formik.values.new_password}
								autoComplete="new-password"
								onChangeText={formik.handleChange('new_password')}
								onBlur={formik.handleBlur('new_password')}
								disabled={isPending}
								error={formik.touched.new_password && Boolean(formik.errors.new_password)}
								helperText={formik.touched.new_password ? formik.errors.new_password : ''}
								startIcon={
									<MaterialIcons
										name="lock-outline"
										size={20}
										color={formik.touched.new_password && formik.errors.new_password ? '#dc2626' : '#94a3b8'}
									/>
								}
							/>
							<CustomPasswordInput
								id="new_password2"
								label={t.settings.fieldConfirmPassword}
								placeholder={t.settings.fieldConfirmPassword}
								value={formik.values.new_password2}
								autoComplete="new-password"
								onChangeText={formik.handleChange('new_password2')}
								onBlur={formik.handleBlur('new_password2')}
								disabled={isPending}
								error={formik.touched.new_password2 && Boolean(formik.errors.new_password2)}
								helperText={formik.touched.new_password2 ? formik.errors.new_password2 : ''}
								startIcon={
									<MaterialIcons
										name="lock-outline"
										size={20}
										color={formik.touched.new_password2 && formik.errors.new_password2 ? '#dc2626' : '#94a3b8'}
									/>
								}
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
						buttonText={t.settings.changePasswordBtn}
						loading={isPending || isChangePasswordLoading}
						onClick={() => void formik.submitForm()}
						active
						startIcon={<MaterialIcons name="lock-reset" size={20} color={'#fff'} />}
					/>
				</>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

export default PasswordClient;
