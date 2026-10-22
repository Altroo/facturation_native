import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, isValid, parseISO } from 'date-fns';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import Button from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import {
	useGetNotificationsQuery,
	useLazyGetNotificationsQuery,
	useMarkNotificationsReadMutation,
} from '@/store/services/notification';
import { getUnreadNotificationCount } from '@/store/selectors';
import { setUnreadCount } from '@/store/slices/notificationSlice';
import type { NotificationType } from '@/types/notificationTypes';
import { normalizeApiError } from '@/utils/helpers';
import { useAppDispatch, useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { INFINITE_SCROLL_THRESHOLD } from '@/utils/rawData';
import { getNotificationDestination } from '@/utils/routes';
import { colors } from '@/utils/themes';

const NotificationsPage = () => {
	const { t } = useLanguage();
	const { height } = useWindowDimensions();
	const { onError } = useToast();
	const dispatch = useAppDispatch();
	const firstPageQuery = useGetNotificationsQuery({ page: 1 }, { refetchOnMountOrArgChange: true });
	const [allNotifications, setAllNotifications] = useState<NotificationType[]>(
		() => firstPageQuery.data?.results ?? [],
	);
	const [notifPage, setNotifPage] = useState(1);
	const [hasMore, setHasMore] = useState(() => firstPageQuery.data?.next != null);
	const [loadingMore, setLoadingMore] = useState(false);
	const [listError, setListError] = useState<unknown>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const markInProgress = useRef(false);
	const [failedPage, setFailedPage] = useState(1);
	const notificationVersion = useRef(0);
	const unreadCount = useAppSelector(getUnreadNotificationCount);
	const [fetchNotifications, query] = useLazyGetNotificationsQuery();
	const refreshing = firstPageQuery.isFetching || (query.isFetching && query.originalArgs?.page === 1);
	const [markRead, mutation] = useMarkNotificationsReadMutation();
	const [previousFirstPageRequest, setPreviousFirstPageRequest] = useState(firstPageQuery.requestId);
	// Only a completed first-page request replaces pagination. Patching a read
	// flag in the cache must preserve appended pages and the list's scroll position.
	if (firstPageQuery.isSuccess && !firstPageQuery.isFetching && firstPageQuery.requestId !== previousFirstPageRequest) {
		setPreviousFirstPageRequest(firstPageQuery.requestId);
		if (firstPageQuery.data) {
			setAllNotifications(firstPageQuery.data.results);
			setHasMore(firstPageQuery.data.next !== null);
			setNotifPage(1);
			setLoadingMore(false);
			setListError(null);
		}
	}

	useEffect(() => {
		notificationVersion.current += 1;
	}, [previousFirstPageRequest]);
	useEffect(
		() => () => {
			notificationVersion.current += 1;
		},
		[],
	);

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
	const handleLoadMore = async () => {
		if (!hasMore || loadingMore || refreshing || query.isFetching || mutation.isLoading) return;
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
				router.push(destination);
			}
		} catch {
			setActionError(t.common.genericError);
			onError(t.common.genericError);
		} finally {
			markInProgress.current = false;
		}
	};
	const currentListError = listError ?? firstPageQuery.error;
	const axiosError = normalizeApiError(currentListError);
	const listProps = {
		testID: 'notifications-list',
		data: allNotifications,
		style: { flex: 1 },
		contentContainerStyle: { padding: 16, flexGrow: 1 },
		keyExtractor: (item: NotificationType) => String(item.id),
		ItemSeparatorComponent: () => <View className="h-3" />,
		onEndReachedThreshold: INFINITE_SCROLL_THRESHOLD,
		onEndReached: () => {
			if (!currentListError) void handleLoadMore();
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
			!refreshing && !currentListError ? (
				<View className="items-center justify-center gap-4 px-6 py-8" style={{ minHeight: height * 0.32 }}>
					<View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50 dark:bg-slate-800">
						<MaterialIcons name="notifications-none" size={36} color={colors.brand} />
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
			<ActivityIndicator accessibilityLabel={t.common.loading} color={colors.brand} style={{ padding: 16 }} />
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
								color={item.is_read ? colors.slate[500] : colors.brand}
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
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<View className="px-4 pt-2">
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
								<ActivityIndicator size="small" color={colors.brand} />
							) : (
								<MaterialIcons name="done-all" size={18} color={colors.brand} />
							)}
						</View>
						<Text className="font-poppins-medium text-sm text-brand">{t.navigation.markAllRead}</Text>
					</Pressable>
				)}
				{!!actionError && <ApiAlert errorDetails={actionError} />}
				{!!currentListError && (
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
			</View>
			{Platform.OS === 'web' ? <FlatList {...listProps} /> : <FlashList {...listProps} />}
			<BottomNavigation activePage="notifications" />
		</View>
	);
};

export default NotificationsPage;
