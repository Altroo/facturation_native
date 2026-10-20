import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import AuthLayout from '@/components/layouts/auth/authLayout';
import CustomPasswordInput from '@/components/formikElements/customPasswordInput/customPasswordInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useSetPasswordMutation } from '@/store/services/account';
import { passwordResetConfirmationSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, setFormikAutoErrors } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { AUTH_RESET_PASSWORD_COMPLETE, AUTH_RESET_PASSWORD_ENTER_CODE, AUTH_RESET_PASSWORD } from '@/utils/routes';
import { runWithCleanup } from '@/utils/runWithCleanup';
import type { SetPasswordPageContentProps, SetPasswordProps, PasswordResetData } from '@/types/accountTypes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const SetPasswordPageContent = ({ email, code }: SetPasswordPageContentProps) => {
	const router = useRouter();
	const { t } = useLanguage();
	const [isPending, setIsPending] = useState(false);
	const [setPassword, { isLoading: isSetPasswordLoading }] = useSetPasswordMutation();
	const formik = useFormik({
		initialValues: { new_password: '', new_password2: '', globalError: '' },
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(passwordResetConfirmationSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			await runWithCleanup(
				async () => {
					try {
						await setPassword({
							email,
							code,
							new_password: values.new_password,
							new_password2: values.new_password2,
						}).unwrap();
						await passwordResetStorage.complete();
						router.replace(AUTH_RESET_PASSWORD_COMPLETE);
					} catch (e) {
						setFormikAutoErrors({
							e: normalizeApiError(e),
							setFieldError: (field, message) =>
								setFieldError(field === 'new_password' || field === 'new_password2' ? field : 'globalError', message),
						});
					}
				},
				() => setIsPending(false),
			);
		},
	});
	const pending = isPending || isSetPasswordLoading;
	return (
		<View className="gap-6">
			<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-3xl">
				{t.auth.newPasswordTitle}
				{'\n'}
				{t.auth.newPasswordSubtitle}
			</Text>
			<CustomPasswordInput
				label={t.auth.passwordLabel}
				placeholder={t.auth.passwordPlaceholder}
				value={formik.values.new_password}
				onChangeText={formik.handleChange('new_password')}
				onBlur={formik.handleBlur('new_password')}
				autoComplete="new-password"
				disabled={pending}
				error={Boolean(formik.touched.new_password ? formik.errors.new_password : undefined)}
				helperText={formik.touched.new_password ? formik.errors.new_password : undefined}
				startIcon={
					<MaterialIcons
						name="lock"
						size={20}
						color={(formik.touched.new_password ? formik.errors.new_password : undefined) ? '#dc2626' : '#94a3b8'}
					/>
				}
			/>
			<CustomPasswordInput
				label={t.auth.confirmPasswordLabel}
				placeholder={t.auth.confirmPasswordPlaceholder}
				value={formik.values.new_password2}
				onChangeText={formik.handleChange('new_password2')}
				onBlur={formik.handleBlur('new_password2')}
				autoComplete="new-password"
				onSubmitEditing={() => formik.handleSubmit()}
				disabled={pending}
				error={Boolean(formik.touched.new_password2 ? formik.errors.new_password2 : undefined)}
				helperText={formik.touched.new_password2 ? formik.errors.new_password2 : undefined}
				startIcon={
					<MaterialIcons
						name="lock"
						size={20}
						color={(formik.touched.new_password2 ? formik.errors.new_password2 : undefined) ? '#dc2626' : '#94a3b8'}
					/>
				}
			/>
			{!!formik.errors.globalError && (
				<Text accessibilityRole="alert" className="font-sans text-sm text-red-600 dark:text-red-300">
					{formik.errors.globalError}
				</Text>
			)}
			<PrimaryLoadingButton
				buttonText={t.auth.changePasswordButton}
				loading={pending}
				onClick={() => formik.handleSubmit()}
				active
				startIcon={<MaterialIcons name="edit" size={20} color={'#fff'} />}
			/>
			<PrimaryLoadingButton
				buttonText={t.common.back}
				inverted
				onClick={() => router.dismissTo(AUTH_RESET_PASSWORD_ENTER_CODE)}
				active={!pending}
				loading={false}
				startIcon={<MaterialIcons name="arrow-back" size={20} color={'#0274d7'} />}
			/>
		</View>
	);
};
const SetPasswordClient = (props: SetPasswordProps) => (
	<AuthLayout>
		<SetPasswordPageContent {...props} />
	</AuthLayout>
);

const SetPasswordPage = () => {
	const [recovery, setRecovery] = useState<PasswordResetData | null>(null);
	const [ready, setReady] = useState(false);
	useFocusEffect(
		useCallback(() => {
			let mounted = true;
			setReady(false);
			void passwordResetStorage
				.read()
				.then((value) => {
					if (mounted) setRecovery(value);
				})
				.catch(() => {
					if (mounted) setRecovery(null);
				})
				.finally(() => {
					if (mounted) setReady(true);
				});
			return () => {
				mounted = false;
			};
		}, []),
	);
	if (!ready) return <ApiProgress />;
	if (passwordResetStorage.isComplete()) return <Redirect href={AUTH_RESET_PASSWORD_COMPLETE} />;
	if (!recovery?.email || !recovery.code) return <Redirect href={AUTH_RESET_PASSWORD} />;
	return <SetPasswordClient email={recovery.email} code={recovery.code} />;
};

export default SetPasswordPage;
