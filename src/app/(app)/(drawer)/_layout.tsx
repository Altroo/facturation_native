import { router, Stack, type NativeStackNavigationOptions, type NativeStackHeaderItemProps } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DrawerToggleButton } from 'expo-router/drawer';
import { useNavigationHeader } from '@/components/layouts/navigationBar/navigationBar';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { colors, fonts } from '@/utils/themes';
import { Platform, Pressable, Text, View, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { DASHBOARD } from '@/utils/routes';

export const unstable_settings = { anchor: 'index' };

const DrawerStackLayout = () => {
	const { t } = useLanguage();
	const headerOptions = useNavigationHeader();
	const { mode } = useColorMode();
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const reduceMotion = useReducedMotion();
	const headerLeft = ({ tintColor }: { tintColor?: ColorValue }) => (
		<DrawerToggleButton tintColor={tintColor} accessibilityLabel={t.common.toggleDrawer} />
	);
	const drawerHeaderItems = ({ tintColor }: { tintColor?: ColorValue }) => [
		{ type: 'custom' as const, element: headerLeft({ tintColor }), hidesSharedBackground: true },
	];
	const drawerHeaderOptions = {
		headerBackVisible: false,
		headerLeft,
		unstable_headerLeftItems: drawerHeaderItems,
	} satisfies NativeStackNavigationOptions;
	const closeUtilityScreen = () => {
		if (router.canGoBack()) router.back();
		else router.replace(DASHBOARD);
	};
	const closeButton = () => (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={t.common.close}
			className="h-11 w-11 items-center justify-center rounded-full active:opacity-60"
			onPress={closeUtilityScreen}
		>
			<MaterialIcons name="close" size={25} color={headerOptions.headerTintColor} />
		</Pressable>
	);
	const utilityHeaderOptions = {
		presentation: 'card' as const,
		animation: reduceMotion ? ('none' as const) : ('slide_from_bottom' as const),
		headerBackVisible: false,
		headerLeft: closeButton,
		unstable_headerLeftItems: () => [
			{
				type: 'button' as const,
				label: t.common.close,
				icon: { type: 'sfSymbol' as const, name: 'xmark' as const },
				width: 44,
				onPress: closeUtilityScreen,
				hidesSharedBackground: true,
			},
		],
	} satisfies NativeStackNavigationOptions;
	const titleOptions = (title: string, options: NativeStackNavigationOptions = {}): NativeStackNavigationOptions => {
		// Android supports start alignment directly. On iOS, place only the text
		// in the leading slot, preserving UIKit's own back icon and bar height.
		if (Platform.OS !== 'ios') return { ...options, title };
		const titleElement = ({ tintColor }: NativeStackHeaderItemProps) => (
			<Text
				accessibilityRole="header"
				accessibilityLabel={title}
				numberOfLines={1}
				ellipsizeMode="tail"
				style={{
					// Reserve the native back/drawer slot, two 44-point actions and
					// UIKit's item margins so a long title cannot displace the controls.
					maxWidth: Math.max(0, width - insets.left - insets.right - 200),
					fontFamily: fonts.semibold,
					fontSize: 15,
					color: tintColor,
					textAlign: 'left',
				}}
			>
				{title}
			</Text>
		);
		return {
			...options,
			title,
			headerTitle: '',
			headerLeft: (props) => (
				<View className="flex-row items-center gap-2">
					{options.headerLeft?.(props)}
					{titleElement(props)}
				</View>
			),
			unstable_headerLeftItems: (props) => [
				...(options.unstable_headerLeftItems?.(props) ?? []),
				{ type: 'custom', element: titleElement(props), hidesSharedBackground: true },
			],
		};
	};
	return (
		<Stack
			screenOptions={({ route }) => {
				const editing = route.params && 'id' in route.params && route.params.id !== undefined;
				const screens: Record<string, NativeStackNavigationOptions> = {
					index: { title: t.navigation.dashboard, ...drawerHeaderOptions },
					'articles/index': { title: t.articles.listTitle, ...drawerHeaderOptions },
					'articles/archived': { title: t.articles.archivedTitle, ...drawerHeaderOptions },
					'articles/form': { title: editing ? t.articles.editTitle : t.articles.navAddTitle },
					'articles/[id]/index': { title: t.articles.detailsTitle },
					'bon-de-livraison/index': { title: t.bonsLivraison.listTitle, ...drawerHeaderOptions },
					'bon-de-livraison/uninvoiced': { title: t.bonsLivraison.uninvoicedTitle, ...drawerHeaderOptions },
					'bon-de-livraison/form': { title: editing ? t.bonsLivraison.editTitle : t.bonsLivraison.addTitle },
					'bon-de-livraison/[id]/index': { title: t.bonsLivraison.detailsTitle },
					'devis/index': { title: t.devis.listTitle, ...drawerHeaderOptions },
					'devis/form': { title: editing ? t.devis.editTitle : t.devis.addTitle },
					'devis/[id]/index': { title: t.devis.detailsTitle },
					'facture-client/index': { title: t.facturesClient.listTitle, ...drawerHeaderOptions },
					'facture-client/unpaid': { title: t.facturesClient.unpaidListTitle, ...drawerHeaderOptions },
					'facture-client/form': { title: editing ? t.facturesClient.editTitle : t.facturesClient.addTitle },
					'facture-client/[id]/index': { title: t.facturesClient.detailsTitle },
					'reglements/index': { title: t.reglements.listTitle, ...drawerHeaderOptions },
					'reglements/form': { title: editing ? t.reglements.editTitle : t.reglements.addTitle },
					'reglements/[id]/index': { title: t.reglements.detailsTitle },
					'stock/index': { title: t.stock.listTitle, ...drawerHeaderOptions },
					'stock/form': { title: t.stock.adjustTitle },
					'stock/[id]/index': { title: t.stock.detailTitle },
					'stock/movements/index': { title: t.stock.movementsTitle, ...drawerHeaderOptions },
					'stock/movements/[id]/index': { title: t.stock.movementDetailTitle },
					'stock/receipts/index': { title: t.stock.receiptsTitle, ...drawerHeaderOptions },
					'stock/receipts/form': { title: t.stock.receiptAddTitle },
					'stock/receipts/[id]/index': { title: t.stock.receiptDetailTitle },
					'stock/inventories/index': { title: t.stock.inventoriesTitle, ...drawerHeaderOptions },
					'stock/inventories/form': { title: t.stock.inventoryAddTitle },
					'stock/inventories/[id]/index': { title: t.stock.inventoryDetailTitle },
					'facture-avoir/index': { title: t.facturesAvoir.listTitle, ...drawerHeaderOptions },
					'facture-avoir/form': { title: editing ? t.facturesAvoir.editTitle : t.facturesAvoir.addTitle },
					'facture-avoir/[id]/index': { title: t.facturesAvoir.detailsTitle },
					'facture-pro-forma/index': { title: t.facturesProforma.listTitle, ...drawerHeaderOptions },
					'facture-pro-forma/form': { title: editing ? t.facturesProforma.editTitle : t.facturesProforma.addTitle },
					'facture-pro-forma/[id]/index': { title: t.facturesProforma.detailsTitle },
					'clients/index': { title: t.clients.listTitle, ...drawerHeaderOptions },
					'clients/archived': { title: t.clients.archivedTitle, ...drawerHeaderOptions },
					'clients/form': { title: editing ? t.clients.editTitle : t.clients.addTitle },
					'clients/[id]/index': { title: t.clients.detailsTitle },
					'companies/index': { title: t.companies.listTitle, ...drawerHeaderOptions },
					'companies/form': { title: editing ? t.companies.editTitle : t.companies.addTitle },
					'companies/[id]/index': { title: t.companies.detailsTitle },
					'users/index': { title: t.users.listTitle, ...drawerHeaderOptions },
					'users/form': { title: editing ? t.users.editTitle : t.users.addTitle },
					'users/[id]/index': { title: t.users.detailsTitle },
					'notifications/index': { title: t.navigation.notifications, ...utilityHeaderOptions },
					'settings/index': { title: t.navigation.settings, ...utilityHeaderOptions },
					'settings/edit-profile': { title: t.settings.profileTitle },
					'settings/password': { title: t.settings.passwordTitle },
					'settings/notifications': { title: t.settings.notificationPreferences },
					'settings/monthly-objectives': { title: t.monthlyObjectives.title },
				};
				const options = screens[route.name] ?? {};
				// The shared default also applies to future routes discovered by Expo Router.
				return titleOptions(options.title ?? route.name, {
					...headerOptions,
					animation: reduceMotion ? 'none' : 'slide_from_right',
					contentStyle: { backgroundColor: mode === 'dark' ? colors.night : colors.screenBackground },
					headerBackVisible: true,
					headerBackButtonDisplayMode: 'minimal',
					headerLeft: ({ tintColor, canGoBack }) => (canGoBack ? null : headerLeft({ tintColor })),
					unstable_headerLeftItems: ({ tintColor, canGoBack }) => (canGoBack ? [] : drawerHeaderItems({ tintColor })),
					...options,
				});
			}}
		/>
	);
};

export default DrawerStackLayout;
