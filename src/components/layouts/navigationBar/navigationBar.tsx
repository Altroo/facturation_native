import { FlashList } from '@shopify/flash-list';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import { format, isValid, parseISO } from 'date-fns';
import {
	useGetUnreadNotificationCountQuery,
	useGetNotificationsQuery,
	useLazyGetNotificationsQuery,
	useMarkNotificationsReadMutation,
} from '@/store/services/notification';
import { setUnreadCount } from '@/store/slices/notificationSlice';
import { normalizeApiError } from '@/utils/helpers';
import type { NotificationType } from '@/types/notificationTypes';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';
import {
	COMPANIES_VIEW,
	COMPANIES_EDIT,
	USERS_VIEW,
	USERS_EDIT,
	DASHBOARD,
	COMPANIES_LIST,
	COMPANIES_ADD,
	USERS_LIST,
	USERS_ADD,
	CLIENTS_LIST,
	CLIENTS_ARCHIVED,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_PASSWORD,
	DASHBOARD_NOTIFICATIONS,
	BACKEND_SITE_ADMIN,
} from '@/utils/routes';
import { getProfilState, getUnreadNotificationCount } from '@/store/selectors';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Text,
	Image,
	Platform,
	Pressable,
	FlatList,
	View,
	useWindowDimensions,
	type ColorValue,
} from 'react-native';
import { openURL } from 'expo-linking';
import {
	AndroidImportance,
	getPermissionsAsync,
	requestPermissionsAsync,
	setNotificationChannelAsync,
} from 'expo-notifications';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { DrawerContentScrollView, type DrawerContentComponentProps } from 'expo-router/drawer';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage, useAppDispatch, useAppSelector, useToast } from '@/utils/hooks';
import { accountLogoutAction } from '@/store/actions/accountActions';
import Button from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import type { TranslationDictionary } from '@/types/languageTypes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemeToggle from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';

type NavigationHeaderTitleProps = {
	children: string;
	tintColor?: ColorValue;
};

