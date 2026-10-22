import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { ClientClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { ClientHistoryResponseType, ClientsQueryParams } from '@/types/clientTypes';

export const clientApi = createApi({
	reducerPath: 'clientApi',
	tagTypes: ['Client'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getClientsList: builder.query<
			Array<Partial<ClientClass>> | PaginationResponseType<ClientClass>,
			ClientsQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_CLIENT_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['Client'],
		}),
		// Same Django endpoint as the web. RTK Query keeps the loaded pages together
		// so the native list can append a page when the user reaches the bottom.
		getClientsInfiniteList: builder.infiniteQuery<PaginationResponseType<ClientClass>, ClientsQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_CLIENT_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Client'],
		}),
		// Same request as the web; Expo exposes this URL through EXPO_PUBLIC_ variables.
		getClient: builder.query<ClientClass, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/${id}/`,
				method: 'GET',
			}),
			providesTags: ['Client'],
		}),
		getCodeClient: builder.query<Pick<ClientClass, 'code_client'>, { company_id: number }>({
			// A new form needs a fresh code, rather than the previous form's suggestion.
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_CLIENT_GENERATE_CODE_CLIENT,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Client'],
		}),
		addClient: builder.mutation<ClientClass, { data: Partial<ClientClass> }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
		editClient: builder.mutation<ClientClass, { id: number; data: Partial<ClientClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
		deleteClient: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
		getClientHistory: builder.query<ClientHistoryResponseType, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/${id}/history/`,
				method: 'GET',
			}),
			providesTags: ['Client'],
		}),
		patchArchive: builder.mutation<ClientClass, { id: number; data: { archived: boolean } }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_ARCHIVE_CLIENT}${id}/`, method: 'PATCH', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
		bulkDeleteClients: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
		bulkArchiveClients: builder.mutation<{ updated: number }, { ids: number[]; archived: boolean }>({
			query: ({ ids, archived }) => ({
				url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/bulk_archive/`,
				method: 'PATCH',
				data: { ids, archived },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
		}),
	}),
});

export const {
	useLazyGetClientsListQuery,
	useGetClientsInfiniteListInfiniteQuery,
	useGetClientQuery,
	useGetCodeClientQuery,
	useAddClientMutation,
	useEditClientMutation,
	useGetClientHistoryQuery,
	useDeleteClientMutation,
	usePatchArchiveMutation,
	useBulkDeleteClientsMutation,
	useBulkArchiveClientsMutation,
} = clientApi;
