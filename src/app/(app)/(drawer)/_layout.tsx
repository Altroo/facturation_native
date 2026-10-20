import { Stack } from 'expo-router';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useNavigationHeader } from '@/components/layouts/navigationBar/navigationBar';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';
import type { ColorValue } from 'react-native';

export const unstable_settings = { anchor: 'index' };

const DrawerStackLayout = () => {
	const { t } = useLanguage();
	const headerOptions = useNavigationHeader();
	const { mode } = useColorMode();
	const drawerHeaderOptions = {
		headerBackVisible: false,
		headerLeft: ({ tintColor }: { tintColor?: ColorValue }) => (
			<DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />
		),
	};
	return (
		<Stack
			screenOptions={{
				...headerOptions,
				contentStyle: { backgroundColor: mode === 'dark' ? colors.night : '#f5f5f5' },
				headerBackVisible: true,
				headerBackButtonDisplayMode: 'minimal',
				headerLeft: ({ tintColor, canGoBack }) =>
					canGoBack ? null : <DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />,
			}}
		>
			<Stack.Screen name="index" options={{ ...drawerHeaderOptions, title: t.navigation.dashboard }} />
			<Stack.Screen name="clients/index" options={{ ...drawerHeaderOptions, title: t.clients.listTitle }} />
			<Stack.Screen name="clients/archived" options={{ ...drawerHeaderOptions, title: t.clients.archivedTitle }} />
			<Stack.Screen
				name="clients/form"
				options={({ route }) => ({
					title:
						route.params && 'id' in route.params && route.params.id !== undefined
							? t.clients.editTitle
							: t.clients.addTitle,
				})}
			/>
			<Stack.Screen name="clients/[id]/index" options={{ title: t.clients.detailsTitle }} />
			<Stack.Screen name="companies/index" options={{ ...drawerHeaderOptions, title: t.companies.listTitle }} />
			<Stack.Screen
				name="companies/form"
				options={({ route }) => ({
					title:
						route.params && 'id' in route.params && route.params.id !== undefined
							? t.companies.editTitle
							: t.companies.addTitle,
				})}
			/>
			<Stack.Screen name="companies/[id]/index" options={{ title: t.companies.detailsTitle }} />
			<Stack.Screen name="users/index" options={{ ...drawerHeaderOptions, title: t.users.listTitle }} />
			<Stack.Screen
				name="users/form"
				options={({ route }) => ({
					title:
						route.params && 'id' in route.params && route.params.id !== undefined
							? t.users.editTitle
							: t.users.addTitle,
				})}
			/>
			<Stack.Screen name="users/[id]/index" options={{ title: t.users.detailsTitle }} />
			<Stack.Screen name="settings/edit-profile" options={{ title: t.settings.profileTitle }} />
			<Stack.Screen name="settings/password" options={{ title: t.settings.passwordTitle }} />
			<Stack.Screen name="settings/notifications" options={{ title: t.settings.notificationPreferences }} />
		</Stack>
	);
};

export default DrawerStackLayout;
