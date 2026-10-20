import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useNavigationHeader } from '@/components/layouts/navigationBar/navigationBar';
import { useLanguage } from '@/utils/hooks';

const SettingsLayout = () => {
	const { t } = useLanguage();
	const headerOptions = useNavigationHeader();
	return (
		<Stack
			screenOptions={{
				...headerOptions,
				headerBackVisible: true,
				headerBackButtonDisplayMode: 'minimal',
				headerLeft: ({ tintColor, canGoBack }) =>
					canGoBack ? null : <DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />,
			}}
		>
			<Stack.Screen name="edit-profile" options={{ title: t.settings.profileTitle }} />
			<Stack.Screen name="password" options={{ title: t.settings.passwordTitle }} />
			<Stack.Screen name="notifications" options={{ title: t.settings.notificationPreferences }} />
		</Stack>
	);
};

export default SettingsLayout;
