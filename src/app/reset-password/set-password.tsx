import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import AuthLayout from '@/components/layouts/auth/authLayout';
import CustomPasswordInput from '@/components/nativeElements/customPasswordInput/customPasswordInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useSetPasswordMutation } from '@/store/services/account';
import { passwordResetConfirmationSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, runWithCleanup, setFormikAutoErrors } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { AUTH_RESET_PASSWORD_COMPLETE, AUTH_RESET_PASSWORD_ENTER_CODE, AUTH_RESET_PASSWORD } from '@/utils/routes';
import type { PasswordResetData } from '@/types/accountTypes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

type SetPasswordPageContentProps = {
	email: string;
	code: string;
};

const SetPasswordPageContent = (props: SetPasswordPageContentProps) => {
	const { email, code } = props;
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
						color={
							(formik.touched.new_password ? formik.errors.new_password : undefined) ? colors.danger : colors.slate[400]
						}
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
						color={
							(formik.touched.new_password2 ? formik.errors.new_password2 : undefined)
								? colors.danger
								: colors.slate[400]
						}
					/>
				}
			/>
			{!!formik.errors.globalError && <ApiAlert errorDetails={formik.errors.globalError} />}
			<PrimaryLoadingButton
				buttonText={t.auth.changePasswordButton}
				loading={pending}
				onClick={() => formik.handleSubmit()}
				active
				startIcon={<MaterialIcons name="edit" size={20} color={colors.white} />}
			/>
		</View>
	);
};

const SetPasswordPage = () => {
	const [recovery, setRecovery] = useState<PasswordResetData | null>(null);
	const [ready, setReady] = useState(false);
	useFocusEffect(() => {
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
	});
	if (!ready) return <ApiProgress />;
	if (passwordResetStorage.isComplete()) return <Redirect href={AUTH_RESET_PASSWORD_COMPLETE} />;
	if (!recovery?.email || !recovery.code) return <Redirect href={AUTH_RESET_PASSWORD} />;
	return (
		<AuthLayout backHref={AUTH_RESET_PASSWORD_ENTER_CODE}>
			<SetPasswordPageContent email={recovery.email} code={recovery.code} />
		</AuthLayout>
	);
};

export default SetPasswordPage;
