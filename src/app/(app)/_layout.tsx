import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, usePathname } from 'expo-router';
import { getProfilState } from '@/store/selectors';
import { DASHBOARD_PASSWORD } from '@/utils/routes';
import { colors } from '@/utils/themes';
import { Drawer } from 'expo-router/drawer';
import { NavigationDrawer, Notifications } from '@/components/layouts/navigationBar/navigationBar';
import ThemeToggle from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';
import AppUpdate from '@/components/shared/appUpdate/appUpdate';
import { useColorMode } from '@/providers/themeProvider';
import { useAppSelector, useLanguage } from '@/utils/hooks';

const AuthenticatedLayout = () => {
	const { t } = useLanguage();
	const { mode: theme } = useColorMode();
	const [controlsWidth, setControlsWidth] = useState(180);
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const profile = useAppSelector(getProfilState);
	const pathname = usePathname();
	// This layout runs after the root navigator mounts, so the redirect is safe on cold links.
	if (profile?.default_password_set && pathname !== DASHBOARD_PASSWORD) return <Redirect href={DASHBOARD_PASSWORD} />;
	return (
		<>
			<AppUpdate />
			<Drawer
				drawerContent={(props) => <NavigationDrawer {...props} />}
				screenOptions={{
					drawerStyle: { width: 310 },
					headerStyle: { backgroundColor: theme === 'dark' ? colors.panel : colors.white },
					headerTintColor: theme === 'dark' ? colors.white : colors.ink,
					headerTitleStyle: { fontFamily: 'PoppinsSemiBold', fontSize: 15 },
					headerTitleAlign: 'left',
					headerTitle: ({ children, tintColor }) => (
						<Text
							accessibilityRole="header"
							accessibilityLabel={children}
							numberOfLines={1}
							ellipsizeMode="tail"
							style={{
								maxWidth: Math.max(0, width - insets.left - insets.right - controlsWidth - 80),
								minWidth: 0,
								flexShrink: 1,
								fontFamily: 'PoppinsSemiBold',
								fontSize: 15,
								color: tintColor,
							}}
						>
							{children}
						</Text>
					),
					headerRight: () => (
						<View
							className="flex-row items-center gap-1"
							onLayout={({ nativeEvent }) => setControlsWidth(Math.ceil(nativeEvent.layout.width))}
						>
							<Notifications />
							<ThemeToggle />
							<LanguageSwitcher />
						</View>
					),
				}}
			>
				<Drawer.Screen name="index" options={{ title: t.navigation.dashboard }} />
				<Drawer.Screen name="companies" options={{ headerShown: false }} />
				<Drawer.Screen name="users" options={{ headerShown: false }} />
				<Drawer.Screen name="settings" options={{ headerShown: false }} />
			</Drawer>
		</>
	);
};

export default AuthenticatedLayout;
