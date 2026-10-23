import { useGetUnreadNotificationCountQuery } from '@/store/services/notification';
import { setUnreadCount } from '@/store/slices/notificationSlice';
import { useColorMode } from '@/providers/themeProvider';
import { colors, fonts } from '@/utils/themes';
import {
	DASHBOARD,
	DEVIS_LIST,
	COMPANIES_LIST,
	COMPANIES_ADD,
	USERS_LIST,
	USERS_ADD,
	ARTICLES_LIST,
	ARTICLES_ARCHIVED,
	CLIENTS_LIST,
	CLIENTS_ARCHIVED,
	BACKEND_SITE_ADMIN,
	DASHBOARD_EDIT_PROFILE,
} from '@/utils/routes';
import { getProfilState } from '@/store/selectors';
import { useEffect, useEffectEvent, useState } from 'react';
import { Text, Image, Platform, Pressable, View } from 'react-native';
import { openURL } from 'expo-linking';
import {
	AndroidImportance,
	getPermissionsAsync,
	requestPermissionsAsync,
	setNotificationChannelAsync,
} from 'expo-notifications';
import { router, useGlobalSearchParams, usePathname, type NativeStackNavigationOptions } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage, useAppDispatch, useAppSelector, useToast } from '@/utils/hooks';
import { accountLogoutAction } from '@/store/actions/accountActions';
import Button from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import type { TranslationDictionary } from '@/types/languageTypes';
import ThemeToggle from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';

export const useNavigationHeader = () => {
	const { mode } = useColorMode();
	const headerRight = () => (
		<View className="flex-row items-center gap-1">
			<ThemeToggle />
			<LanguageSwitcher />
		</View>
	);
	return {
		headerStyle: { backgroundColor: mode === 'dark' ? colors.panel : colors.white },
		headerTintColor: mode === 'dark' ? colors.white : colors.ink,
		headerTitleAlign: 'left' as const,
		headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 15 },
		headerRight,
		// The iOS native stack consumes this callback; headerRight is the fallback.
		unstable_headerRightItems: () => [{ type: 'custom' as const, element: headerRight(), hidesSharedBackground: true }],
	} satisfies NativeStackNavigationOptions;
};

