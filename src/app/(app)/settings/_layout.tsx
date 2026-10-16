import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import ThemeToggle from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';
import { Notifications } from '@/components/layouts/navigationBar/navigationBar';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';

const SettingsLayout = () => {
	const { t } = useLanguage();
	const { mode: theme } = useColorMode();
	const [controlsWidth, setControlsWidth] = useState(180);
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	return (
		<Stack
			screenOptions={{
				headerLeft: ({ tintColor }) => (
					<DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />
				),
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
				headerStyle: { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff' },
				headerTintColor: theme === 'dark' ? '#ffffff' : '#0f172a',
			}}
		>
			<Stack.Screen name="edit-profile" options={{ title: t.settings.profileTitle }} />
			<Stack.Screen name="password" options={{ title: t.settings.passwordTitle }} />
			<Stack.Screen name="notifications" options={{ title: t.settings.notificationPreferences }} />
		</Stack>
	);
};

export default SettingsLayout;
