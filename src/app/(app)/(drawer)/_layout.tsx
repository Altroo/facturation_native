import { Drawer, DrawerToggleButton } from 'expo-router/drawer';
import { NavigationDrawer, useNavigationHeader } from '@/components/layouts/navigationBar/navigationBar';
import { useLanguage } from '@/utils/hooks';

const DrawerLayout = () => {
	const { t } = useLanguage();
	const headerOptions = useNavigationHeader();
	return (
		<Drawer
			backBehavior="fullHistory"
			drawerContent={(props) => <NavigationDrawer {...props} />}
			screenOptions={{
				...headerOptions,
				headerLeft: ({ tintColor }) => (
					<DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />
				),
				drawerStyle: { width: 310 },
			}}
		>
			<Drawer.Screen name="index" options={{ title: t.navigation.dashboard }} />
			<Drawer.Screen name="clients/index" options={{ title: t.clients.listTitle }} />
			<Drawer.Screen name="clients/archived" options={{ title: t.clients.archivedTitle }} />
			<Drawer.Screen name="companies/index" options={{ title: t.companies.listTitle }} />
			<Drawer.Screen name="users/index" options={{ title: t.users.listTitle }} />
			<Drawer.Screen name="settings" options={{ headerShown: false }} />
		</Drawer>
	);
};

export default DrawerLayout;
