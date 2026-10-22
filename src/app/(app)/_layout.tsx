import { Redirect, usePathname, useSegments } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { getProfilState } from '@/store/selectors';
import { DASHBOARD_PASSWORD } from '@/utils/routes';
import AppUpdate from '@/components/shared/appUpdate/appUpdate';
import { NavigationDrawer, NotificationStatus } from '@/components/layouts/navigationBar/navigationBar';
import { useAppSelector } from '@/utils/hooks';

const AuthenticatedLayout = () => {
	const profile = useAppSelector(getProfilState);
	const pathname = usePathname();
	const segments = useSegments();
	if (profile?.default_password_set && pathname !== DASHBOARD_PASSWORD) return <Redirect href={DASHBOARD_PASSWORD} />;
	return (
		<>
			<NotificationStatus />
			<AppUpdate />
			<Drawer
				drawerContent={(props) => <NavigationDrawer {...props} />}
				screenOptions={{
					headerShown: false,
					drawerStyle: { width: 310 },
					swipeEnabled: !segments.some((segment) => segment === 'form' || segment === '[id]'),
				}}
			>
				<Drawer.Screen name="(drawer)" />
			</Drawer>
		</>
	);
};

export default AuthenticatedLayout;
