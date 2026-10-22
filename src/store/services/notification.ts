import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance } from '@/utils/helpers';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { NotificationType, NotificationPreferenceType } from '@/types/notificationTypes';
import type { RootState } from '@/store/store';

export const notificationApi = createApi({
	reducerPath: 'notificationApi',
	tagTypes: ['Notification', 'NotificationPreference'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getNotifications: builder.query<PaginationResponseType<NotificationType>, { page?: number }>({
			query: ({ page } = {}) => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATIONS,
				method: 'GET',
				params: { page: page ?? 1 },
			}),
			providesTags: ['Notification'],
		}),

		getNotificationPreferences: builder.query<NotificationPreferenceType, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATION_PREFERENCES,
				method: 'GET',
			}),
			providesTags: ['NotificationPreference'],
		}),

		updateNotificationPreferences: builder.mutation<NotificationPreferenceType, Partial<NotificationPreferenceType>>({
			query: (data) => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATION_PREFERENCES,
				method: 'PUT',
				data,
			}),
			invalidatesTags: ['NotificationPreference'],
		}),

		markNotificationsRead: builder.mutation<{ updated: number }, { ids?: number[] }>({
			query: (data) => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATION_MARK_READ,
				method: 'POST',
				data,
			}),
			// Acknowledging does not change page membership. Update read flags in
			// every cached page after success instead of downloading the list again.
			async onQueryStarted({ ids }, { dispatch, getState, queryFulfilled }) {
				const result = await queryFulfilled.catch(() => null);
				if (!result) return; // The screen displays the request error; keep cached flags unchanged.
				const pages = notificationApi.util.selectCachedArgsForQuery(getState() as RootState, 'getNotifications');
				for (const args of pages) {
					dispatch(
						notificationApi.util.updateQueryData('getNotifications', args, (page) => {
							for (const notification of page.results) {
								if (!ids?.length || ids.includes(notification.id)) notification.is_read = true;
							}
						}),
					);
				}
			},
			invalidatesTags: (result) => (result ? [{ type: 'Notification', id: 'UNREAD_COUNT' }] : []),
		}),

		getUnreadNotificationCount: builder.query<{ count: number }, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATION_UNREAD_COUNT,
				method: 'GET',
			}),
			providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
		}),
	}),
});

export const {
	useGetNotificationsQuery,
	useLazyGetNotificationsQuery,
	useGetNotificationPreferencesQuery,
	useUpdateNotificationPreferencesMutation,
	useMarkNotificationsReadMutation,
	useGetUnreadNotificationCountQuery,
} = notificationApi;
