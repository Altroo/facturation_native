import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import { useEffect } from 'react';
import { setFormikAutoErrors } from '@/utils/helpers';
import { getInitState } from '@/store/selectors';
import { router } from 'expo-router';
import { AUTH_RESET_PASSWORD } from '@/utils/routes';
import { Text, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useLanguage, useAppDispatch, useAppSelector } from '@/utils/hooks';
import { accountLoginAction } from '@/store/actions/accountActions';
import { loginSchema } from '@/utils/formValidationSchemas';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomPasswordInput from '@/components/formikElements/customPasswordInput/customPasswordInput';
import { AuthThemeToggle } from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';
import Logo from '../../assets/facturation-logo.png';

const LoginClient = () => {
	const { t } = useLanguage();
	const dispatch = useAppDispatch();
	const { status, error } = useAppSelector(getInitState);
	const isPending = status === 'signingIn';
	const formik = useFormik({
		initialValues: { email: '', password: '', globalError: '' },
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(loginSchema),
		onSubmit: (values) => {
			dispatch(accountLoginAction({ email: values.email, password: values.password }));
		},
	});
	const { setFieldError } = formik;
	useEffect(() => {
		if (error) setFormikAutoErrors({ e: error, setFieldError });
	}, [error, setFieldError]);
	return (
		<SafeAreaView style={{ flex: 1 }} className="bg-white dark:bg-night">
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
					<View className="flex-row items-center justify-end gap-1">
						<AuthThemeToggle />
						<LanguageSwitcher />
					</View>
					<View className="mx-auto w-full max-w-md flex-1 justify-center gap-8 py-10">
						<View className="gap-5">
							<Image source={Logo} className="h-20 w-16 self-center" resizeMode="contain" />
							<View className="gap-2">
								<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-3xl">{t.auth.login}</Text>
							</View>
						</View>
						<View className="gap-5">
							<CustomTextInput
								required
								startIcon={<MaterialIcons name="email" size={20} color="#94a3b8" />}
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
								disabled={isPending}
								error={formik.touched.email && Boolean(formik.errors.email)}
								helperText={formik.touched.email ? formik.errors.email : ''}
							/>
							<CustomPasswordInput
								startIcon={<MaterialIcons name="lock" size={20} color="#94a3b8" />}
								label={t.auth.passwordLabel}
								placeholder={t.auth.passwordPlaceholder}
								value={formik.values.password}
								onChangeText={formik.handleChange('password')}
								onBlur={formik.handleBlur('password')}
								autoCapitalize="none"
								autoComplete="current-password"
								onSubmitEditing={() => formik.handleSubmit()}
								disabled={isPending}
								error={formik.touched.password && Boolean(formik.errors.password)}
								helperText={formik.touched.password ? formik.errors.password : ''}
							/>
							{error && (
								<ApiAlert
									errorDetails={
										error.status_code === 0
											? t.errors.networkError
											: formik.errors.globalError
												? formik.errors.globalError
												: error.status_code === 403
													? t.noPermission.description
													: error.status_code === 404
														? t.notFound.message
														: error.message
									}
								/>
							)}
							<Pressable
								accessibilityRole="link"
								disabled={isPending}
								onPress={() => router.push(AUTH_RESET_PASSWORD)}
								className="flex-row items-center gap-2"
							>
								<MaterialIcons name="lock-reset" size={20} color="#94a3b8" />
								<Text className="font-sans dark:text-slate-100 text-sm text-slate-400">{t.auth.forgotPassword}</Text>
							</Pressable>
							<PrimaryLoadingButton
								buttonText={t.auth.loginButton}
								onClick={() => formik.handleSubmit()}
								loading={isPending}
								active
								startIcon={<MaterialIcons name="login" size={20} color="#ffffff" />}
							/>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

export default LoginClient;