const getNavigationMenu = (isStaff: boolean, t: TranslationDictionary) => {
	return {
		dashboard: {
			title: t.navigation.dashboard,
			icon: <MaterialIcons name="dashboard" size={21} color={colors.slate[500]} />,
			items: [{ title: t.navigation.dashboard, label: t.navigation.viewDashboard, path: DASHBOARD }],
		},
		articles: {
			title: t.navigation.articles,
			icon: <MaterialIcons name="library-books" size={21} color={colors.slate[500]} />,
			items: [
				{ title: t.navigation.articlesList, label: t.navigation.articlesList, path: ARTICLES_LIST },
				{ title: t.navigation.articlesArchived, label: t.navigation.articlesArchived, path: ARTICLES_ARCHIVED },
			],
		},
		clients: {
			title: t.navigation.clients,
			icon: <MaterialIcons name="people" size={21} color={colors.slate[500]} />,
			items: [
				{ title: t.navigation.clientsList, label: t.navigation.clientsList, path: CLIENTS_LIST },
				{ title: t.navigation.clientsArchived, label: t.navigation.clientsArchived, path: CLIENTS_ARCHIVED },
			],
		},
		devis: {
			title: t.navigation.devis,
			icon: <MaterialIcons name="request-quote" size={21} color={colors.slate[500]} />,
			items: [{ title: t.navigation.devisList, label: t.navigation.devisList, path: DEVIS_LIST }],
		},
		factures_proformat: {
			title: t.navigation.facturesProforma,
			icon: <MaterialIcons name="receipt-long" size={21} color={colors.slate[500]} />,
			items: [
				{
					title: t.navigation.facturesProformaList,
					label: t.navigation.facturesProformaList,
					path: undefined,
				},
			],
		},
		factures: {
			title: t.navigation.facturesClient,
			icon: <MaterialIcons name="receipt-long" size={21} color={colors.slate[500]} />,
			items: [
				{ title: t.navigation.facturesClientList, label: t.navigation.facturesClientList, path: undefined },
				{ title: t.navigation.facturesImpayees, label: t.navigation.facturesImpayees, path: undefined },
			],
		},
		facturesAvoir: {
			title: t.navigation.facturesAvoir,
			icon: <MaterialIcons name="credit-score" size={21} color={colors.slate[500]} />,
			items: [{ title: t.navigation.facturesAvoirList, label: t.navigation.facturesAvoirList, path: undefined }],
		},
		bonsLivraison: {
			title: t.navigation.bonsLivraison,
			icon: <MaterialIcons name="local-shipping" size={21} color={colors.slate[500]} />,
			items: [
				{ title: t.navigation.bonsLivraisonList, label: t.navigation.bonsLivraisonList, path: undefined },
				{
					title: t.navigation.bonsLivraisonUninvoiced,
					label: t.navigation.bonsLivraisonUninvoiced,
					path: undefined,
				},
			],
		},
		logistique: {
			title: t.navigation.logistique,
			icon: <MaterialIcons name="warehouse" size={21} color={colors.slate[500]} />,
			items: [
				{
					title: t.navigation.logistiqueDashboard,
					label: t.navigation.logistiqueDashboard,
					path: undefined,
				},
				{ title: t.navigation.logistiqueList, label: t.navigation.logistiqueList, path: undefined },
				{
					title: t.navigation.logistiqueSuppliers,
					label: t.navigation.logistiqueSuppliers,
					path: undefined,
				},
			],
		},
		stock: {
			title: t.navigation.stock,
			icon: <MaterialIcons name="inventory-2" size={21} color={colors.slate[500]} />,
			items: [
				{ title: t.navigation.stockState, label: t.navigation.stockState, path: undefined },
				{ title: t.navigation.stockMovements, label: t.navigation.stockMovements, path: undefined },
				{ title: t.navigation.stockReceipts, label: t.navigation.stockReceipts, path: undefined },
				{ title: t.navigation.stockInventories, label: t.navigation.stockInventories, path: undefined },
			],
		},
		reglement: {
			title: t.navigation.reglement,
			icon: <MaterialIcons name="payments" size={21} color={colors.slate[500]} />,
			items: [{ title: t.navigation.reglementsList, label: t.navigation.reglementsList, path: undefined }],
		},
		...(isStaff && {
			societe: {
				title: t.navigation.companies,
				icon: <MaterialIcons name="business" size={21} color={colors.slate[500]} />,
				items: [
					{ title: t.navigation.companiesList, label: t.navigation.companiesList, path: COMPANIES_LIST },
					{ title: t.navigation.newCompany, label: t.navigation.newCompany, path: COMPANIES_ADD },
				],
			},
			utilisateurs: {
				title: t.navigation.users,
				icon: <MaterialIcons name="people" size={21} color={colors.slate[500]} />,
				items: [
					{ title: t.navigation.usersList, label: t.navigation.usersList, path: USERS_LIST },
					{ title: t.navigation.newUser, label: t.navigation.newUser, path: USERS_ADD },
				],
			},
		}),
		// Settings now opens from the bottom navigation. Keep the drawer section for reference.
		// parametres: {
		// 	title: t.navigation.settings,
		// 	icon: <MaterialIcons name="settings" size={21} color={colors.slate[500]} />,
		// 	items: [
		// 		{ title: t.navigation.myProfile, label: t.navigation.myProfile, path: DASHBOARD_EDIT_PROFILE },
		// 		{ title: t.navigation.changePassword, label: t.navigation.changePassword, path: DASHBOARD_PASSWORD },
		// 		{
		// 			title: t.navigation.notifications,
		// 			label: t.navigation.notificationPreferences,
		// 			path: DASHBOARD_NOTIFICATIONS,
		// 		},
		// 		...(isStaff
		// 			? [
		// 					{
		// 						title: t.navigation.monthlyObjectives,
		// 						label: t.navigation.configureMonthlyObjectives,
		// 						path: undefined,
		// 					},
		// 				]
		// 			: []),
		// 	],
		// },
	};
};