export const useNavigationHeader = () => {
	const { mode } = useColorMode();
	const [controlsWidth, setControlsWidth] = useState(180);
	const { width } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	return {
		headerStyle: { backgroundColor: mode === 'dark' ? colors.panel : colors.white },
		headerTintColor: mode === 'dark' ? colors.white : colors.ink,
		headerTitleAlign: 'left' as const,
		headerTitle: ({ children, tintColor }: NavigationHeaderTitleProps) => (
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
	};
};

const getNavigationMenu = (isStaff: boolean, t: TranslationDictionary) => {
	return {
		dashboard: {
			title: t.navigation.dashboard,
			icon: <MaterialIcons name="dashboard" size={21} color="#64748b" />,
			items: [{ title: t.navigation.dashboard, label: t.navigation.viewDashboard, path: DASHBOARD }],
		},
		articles: {
			title: t.navigation.articles,
			icon: <MaterialIcons name="library-books" size={21} color="#64748b" />,
			items: [
				{ title: t.navigation.articlesList, label: t.navigation.articlesList, path: undefined },
				{ title: t.navigation.articlesArchived, label: t.navigation.articlesArchived, path: undefined },
			],
		},
		clients: {
			title: t.navigation.clients,
			icon: <MaterialIcons name="people" size={21} color="#64748b" />,
			items: [
				{ title: t.navigation.clientsList, label: t.navigation.clientsList, path: CLIENTS_LIST },
				{ title: t.navigation.clientsArchived, label: t.navigation.clientsArchived, path: CLIENTS_ARCHIVED },
			],
		},
		devis: {
			title: t.navigation.devis,
			icon: <MaterialIcons name="request-quote" size={21} color="#64748b" />,
			items: [{ title: t.navigation.devisList, label: t.navigation.devisList, path: undefined }],
		},
		factures_proformat: {
			title: t.navigation.facturesProforma,
			icon: <MaterialIcons name="receipt-long" size={21} color="#64748b" />,
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
			icon: <MaterialIcons name="receipt-long" size={21} color="#64748b" />,
			items: [
				{ title: t.navigation.facturesClientList, label: t.navigation.facturesClientList, path: undefined },
				{ title: t.navigation.facturesImpayees, label: t.navigation.facturesImpayees, path: undefined },
			],
		},
		facturesAvoir: {
			title: t.navigation.facturesAvoir,
			icon: <MaterialIcons name="credit-score" size={21} color="#64748b" />,
			items: [{ title: t.navigation.facturesAvoirList, label: t.navigation.facturesAvoirList, path: undefined }],
		},
		bonsLivraison: {
			title: t.navigation.bonsLivraison,
			icon: <MaterialIcons name="local-shipping" size={21} color="#64748b" />,
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
			icon: <MaterialIcons name="warehouse" size={21} color="#64748b" />,
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
			icon: <MaterialIcons name="inventory-2" size={21} color="#64748b" />,
			items: [
				{ title: t.navigation.stockState, label: t.navigation.stockState, path: undefined },
				{ title: t.navigation.stockMovements, label: t.navigation.stockMovements, path: undefined },
				{ title: t.navigation.stockReceipts, label: t.navigation.stockReceipts, path: undefined },
				{ title: t.navigation.stockInventories, label: t.navigation.stockInventories, path: undefined },
			],
		},
		reglement: {
			title: t.navigation.reglement,
			icon: <MaterialIcons name="payments" size={21} color="#64748b" />,
			items: [{ title: t.navigation.reglementsList, label: t.navigation.reglementsList, path: undefined }],
		},
		...(isStaff && {
			societe: {
				title: t.navigation.companies,
				icon: <MaterialIcons name="business" size={21} color="#64748b" />,
				items: [
					{ title: t.navigation.companiesList, label: t.navigation.companiesList, path: COMPANIES_LIST },
					{ title: t.navigation.newCompany, label: t.navigation.newCompany, path: COMPANIES_ADD },
				],
			},
			utilisateurs: {
				title: t.navigation.users,
				icon: <MaterialIcons name="people" size={21} color="#64748b" />,
				items: [
					{ title: t.navigation.usersList, label: t.navigation.usersList, path: USERS_LIST },
					{ title: t.navigation.newUser, label: t.navigation.newUser, path: USERS_ADD },
				],
			},
		}),
		parametres: {
			title: t.navigation.settings,
			icon: <MaterialIcons name="settings" size={21} color="#64748b" />,
			items: [
				{ title: t.navigation.myProfile, label: t.navigation.myProfile, path: DASHBOARD_EDIT_PROFILE },
				{ title: t.navigation.changePassword, label: t.navigation.changePassword, path: DASHBOARD_PASSWORD },
				{
					title: t.navigation.notifications,
					label: t.navigation.notificationPreferences,
					path: DASHBOARD_NOTIFICATIONS,
				},
				...(isStaff
					? [
							{
								title: t.navigation.monthlyObjectives,
								label: t.navigation.configureMonthlyObjectives,
								path: undefined,
							},
						]
					: []),
			],
		},
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
	const ink = theme === 'dark' ? '#cbd5e1' : '#475569';
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
							startIcon={<MaterialIcons name="business" size={20} color="#0274d7" />}
						/>
					)}
					<Button buttonText={t.navigation.logout} inverted onClick={logOutHandler} active loading={false} />
				</View>
			</View>
		</DrawerContentScrollView>
	);
};

export const getNotificationDestination = (target?: string) => {
	if (!target || !/^\/dashboard(?:[/?]|$)/.test(target)) return null;
	const path = target.split('?')[0].replace(/\/$/, '');
	if (path === '/dashboard') return DASHBOARD;
	if (path === '/dashboard/companies') return COMPANIES_LIST;
	if (path === '/dashboard/companies/new') return COMPANIES_ADD;
	if (path === '/dashboard/clients') return CLIENTS_LIST;
	if (path === '/dashboard/clients/archived') return CLIENTS_ARCHIVED;
	if (path === '/dashboard/users') return USERS_LIST;
	if (path === '/dashboard/users/new') return USERS_ADD;
	if (path === '/dashboard/settings/edit-profile') return DASHBOARD_EDIT_PROFILE;
	if (path === '/dashboard/settings/password') return DASHBOARD_PASSWORD;
	if (path === '/dashboard/settings/notifications') return DASHBOARD_NOTIFICATIONS;
	const match = /^\/dashboard\/(companies|users)\/([1-9]\d*)(\/edit)?$/.exec(path);
	if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
	const id = Number(match[2]);
	return match[1] === 'companies'
		? match[3]
			? COMPANIES_EDIT(id)
			: COMPANIES_VIEW(id)
		: match[3]
			? USERS_EDIT(id)
			: USERS_VIEW(id);
};

