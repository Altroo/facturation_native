import Poppins from '../../assets/fonts/Poppins-Regular.ttf';
import PoppinsMedium from '../../assets/fonts/Poppins-Medium.ttf';
import PoppinsSemiBold from '../../assets/fonts/Poppins-SemiBold.ttf';
import { useEffect } from 'react';
import Logo from '../../assets/facturation-logo.png';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import '../styles/globals.css';
import { ScrollView, Text, ActivityIndicator, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useAssets } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
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
import PdfLoading from '@/components/portals/pdfLoading/pdfLoading';
import { useAppDispatch, useAppSelector, useLanguage } from '@/utils/hooks';
import { getInitState } from '@/store/selectors';
import { initAppAction } from '@/store/actions/_initActions';
import { accountLogoutAction } from '@/store/actions/accountActions';
import { colors, fonts } from '@/utils/themes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { dismissDropDownsOnOutsidePress } from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import AppSplash from '@/components/shared/appSplash/appSplash';

// Keep the native launch screen above React until local resources and preferences are ready.
void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
	console.warn('Unable to keep the splash screen visible:', error);
});

export const RootNavigator = () => {
	const reduceMotion = useReducedMotion();
	const dispatch = useAppDispatch();
	const { status, error } = useAppSelector(getInitState);
	const { t } = useLanguage();
	const { mode } = useColorMode();
	if (status === 'booting') return <AppSplash />;
	if (status === 'signingOut') return <ApiProgress />;
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
				animation: reduceMotion ? 'none' : 'fade',
				contentStyle: { backgroundColor: mode === 'dark' ? colors.night : colors.screenBackground },
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
	const reduceMotion = useReducedMotion();
	useEffect(() => {
		SplashScreen.setOptions({ fade: !reduceMotion, duration: reduceMotion ? 0 : 180 });
	}, [reduceMotion]);
	const [loaded, error] = useFonts({
		...MaterialIcons.font,
		[fonts.regular]: Poppins,
		[fonts.medium]: PoppinsMedium,
		[fonts.semibold]: PoppinsSemiBold,
	});
	const [assets, assetError] = useAssets([Logo]);
	if ((!loaded && !error) || (!assets && !assetError))
		return (
			<View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.splashBackground }}>
				<ActivityIndicator color={colors.splashForeground} />
			</View>
		);
	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<KeyboardProvider preload={false}>
					<SessionProvider>
						<StoreProvider>
							<InitContextProvider>
								<InitEffects />
								<ThemeProvider>
									<LanguageContextProvider>
										<View
											testID="app-root"
											style={{ flex: 1 }}
											onLayout={SplashScreen.hide}
											onTouchStart={dismissDropDownsOnOutsidePress}
											onPointerDown={dismissDropDownsOnOutsidePress}
										>
											<ErrorBoundary>
												<ToastContextProvider>
													<SessionExpiredListener />
													<AutocompleteDropdownContextProvider>
														<RootNavigator />
													</AutocompleteDropdownContextProvider>
													<Maintenance />
													<PdfLoading />
												</ToastContextProvider>
											</ErrorBoundary>
										</View>
									</LanguageContextProvider>
								</ThemeProvider>
							</InitContextProvider>
						</StoreProvider>
					</SessionProvider>
				</KeyboardProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
};

export default RootLayout;