export const NavigationDrawer = (props: DrawerContentComponentProps) => {
	const { t } = useLanguage();
	const { onError } = useToast();
	const { mode: theme } = useColorMode();
	const { avatar_cropped, first_name, last_name, gender, is_staff, email } = useAppSelector(getProfilState);
	const navigationMenu = getNavigationMenu(is_staff, t);
	const dispatch = useAppDispatch();
	const pathname = usePathname();
	const params = useGlobalSearchParams<{ id?: string | string[] }>();
	// Separate user override from derived default
	const [userExpanded, setUserExpanded] = useState<string | false | null>(null);

	// Derive default expanded panel from pathname + navigationMenu
	const defaultExpanded: string | false = (() => {
		const exactMatch = Object.entries(navigationMenu).find(([, section]) =>
			section.items.some((item) => {
				const normalizedPath = item.path?.replace(/^https?:\/\/[^/]+/, '');
				return normalizedPath === pathname;
			}),
		);

		if (exactMatch) {
			return `panel-${exactMatch[0]}`;
		}

		let bestMatch: string | null = null;
		let longestMatchLength = 0;

		Object.entries(navigationMenu).forEach(([key, section]) => {
			section.items.forEach((item) => {
				const normalizedPath = item.path?.replace(/^https?:\/\/[^/]+/, '');

				if (!normalizedPath) return;

				// Check if the current pathname starts with this menu item's path
				// This handles /companies/4 matching /companies
				const pathSegments = normalizedPath.split('/').filter(Boolean);
				const currentSegments = pathname.split('/').filter(Boolean);

				// Count how many segments match from the start
				let matchCount = 0;
				for (let i = 0; i < Math.min(pathSegments.length, currentSegments.length); i++) {
					if (pathSegments[i] === currentSegments[i]) {
						matchCount++;
					} else {
						break;
					}
				}

				// Keep track of the best match (longest common path)
				if (matchCount > longestMatchLength && matchCount > 0) {
					longestMatchLength = matchCount;
					bestMatch = key;
				}
			});
		});

		return bestMatch ? `panel-${bestMatch}` : false;
	})();

	// Final expanded value: user override wins, else default
	const expanded = userExpanded !== null ? userExpanded : defaultExpanded;

	const handleChange = (panel: string) => () => {
		setUserExpanded(expanded === panel ? false : panel);
	};
	const logOutHandler = () => {
		dispatch(accountLogoutAction());
	};
	const administrationHandler = async () => {
		props.navigation.closeDrawer();
		try {
			await openURL(BACKEND_SITE_ADMIN);
		} catch {
			onError(t.common.genericError);
		}
	};
	const ink = theme === 'dark' ? colors.slate[300] : colors.slate[600];
	const name = [first_name, last_name].filter(Boolean).join(' ') || email || '';
	const welcome =
		gender === 'Femme'
			? t.navigation.welcomeFemale
			: gender === 'Homme'
				? t.navigation.welcomeMale
				: t.navigation.welcomeNeutral;
	return (
		<DrawerContentScrollView
			{...props}
			style={{ backgroundColor: theme === 'dark' ? colors.night : colors.white }}
			contentContainerStyle={{ paddingBottom: 28 }}
		>
			<View className="gap-4 border-b border-slate-200 px-5 pb-6 pt-3 dark:border-slate-700">
				<View className="flex-row items-center gap-4">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.navigation.myProfile}
						onPress={() => {
							props.navigation.closeDrawer();
							router.navigate(DASHBOARD_EDIT_PROFILE);
						}}
						className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-50 dark:bg-panel"
					>
						{typeof avatar_cropped === 'string' && avatar_cropped ? (
							<Image source={{ uri: avatar_cropped }} className="h-16 w-16" />
						) : (
							<Text className="dark:text-slate-100 font-poppins-semibold text-2xl text-brand">
								{name.slice(0, 1).toUpperCase()}
							</Text>
						)}
					</Pressable>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-sans dark:text-slate-100 text-sm text-slate-500">{welcome}</Text>
						<Text numberOfLines={2} className="text-ink dark:text-slate-100 font-poppins-semibold text-xl">
							{name}
						</Text>
					</View>
				</View>
			</View>
			<View className="px-3 py-4">
				{Object.entries(navigationMenu).map(([key, section]) => (
					<View key={key}>
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: expanded === `panel-${key}` }}
							onPress={handleChange(`panel-${key}`)}
							className="min-h-12 flex-row items-center gap-3 rounded-xl px-3 py-3"
						>
							{section.icon}
							<Text className="text-ink dark:text-slate-100 flex-1 font-poppins-medium text-sm">{section.title}</Text>
							<MaterialIcons name={expanded === `panel-${key}` ? 'expand-less' : 'expand-more'} size={20} color={ink} />
						</Pressable>
						{expanded === `panel-${key}` &&
							section.items.map((item, idx) => {
								const href = item.path;
								const isCreate = href === USERS_ADD || href === COMPANIES_ADD;
								const active = !!href && pathname === href && (!isCreate || params.id === undefined);
								return (
									<Pressable
										key={idx}
										accessibilityRole="button"
										disabled={!href}
										accessibilityState={{ disabled: !href, selected: active }}
										accessibilityHint={!href ? t.mobile.unavailableRoute : undefined}
										onPress={() => {
											if (href) {
												props.navigation.closeDrawer();
												if (isCreate) router.push(href);
												else router.navigate(href);
											}
										}}
										className={
											'ml-8 min-h-11 justify-center rounded-lg px-3 py-3 ' +
											(active ? 'bg-blue-50 dark:bg-panel ' : '') +
											(!href ? 'opacity-40' : '')
										}
									>
										<Text
											className={
												'text-xs ' +
												(active
													? 'font-poppins-medium text-brand dark:text-blue-300'
													: 'font-sans text-ink dark:text-slate-100')
											}
										>
											{item.label}
										</Text>
									</Pressable>
								);
							})}
					</View>
				))}
				<Pressable
					disabled
					accessibilityRole="button"
					accessibilityState={{ disabled: true }}
					className="min-h-12 flex-row items-center gap-3 px-3 opacity-40"
				>
					<MaterialIcons name="new-releases" size={21} color={ink} />
					<Text className="font-sans text-ink dark:text-slate-100 text-sm">{t.navigation.changelog}</Text>
				</Pressable>
				<View className="mt-4 gap-4 border-t border-slate-200 px-3 pt-5 dark:border-slate-700">
					{is_staff && (
						<Button
							buttonText={t.navigation.administration}
							inverted
							onClick={() => void administrationHandler()}
							active
							loading={false}
							startIcon={<MaterialIcons name="business" size={20} color={colors.brand} />}
						/>
					)}
					<Button buttonText={t.navigation.logout} inverted onClick={logOutHandler} active loading={false} />
				</View>
			</View>
		</DrawerContentScrollView>
	);
};

export const NotificationStatus = () => {
	const { t } = useLanguage();
	const { onError } = useToast();
	const onPermissionError = useEffectEvent(() => onError(t.settings.notificationUpdateError));
	useEffect(() => {
		let mounted = true;
		const requestPermission = async () => {
			try {
				if (Platform.OS === 'web') {
					if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
						await Notification.requestPermission();
					}
					return;
				}
				if (Platform.OS === 'android') {
					await setNotificationChannelAsync('facturation', {
						name: 'E.B.H Facturation',
						importance: AndroidImportance.DEFAULT,
					});
				}
				const permission = await getPermissionsAsync();
				if (mounted && permission.status === 'undetermined') await requestPermissionsAsync();
			} catch {
				if (mounted) onPermissionError();
			}
		};
		void requestPermission();
		return () => {
			mounted = false;
		};
	}, []);
	const dispatch = useAppDispatch();
	const unread = useGetUnreadNotificationCountQuery(undefined, { pollingInterval: 30000 });
	useEffect(() => {
		if (unread.data) dispatch(setUnreadCount(unread.data.count));
	}, [unread.data, dispatch]);
	return null;
};
