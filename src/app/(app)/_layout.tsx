import { Redirect, Stack, usePathname } from 'expo-router';
import { getProfilState } from '@/store/selectors';
import { DASHBOARD_PASSWORD } from '@/utils/routes';
import AppUpdate from '@/components/shared/appUpdate/appUpdate';
import { useNavigationHeader } from '@/components/layouts/navigationBar/navigationBar';
import { useAppSelector, useLanguage } from '@/utils/hooks';

export const unstable_settings = { anchor: '(drawer)' };

const AuthenticatedLayout = () => {
	const { t } = useLanguage();
	const headerOptions = useNavigationHeader();
	const profile = useAppSelector(getProfilState);
	const pathname = usePathname();
	if (profile?.default_password_set && pathname !== DASHBOARD_PASSWORD) return <Redirect href={DASHBOARD_PASSWORD} />;
	return (
		<>
			<AppUpdate />
			<Stack
				screenOptions={{
					...headerOptions,
					headerBackVisible: true,
					headerBackButtonDisplayMode: 'minimal',
				}}
			>
				<Stack.Screen name="(drawer)" options={{ headerShown: false }} />
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
			</Stack>
		</>
	);
};

export default AuthenticatedLayout;
