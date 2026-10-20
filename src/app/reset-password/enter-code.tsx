import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { useFocusEffect, useRouter, Redirect } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import AuthLayout from '@/components/layouts/auth/authLayout';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { usePasswordResetMutation, useSendPasswordResetCodeMutation } from '@/store/services/account';
import { passwordResetCodeSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, runWithCleanup, setFormikAutoErrors } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { passwordResetCodeFields as fields } from '@/utils/rawData';
import { AUTH_RESET_PASSWORD, AUTH_RESET_PASSWORD_SET_PASSWORD } from '@/utils/routes';
import type { PasswordResetCodeField as FieldKey, PasswordResetData } from '@/types/accountTypes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type EnterCodePageContentProps = {
	email: string;
};

const EnterCodePageContent = (props: EnterCodePageContentProps) => {
	const { email } = props;
	const router = useRouter();
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [isPending, setIsPending] = useState(false);
	const inputRefs = useRef<Partial<Record<FieldKey, TextInputInstance | null>>>({});
	const [passwordReset, { isLoading: isPasswordResetLoading }] = usePasswordResetMutation();
	const [reSendPasswordResetCode, { isLoading: isResendLoading }] = useSendPasswordResetCodeMutation();
	const formik = useFormik({
		initialValues: { one: '', two: '', three: '', four: '', five: '', six: '', globalError: '' },
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(passwordResetCodeSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			await runWithCleanup(
				async () => {
					try {
						const code = values.one + values.two + values.three + values.four + values.five + values.six;
						await passwordReset({ email, code }).unwrap();
						await passwordResetStorage.write({ email, code });
						router.push(AUTH_RESET_PASSWORD_SET_PASSWORD);
					} catch (e) {
						// The API's "code" and "email" errors belong above the six digit inputs.
						setFormikAutoErrors({
							e: normalizeApiError(e),
							setFieldError: (_field, message) => setFieldError('globalError', message),
						});
					}
				},
				() => setIsPending(false),
			);
		},
	});
	const pending = isPending || isPasswordResetLoading || isResendLoading;
	const handleInput = (field: FieldKey, value: string) => {
		const index = fields.indexOf(field);
		const digits = value.replace(/\D/g, '').slice(0, 6);
		if (digits.length > 1) {
			const start = digits.length === 6 ? 0 : index;
			const values = { ...formik.values };
			for (let i = start; i < Math.min(start + digits.length, 6); i++) values[fields[i]] = digits[i - start];
			void formik.setValues(values);
			inputRefs.current[fields[Math.min(start + digits.length, 5)]]?.focus();
		} else {
			void formik.setFieldValue(field, digits);
			if (digits && index < 5) inputRefs.current[fields[index + 1]]?.focus();
		}
	};
	const renvoyerLeCodeHandler = async () => {
		setIsPending(true);
		await runWithCleanup(
			async () => {
				try {
					await reSendPasswordResetCode({ email }).unwrap();
					await passwordResetStorage.write({ email, code: '' }); // Replace any previously verified code.
					formik.resetForm();
					onSuccess(t.auth.codeSent);
				} catch (e) {
					onError(t.auth.codeSendError);
					setFormikAutoErrors({
						e: normalizeApiError(e),
						setFieldError: (_field, message) => formik.setFieldError('globalError', message),
					});
				}
			},
			() => setIsPending(false),
		);
	};
	return (
		<View className="gap-6">
			<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-3xl">{t.auth.enterCodeTitle}</Text>
			<View className="gap-1">
				<Text className="font-sans text-sm leading-6 text-slate-500 dark:text-slate-400">
					{t.auth.codeSentTo.trimEnd()}
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<Text
						selectable
						numberOfLines={1}
						className="font-poppins-medium text-sm leading-6 text-ink dark:text-slate-100"
					>
						{email}
					</Text>
				</ScrollView>
			</View>
			<View className="flex-row gap-2">
				{fields.map((field, index) => (
					<View key={field} className="flex-1 gap-1">
						<TextInput
							autoFocus={field === 'one'}
							ref={(input) => {
								inputRefs.current[field] = input;
							}}
							accessibilityLabel={`${t.auth.enterCodeTitle} ${index + 1}`}
							value={formik.values[field]}
							onChangeText={(value) => handleInput(field, value)}
							onBlur={formik.handleBlur(field)}
							onKeyPress={({ nativeEvent }) => {
								if (nativeEvent.key === 'Backspace' && !formik.values[field] && index > 0)
									inputRefs.current[fields[index - 1]]?.focus();
							}}
							keyboardType="number-pad"
							autoComplete={index === 0 ? 'one-time-code' : 'off'}
							textContentType={index === 0 ? 'oneTimeCode' : 'none'}
							maxLength={6}
							editable={!pending}
							selectTextOnFocus
							className={
								'h-14 rounded-xl border bg-white text-center font-poppins-semibold text-xl text-ink dark:bg-panel dark:text-white ' +
								(formik.touched[field] && formik.errors[field]
									? 'border-red-500'
									: 'border-slate-300 dark:border-slate-600')
							}
						/>
					</View>
				))}
			</View>
			{fields.some((field) => formik.touched[field] && formik.errors[field]) && (
				<ApiAlert errorDetails={fields.map((field) => formik.errors[field]).find(Boolean)} />
			)}
			{!!formik.errors.globalError && <ApiAlert errorDetails={formik.errors.globalError} />}
			<PrimaryLoadingButton
				buttonText={t.auth.confirmCode}
				loading={(isPending && !isResendLoading) || isPasswordResetLoading}
				onClick={() => formik.handleSubmit()}
				active={!pending}
				startIcon={<MaterialIcons name="thumb-up" size={20} color="#ffffff" />}
			/>
			<PrimaryLoadingButton
				buttonText={t.auth.resendCode}
				loading={isResendLoading}
				inverted
				onClick={() => void renvoyerLeCodeHandler()}
				active={!pending}
				startIcon={<MaterialIcons name="send" size={20} color="#0274d7" />}
			/>
		</View>
	);
};

type EnterCodeProps = {
	email: string;
};

const EnterCodeClient = (props: EnterCodeProps) => (
	<AuthLayout backHref={AUTH_RESET_PASSWORD}>
		<EnterCodePageContent {...props} />
	</AuthLayout>
);

const EnterCodePage = () => {
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
	if (!recovery?.email) return <Redirect href={AUTH_RESET_PASSWORD} />;
	return <EnterCodeClient email={recovery.email} />;
};

export default EnterCodePage;