export const Notifications = () => {
	const { t } = useLanguage();
	const { mode: theme } = useColorMode();
	const { height } = useWindowDimensions();
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
	const [open, setOpen] = useState(false);
	const [allNotifications, setAllNotifications] = useState<NotificationType[]>([]);
	const [notifPage, setNotifPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [listError, setListError] = useState<unknown>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const markInProgress = useRef(false);
	const [failedPage, setFailedPage] = useState(1);
	const notificationVersion = useRef(0);
	const unreadCount = useAppSelector(getUnreadNotificationCount);
	const unread = useGetUnreadNotificationCountQuery(undefined, { pollingInterval: 30000 });
	const firstPageQuery = useGetNotificationsQuery({ page: 1 }, { skip: !open });
	const [fetchNotifications, query] = useLazyGetNotificationsQuery();
	const refreshing = firstPageQuery.isFetching || (query.isFetching && query.originalArgs?.page === 1);
	const [markRead, mutation] = useMarkNotificationsReadMutation();
	const [previousFirstPage, setPreviousFirstPage] = useState(firstPageQuery.data);
	// Reset paginated UI before rendering a replacement cache response.
	if (firstPageQuery.data !== previousFirstPage) {
		setPreviousFirstPage(firstPageQuery.data);
		if (firstPageQuery.data) {
			setAllNotifications(firstPageQuery.data.results);
			setHasMore(firstPageQuery.data.next !== null);
			setNotifPage(1);
			setLoadingMore(false);
			setListError(null);
		}
	}

	useEffect(() => {
		if (unread.data) dispatch(setUnreadCount(unread.data.count));
	}, [unread.data, dispatch]);

	useEffect(() => {
		notificationVersion.current += 1;
	}, [firstPageQuery.data]);

	const refreshFirstNotificationsPage = async () => {
		const version = ++notificationVersion.current;
		setLoadingMore(false);
		setListError(null);
		try {
			const result = await fetchNotifications({ page: 1 }, false).unwrap();
			if (version !== notificationVersion.current) return;
			setAllNotifications(result.results);
			setHasMore(result.next !== null);
			setNotifPage(1);
		} catch (error) {
			if (version !== notificationVersion.current) return;
			setFailedPage(1);
			setListError(error);
		}
	};
	const handleNotifClose = () => {
		notificationVersion.current += 1;
		setLoadingMore(false);
		setOpen(false);
	};
	const handleLoadMore = async () => {
		if (!open || !hasMore || loadingMore || refreshing || query.isFetching || mutation.isLoading) return;
		const version = notificationVersion.current;
		const nextPage = notifPage + 1;
		setLoadingMore(true);
		setListError(null);
		try {
			const result = await fetchNotifications({ page: nextPage }, false).unwrap();
			if (version !== notificationVersion.current) return;
			setAllNotifications((previous) => [
				...new Map([...previous, ...result.results].map((item) => [item.id, item])).values(),
			]);
			setHasMore(result.next !== null);
			setNotifPage(nextPage);
		} catch (error) {
			if (version !== notificationVersion.current) return;
			setFailedPage(nextPage);
			setListError(error);
		} finally {
			if (version === notificationVersion.current) setLoadingMore(false);
		}
	};
	const handleNotifOpen = () => {
		setActionError(null);
		setOpen(true);
		void refreshFirstNotificationsPage();
	};
	const handleMarkAllRead = async () => {
		if (markInProgress.current) return;
		markInProgress.current = true;
		setActionError(null);
		try {
			await markRead({}).unwrap();
			dispatch(setUnreadCount(0));
			setAllNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
		} catch {
			setActionError(t.common.genericError);
			onError(t.common.genericError);
		} finally {
			markInProgress.current = false;
		}
	};
	const handleNotificationClick = async (notification: NotificationType) => {
		if (markInProgress.current) return;
		markInProgress.current = true;
		setActionError(null);
		try {
			if (!notification.is_read) {
				await markRead({ ids: [notification.id] }).unwrap();
				dispatch(setUnreadCount(Math.max(unreadCount - 1, 0)));
				setAllNotifications((previous) =>
					previous.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item)),
				);
			}
			const destination = getNotificationDestination(notification.target_url);
			if (destination) {
				handleNotifClose();
				router.push(destination);
			}
		} catch {
			setActionError(t.common.genericError);
			onError(t.common.genericError);
		} finally {
			markInProgress.current = false;
		}
	};
	const axiosError = normalizeApiError(listError);
	const listProps = {
		testID: 'notifications-list',
		data: allNotifications,
		keyExtractor: (item: NotificationType) => String(item.id),
		ItemSeparatorComponent: () => <View className="h-3" />,
		onEndReachedThreshold: 0.3,
		onEndReached: () => {
			if (!listError) void handleLoadMore();
		},
		refreshing,
		onRefresh: () => {
			if (!refreshing && !loadingMore && !mutation.isLoading) void refreshFirstNotificationsPage();
		},
		ListHeaderComponent:
			refreshing && !allNotifications.length ? (
				<Text className="font-sans text-ink dark:text-slate-100">{t.common.loading}</Text>
			) : undefined,
		ListEmptyComponent:
			!refreshing && !listError ? (
				<View className="items-center justify-center gap-4 px-6 py-8" style={{ minHeight: height * 0.32 }}>
					<View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-slate-800">
						<MaterialIcons name="notifications-none" size={36} color="#0274d7" />
						<View
							className="absolute right-0 top-0 h-4 w-4 rounded-full border-4 border-white bg-blue-200
						dark:border-panel dark:bg-blue-900"
						/>
					</View>
					<Text className="text-center font-poppins-medium text-base text-slate-500 dark:text-slate-300">
						{t.navigation.noNotifications}
					</Text>
				</View>
			) : undefined,
		ListFooterComponent: loadingMore ? (
			<ActivityIndicator accessibilityLabel={t.common.loading} color="#0274d7" style={{ padding: 16 }} />
		) : undefined,
		renderItem: ({ item }: { item: NotificationType }) => {
			const date = parseISO(item.date_created);
			return (
				<Pressable
					accessibilityRole="button"
					disabled={
						mutation.isLoading ||
						refreshing ||
						loadingMore ||
						(item.is_read && !getNotificationDestination(item.target_url))
					}
					onPress={() => void handleNotificationClick(item)}
				>
					<View
						className={
							'gap-3 rounded-2xl border p-4 ' +
							(item.is_read
								? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-panel'
								: 'border-blue-100 bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800')
						}
					>
						<View className="flex-row items-start gap-3">
							<MaterialIcons
								name={item.is_read ? 'notifications-none' : 'notifications-active'}
								size={22}
								color={item.is_read ? '#64748b' : '#0274d7'}
							/>
							<View className="flex-1 gap-1">
								<Text className="text-ink dark:text-slate-100 font-poppins-semibold">{item.title}</Text>
								<Text className="font-sans text-sm leading-5 text-slate-600 dark:text-slate-300">{item.message}</Text>
								<Text className="font-sans text-xs text-slate-400 dark:text-slate-400">
									{isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : ''}
								</Text>
							</View>
						</View>
					</View>
				</Pressable>
			);
		},
	};
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t.navigation.notifications}
				onPress={handleNotifOpen}
				className="h-10 w-10 items-center justify-center rounded-full"
			>
				<MaterialIcons name="notifications-none" size={23} color={theme === 'dark' ? '#e2e8f0' : '#334155'} />
				{unreadCount > 0 && (
					<View className="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1">
						<Text className="font-sans text-center text-[10px] text-white">
							{unreadCount > 99 ? '99+' : unreadCount}
						</Text>
					</View>
				)}
			</Pressable>
			<BottomSheet
				visible={open}
				title={t.navigation.notifications}
				titleIcon={
					<View className="h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-slate-800">
						<MaterialIcons name="notifications" size={24} color="#0274d7" />
					</View>
				}
				onClose={handleNotifClose}
				onDismiss={handleNotifClose}
				testID="notifications-sheet"
				style={{ minHeight: height * 0.5, maxHeight: height * 0.75 }}
			>
				{unreadCount > 0 && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.navigation.markAllRead}
						accessibilityState={{ busy: mutation.isLoading, disabled: mutation.isLoading || refreshing || loadingMore }}
						disabled={mutation.isLoading || refreshing || loadingMore}
						onPress={() => void handleMarkAllRead()}
						className="min-h-11 flex-row items-center justify-end gap-2 self-end rounded-lg px-2 py-2
						active:bg-blue-50 dark:active:bg-slate-800"
					>
						<View className="h-5 w-5 items-center justify-center">
							{mutation.isLoading ? (
								<ActivityIndicator size="small" color="#0274d7" />
							) : (
								<MaterialIcons name="done-all" size={18} color="#0274d7" />
							)}
						</View>
						<Text className="font-poppins-medium text-sm text-brand">{t.navigation.markAllRead}</Text>
					</Pressable>
				)}
				{!!actionError && <ApiAlert errorDetails={actionError} />}
				{!!listError && (
					<>
						<ApiAlert
							errorDetails={
								axiosError.status_code === 0
									? t.errors.networkError
									: axiosError.status_code === 403
										? t.noPermission.description
										: axiosError.status_code === 404
											? t.notFound.message
											: axiosError.message
							}
						/>
						<Button
							buttonText={t.common.retry}
							inverted
							onClick={() => void (failedPage === 1 ? refreshFirstNotificationsPage() : handleLoadMore())}
							active={!(refreshing || loadingMore)}
							loading={false}
						/>
					</>
				)}
				<View style={{ height: height * 0.45, flexShrink: 1 }}>
					{Platform.OS === 'web' ? <FlatList {...listProps} /> : <FlashList {...listProps} />}
				</View>
			</BottomSheet>
		</>
	);
};
