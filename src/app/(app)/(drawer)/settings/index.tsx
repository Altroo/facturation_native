import { type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';
import {
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_NOTIFICATIONS,
	DASHBOARD_PASSWORD,
	DASHBOARD_OBJECTIFS_MENSUELS,
} from '@/utils/routes';
import { colors } from '@/utils/themes';

const SettingsPage = () => {
	const { t } = useLanguage();
	const profil = useAppSelector(getProfilState);
	const items: {
		label: string;
		icon: ComponentProps<typeof MaterialIcons>['name'];
		path: Href;
	}[] = [
		{ label: t.navigation.myProfile, icon: 'person-outline', path: DASHBOARD_EDIT_PROFILE },
		{ label: t.navigation.changePassword, icon: 'lock-outline', path: DASHBOARD_PASSWORD },
		{ label: t.navigation.notificationPreferences, icon: 'notifications-none', path: DASHBOARD_NOTIFICATIONS },
		...(profil.is_staff
			? [{ label: t.navigation.monthlyObjectives, icon: 'trending-up' as const, path: DASHBOARD_OBJECTIFS_MENSUELS() }]
			: []),
	];
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<ScrollView contentContainerStyle={{ padding: 16 }}>
				<SectionCard>
					{items.map((item, index) => (
						<Pressable
							key={item.label}
							accessibilityRole="button"
							accessibilityLabel={item.label}
							onPress={() => router.push(item.path)}
							className={
								'min-h-16 flex-row items-center gap-3 py-3 active:opacity-70 ' +
								(index < items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : '')
							}
						>
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name={item.icon} size={23} color={colors.brand} />
							</View>
							<Text className="flex-1 font-poppins-medium text-sm text-ink dark:text-slate-100">{item.label}</Text>
							<MaterialIcons name="chevron-right" size={22} color={colors.slate[400]} />
						</Pressable>
					))}
				</SectionCard>
			</ScrollView>
			<BottomNavigation activePage="settings" />
		</View>
	);
};

export default SettingsPage;
