import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useColorMode } from '@/providers/themeProvider';
import { getUnreadNotificationCount } from '@/store/selectors';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { DASHBOARD_SETTINGS, NOTIFICATIONS_LIST } from '@/utils/routes';
import { bottomNavigationContentHeight, colors, navigationShadows } from '@/utils/themes';

type Props = {
	createAction?: { label: string; onPress: () => void };
	disabled?: boolean;
	hidden?: boolean;
	activePage?: 'notifications' | 'settings';
};

// Lists pass their own permission-checked Add action, including the selected
// company. The dock never guesses permissions or reconstructs form URLs.
const BottomNavigation = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const unreadCount = useAppSelector(getUnreadNotificationCount);
	if (props.hidden) return null;
	const android = Platform.OS === 'android';
	const surface = mode === 'dark' ? colors.panel : android ? colors.slate[100] : colors.white;
	const foreground = mode === 'dark' ? colors.slate[300] : colors.slate[600];
	const addDisabled = props.disabled || !props.createAction;
	const destinations = [
		{ key: 'notifications', label: t.navigation.notifications, icon: 'notifications-none', path: NOTIFICATIONS_LIST },
		{ key: 'settings', label: t.navigation.settings, icon: 'settings', path: DASHBOARD_SETTINGS },
	] as const;

	const renderDestination = (item: (typeof destinations)[number]) => {
		const active = props.activePage === item.key;
		return (
			<Pressable
				key={item.key}
				accessibilityRole="button"
				accessibilityLabel={item.label}
				accessibilityState={{ selected: active }}
				onPress={() => {
					if (active) return;
					// Enter once from the current page, then switch within that one
					// history entry. Closing never cycles through previous tabs.
					if (props.activePage) router.replace(item.path);
					else router.push(item.path);
				}}
				android_ripple={{ color: mode === 'dark' ? colors.slate[700] : colors.slate[200] }}
				className="min-h-16 flex-1 items-center justify-center gap-1 overflow-hidden rounded-2xl active:opacity-70"
			>
				<View
					className={
						'h-8 w-14 items-center justify-center rounded-full ' + (active ? 'bg-blue-50 dark:bg-slate-700' : '')
					}
				>
					{android ? (
						<MaterialIcons name={item.icon} size={25} color={active ? colors.brand : foreground} />
					) : (
						<Ionicons
							name={item.key === 'notifications' ? 'notifications-outline' : 'settings-outline'}
							size={25}
							color={active ? colors.brand : foreground}
						/>
					)}
					{item.key === 'notifications' && unreadCount > 0 && (
						<View
							testID="bottom-navigation-unread"
							accessibilityLabel={t.navigation.unreadNotifications(unreadCount)}
							className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-red-600 px-1"
						>
							<Text className="font-poppins-medium text-[10px] leading-4 text-white">
								{unreadCount > 99 ? '99+' : unreadCount}
							</Text>
						</View>
					)}
				</View>
				<Text className="font-poppins-medium text-[10px]" style={{ color: active ? colors.brand : foreground }}>
					{item.label}
				</Text>
			</Pressable>
		);
	};

	return (
		<View testID="bottom-navigation" pointerEvents="box-none" style={{ marginTop: -24, flexShrink: 0 }}>
			{/* Only Add overlaps the list. The surface starts at the list's bottom,
			    without a full-width spacer or shadow covering the cards. */}
			<View
				testID="bottom-navigation-surface"
				pointerEvents="none"
				style={{
					position: 'absolute',
					top: 24,
					bottom: 0,
					left: 0,
					right: 0,
					borderTopLeftRadius: android ? 16 : 24,
					borderTopRightRadius: android ? 16 : 24,
					backgroundColor: surface,
				}}
			/>
			<SafeAreaView edges={['bottom', 'left', 'right']} pointerEvents="box-none">
				<View
					style={{ height: bottomNavigationContentHeight }}
					className="flex-row items-end px-4"
					pointerEvents="box-none"
				>
					<View className="flex-1 pt-6" pointerEvents="box-none">
						{renderDestination(destinations[0])}
					</View>
					<View
						style={{ height: bottomNavigationContentHeight }}
						className="w-22 items-center"
						pointerEvents="box-none"
					>
						{/* Keep the shadow outside the clipped ripple surface. The full
					    raised button stays inside this parent's native touch bounds. */}
						<View
							testID="bottom-navigation-add-shadow"
							style={[
								{
									width: 64,
									height: 64,
									borderRadius: android ? 20 : 32,
									backgroundColor: addDisabled
										? mode === 'dark'
											? colors.slate[700]
											: colors.slate[200]
										: colors.brand,
								},
								!addDisabled && navigationShadows[mode === 'dark' ? 'addDark' : 'addLight'],
							]}
						>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={props.createAction?.label ?? t.common.add}
								accessibilityState={{ disabled: addDisabled }}
								disabled={addDisabled}
								onPress={props.createAction?.onPress}
								android_ripple={{ color: colors.brandDisabled, borderless: false }}
								className="h-16 w-16 items-center justify-center overflow-hidden active:opacity-80"
								style={{
									borderRadius: android ? 20 : 32,
									backgroundColor: addDisabled
										? mode === 'dark'
											? colors.slate[700]
											: colors.slate[200]
										: colors.brand,
								}}
							>
								<MaterialIcons name="add" size={32} color={addDisabled ? colors.slate[400] : colors.white} />
							</Pressable>
						</View>
						<Text
							className="mt-1 font-poppins-medium text-[10px]"
							style={{ color: addDisabled ? colors.slate[400] : foreground }}
						>
							{t.common.add}
						</Text>
					</View>
					<View className="flex-1 pt-6" pointerEvents="box-none">
						{renderDestination(destinations[1])}
					</View>
				</View>
			</SafeAreaView>
		</View>
	);
};

export default BottomNavigation;
