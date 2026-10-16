import Poppins from '../../assets/fonts/Poppins-Regular.ttf';
import PoppinsMedium from '../../assets/fonts/Poppins-Medium.ttf';
import PoppinsSemiBold from '../../assets/fonts/Poppins-SemiBold.ttf';
import Logo from '../../assets/facturation-logo.png';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import '../styles/globals.css';
import { ScrollView, Text, ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useAssets } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SessionProvider from '@/providers/sessionProvider';
import StoreProvider from '@/providers/storeProvider';
import ThemeProvider, { useColorMode } from '@/providers/themeProvider';
import { InitContextProvider } from '@/contexts/InitContext';
import { InitEffects } from '@/contexts/initEffects';
import { LanguageContextProvider } from '@/contexts/languageContext';
import { ToastContextProvider } from '@/contexts/toastContext';
import ErrorBoundary from '@/components/shared/errorBoundary';
import SessionExpiredListener from '@/components/shared/sessionExpiredListener/sessionExpiredListener';
import Maintenance from '@/components/shared/maintenance/Maintenance';
import { useAppDispatch, useAppSelector, useLanguage } from '@/utils/hooks';
import { getInitState } from '@/store/selectors';
import { initAppAction } from '@/store/actions/_initActions';
import { accountLogoutAction } from '@/store/actions/accountActions';
import { colors } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';

// Keep the native launch screen above React until local resources and preferences are ready.
void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
	console.warn('Unable to keep the splash screen visible:', error);
});

export const RootNavigator = () => {
	const dispatch = useAppDispatch();
	const { status, error } = useAppSelector(getInitState);
	const { t } = useLanguage();
	const { mode } = useColorMode();
	if (status === 'booting' || status === 'signingOut') return <ApiProgress />;
	if (status === 'unavailable')
		return (
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 }}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-xl">
						{t.mobile.sessionUnavailable}
					</Text>
					{error && (
						<ApiAlert
							errorDetails={
								error.status_code === 0
									? t.errors.networkError
									: error.status_code === 403
										? t.noPermission.description
										: error.status_code === 404
											? t.notFound.message
											: error.message
							}
						/>
					)}
					<Text className="font-sans text-ink dark:text-slate-100">{t.mobile.sessionHelp}</Text>
					<PrimaryLoadingButton
						buttonText={t.common.retry}
						onClick={() => dispatch(initAppAction())}
						active
						loading={false}
					/>
					<PrimaryLoadingButton
						inverted
						buttonText={t.navigation.logout}
						onClick={() => dispatch(accountLogoutAction())}
						active
						loading={false}
					/>
				</View>
			</ScrollView>
		);
	const authenticated = status === 'authenticated';
	return (
		<Stack
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: mode === 'dark' ? colors.night : '#f5f5f5' },
			}}
		>
			<Stack.Protected guard={authenticated}>
				<Stack.Screen name="(app)" />
			</Stack.Protected>
			<Stack.Protected guard={!authenticated}>
				<Stack.Screen name="login" />
				<Stack.Screen name="reset-password" />
			</Stack.Protected>
		</Stack>
	);
};

const RootLayout = () => {
	const [loaded, error] = useFonts({
		...MaterialIcons.font,
		Poppins,
		PoppinsMedium,
		PoppinsSemiBold,
	});
	const [assets, assetError] = useAssets([Logo]);
	if ((!loaded && !error) || (!assets && !assetError))
		return (
			<View className="flex-1 items-center justify-center bg-white">
				<ActivityIndicator color="#0274d7" />
			</View>
		);
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<SessionProvider>
					<StoreProvider>
						<InitContextProvider>
							<InitEffects />
							<ThemeProvider>
								<LanguageContextProvider>
									<View testID="app-root" style={{ flex: 1 }} onLayout={SplashScreen.hide}>
										<ErrorBoundary>
											<ToastContextProvider>
												<SessionExpiredListener />
												<RootNavigator />
												<Maintenance />
											</ToastContextProvider>
										</ErrorBoundary>
									</View>
								</LanguageContextProvider>
							</ThemeProvider>
						</InitContextProvider>
					</StoreProvider>
				</SessionProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};

export default RootLayout;
