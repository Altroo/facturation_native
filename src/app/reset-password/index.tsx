import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import AuthLayout from '@/components/layouts/auth/authLayout';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useSendPasswordResetCodeMutation } from '@/store/services/account';
import { emailSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, setFormikAutoErrors } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { AUTH_LOGIN, AUTH_RESET_PASSWORD_ENTER_CODE } from '@/utils/routes';
import { runWithCleanup } from '@/utils/runWithCleanup';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const ResetPasswordPageContent = () => {
	const router = useRouter();
	const { t } = useLanguage();
	useFocusEffect(
		useCallback(() => {
			passwordResetStorage.resetCompletion();
		}, []),
	);
	const [isPending, setIsPending] = useState(false);
	const [reSendPasswordResetCode, { isLoading: isResendLoading }] = useSendPasswordResetCodeMutation();
	const formik = useFormik({
		initialValues: { email: '', globalError: '' },
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(emailSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			await runWithCleanup(
				async () => {
					try {
						await reSendPasswordResetCode({ email: values.email }).unwrap();
						await passwordResetStorage.write({ email: values.email, code: '' });
						router.push(AUTH_RESET_PASSWORD_ENTER_CODE);
					} catch (e) {
						setFormikAutoErrors({ e: normalizeApiError(e), setFieldError });
					}
				},
				() => setIsPending(false),
			);
		},
	});
	const pending = isPending || isResendLoading;
	return (
		<View className="gap-6">
			<View className="gap-2">
				<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-3xl">
					{t.auth.recoveryTitle}
					{'\n'}
					{t.auth.recoverySubtitle}
				</Text>
				<Text className="font-sans text-sm leading-6 text-slate-500 dark:text-slate-400">
					{t.auth.recoveryDescription}
				</Text>
			</View>
			<CustomTextInput
				required
				label={t.auth.emailLabel}
				placeholder={t.auth.emailPlaceholder}
				value={formik.values.email}
				onChangeText={formik.handleChange('email')}
				onBlur={formik.handleBlur('email')}
				autoCapitalize="none"
				autoCorrect={false}
				autoComplete="email"
				keyboardType="email-address"
				maxLength={254}
				onSubmitEditing={() => formik.handleSubmit()}
				disabled={pending}
				error={Boolean(formik.touched.email ? formik.errors.email : undefined)}
				helperText={formik.touched.email ? formik.errors.email : undefined}
				startIcon={
					<MaterialIcons
						name="email"
						size={20}
						color={(formik.touched.email ? formik.errors.email : undefined) ? '#dc2626' : '#94a3b8'}
					/>
				}
			/>
			{!!formik.errors.globalError && (
				<Text accessibilityRole="alert" className="font-sans text-sm text-red-600 dark:text-red-300">
					{formik.errors.globalError}
				</Text>
			)}
			<PrimaryLoadingButton
				buttonText={t.auth.sendCodeButton}
				loading={pending}
				onClick={() => formik.handleSubmit()}
				active
				startIcon={<MaterialIcons name="send" size={20} color={'#fff'} />}
			/>
			<PrimaryLoadingButton
				buttonText={t.auth.backToLogin}
				inverted
				onClick={() => router.dismissTo(AUTH_LOGIN)}
				active={!pending}
				loading={false}
				startIcon={<MaterialIcons name="arrow-back" size={20} color={'#0274d7'} />}
			/>
		</View>
	);
};

const ResetPasswordClient = () => (
	<AuthLayout>
		<ResetPasswordPageContent />
	</AuthLayout>
);

export default ResetPasswordClient;
