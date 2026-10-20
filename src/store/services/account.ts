import { createApi } from '@reduxjs/toolkit/query/react';
import { allowAnyInstance, isAuthenticatedInstance, getDjangoNextPageParam } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type { ApiErrorResponseType, PaginationResponseType } from '@/types/_initTypes';
import type { GroupClass, UserClass } from '@/models/classes';
import type { EditProfilResponse, PasswordResetResponse } from '@/types/accountTypes';
import type { UserWithCompaniesResponseType, UsersQueryParams } from '@/types/usersTypes';

export const accountApi = createApi({
	reducerPath: 'accountApi',
	baseQuery: axiosBaseQuery(() => allowAnyInstance()),
	endpoints: (builder) => ({
		sendPasswordResetCode: builder.mutation<void | ApiErrorResponseType, { email: string }>({
			query: (payload) => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_SEND_PASSWORD_RESET,
				method: 'POST',
				data: payload,
			}),
		}),
		passwordReset: builder.mutation<void | ApiErrorResponseType, { email: string; code: string }>({
			query: (payload) => ({
				url: `${process.env.EXPO_PUBLIC_ACCOUNT_PASSWORD_RESET}${encodeURIComponent(payload.email)}/${encodeURIComponent(payload.code)}/`,
				method: 'GET',
			}),
		}),
		SetPassword: builder.mutation<
			void | ApiErrorResponseType,
			{ email: string; code: string; new_password: string; new_password2: string }
		>({
			query: (payload) => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_PASSWORD_RESET,
				method: 'PUT',
				data: payload,
			}),
		}),
	}),
});

export const groupApi = createApi({
	reducerPath: 'groupApi',
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getGroups: builder.query<GroupClass, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_GROUPS,
				method: 'GET',
			}),
		}),
	}),
});

export const usersApi = createApi({
	reducerPath: 'usersApi',
	tagTypes: ['Users'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getUsersList: builder.query<
			Array<Partial<UserClass>> | PaginationResponseType<Partial<UserClass>>,
			UsersQueryParams
		>({
			query: ({
				with_pagination,
				page,
				pageSize,
				search,
				date_joined_after,
				date_joined_before,
				last_login_after,
				last_login_before,
				...extraFilters
			}) => ({
				url: process.env.EXPO_PUBLIC_USERS_ROOT,
				method: 'GET',
				params: {
					pagination: with_pagination ? true : undefined,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
					search: with_pagination ? search : undefined,
					date_joined_after,
					date_joined_before,
					last_login_after,
					last_login_before,
					...extraFilters,
				},
			}),
			providesTags: ['Users'],
		}),
		getUser: builder.query<UserWithCompaniesResponseType, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_USERS_ROOT}${id}/`,
				method: 'GET',
			}),
			providesTags: ['Users'],
		}),
		checkEmail: builder.mutation<void | ApiErrorResponseType, { email: string }>({
			query: ({ email }) => ({
				// this is using Account app endpoint
				url: process.env.EXPO_PUBLIC_ACCOUNT_CHECK_EMAIL,
				method: 'POST',
				data: { email },
			}),
			invalidatesTags: ['Users'],
		}),
		deleteUser: builder.mutation<void | ApiErrorResponseType, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_USERS_ROOT}${id}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Users']),
		}),
		editUser: builder.mutation<Partial<UserClass>, { id: number; data: Partial<UserWithCompaniesResponseType> }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_USERS_ROOT}${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: ['Users'],
		}),
		addUser: builder.mutation<void, { data: Partial<UserWithCompaniesResponseType> }>({
			query: ({ data }) => ({
				url: process.env.EXPO_PUBLIC_USERS_ROOT,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Users'],
		}),
		bulkDeleteUsers: builder.mutation<void | ApiErrorResponseType, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_USERS_ROOT}bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Users']),
		}),
		getUsersInfiniteList: builder.infiniteQuery<PaginationResponseType<Partial<UserClass>>, UsersQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, lastPageParam) => getDjangoNextPageParam(lastPage.next, lastPageParam),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, ...filters } = queryArg;
				delete filters.with_pagination;
				delete filters.page;
				return {
					url: process.env.EXPO_PUBLIC_USERS_ROOT,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Users'],
		}),
	}),
});

export const profilApi = createApi({
	reducerPath: 'profilApi',
	tagTypes: ['Profil'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getProfil: builder.query<UserClass, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_PROFIL,
				method: 'GET',
			}),
			providesTags: ['Profil'],
		}),
		editProfil: builder.mutation<Partial<UserClass>, EditProfilResponse>({
			query: ({ data }) => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_PROFIL,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: ['Profil'],
		}),
		editPassword: builder.mutation<void | ApiErrorResponseType, PasswordResetResponse>({
			query: ({ data }) => ({
				url: process.env.EXPO_PUBLIC_ACCOUNT_PASSWORD_CHANGE,
				method: 'PUT',
				data,
			}),
			invalidatesTags: ['Profil'],
		}),
	}),
});

export const { useSendPasswordResetCodeMutation, usePasswordResetMutation, useSetPasswordMutation } = accountApi;
export const { useGetProfilQuery, useEditProfilMutation, useEditPasswordMutation } = profilApi;
export const { useGetGroupsQuery } = groupApi;
export const {
	useGetUsersListQuery,
	useDeleteUserMutation,
	useEditUserMutation,
	useGetUserQuery,
	useAddUserMutation,
	useCheckEmailMutation,
	useBulkDeleteUsersMutation,
	useGetUsersInfiniteListInfiniteQuery,
} = usersApi;
