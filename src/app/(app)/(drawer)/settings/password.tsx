import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useState } from 'react';
import { Text, View, Platform } from 'react-native';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useEditPasswordMutation } from '@/store/services/account';
import { accountEditProfilAction } from '@/store/actions/accountActions';
import { getProfilState } from '@/store/selectors';
import { useAppDispatch, useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { changePasswordSchema } from '@/utils/formValidationSchemas';
import { runWithCleanup, setFormikAutoErrors } from '@/utils/helpers';
import CustomPasswordInput from '@/components/nativeElements/customPasswordInput/customPasswordInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import { colors } from '@/utils/themes';

const ChangePasswordPage = () => {
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
		<View
			className="bg-slate-50 dark:bg-night"
			style={{
				flex: 1,
			}}
		>
			<KeyboardAwareScrollView
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
					{profil?.default_password_set && (
						<View className="flex-row items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
							<MaterialIcons name="warning-amber" size={22} color={colors.warning} />
							<Text className="font-sans flex-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
								{t.settings.defaultPasswordWarning}
							</Text>
						</View>
					)}
					<SectionCard title={t.settings.passwordTitle} icon={'lock-reset'}>
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
								startIcon={<MaterialIcons name="lock-outline" size={20} color={colors.slate[400]} />}
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
								startIcon={<MaterialIcons name="lock-outline" size={20} color={colors.slate[400]} />}
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
								startIcon={<MaterialIcons name="lock-outline" size={20} color={colors.slate[400]} />}
							/>
						</>
					</SectionCard>
					<>
						{formik.errors.globalError || (formik.submitCount > 0 && !formik.isValid) ? (
							<ApiAlert variant="banner" errorDetails={formik.errors.globalError || t.common.correctErrors} />
						) : null}
					</>
				</>
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton loading={isPending || isChangePasswordLoading} onClick={() => void formik.submitForm()} active />
			</PageActionBar>
		</View>
	);
};

export default ChangePasswordPage;
