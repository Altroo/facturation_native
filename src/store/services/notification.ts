import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance } from '@/utils/helpers';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { NotificationType, NotificationPreferenceType } from '@/types/facturationTypes';

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
			invalidatesTags: ['Notification'],
		}),

		getUnreadNotificationCount: builder.query<{ count: number }, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_FACTURATION_NOTIFICATION_UNREAD_COUNT,
				method: 'GET',
			}),
			providesTags: ['Notification'],
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
