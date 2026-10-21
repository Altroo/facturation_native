import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { ClientClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { ClientsQueryParams } from '@/types/clientTypes';

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
		deleteClient: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_CLIENT_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Client']),
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
	useGetClientsListQuery,
	useLazyGetClientsListQuery,
	useGetClientsInfiniteListInfiniteQuery,
	useDeleteClientMutation,
	usePatchArchiveMutation,
	useBulkDeleteClientsMutation,
	useBulkArchiveClientsMutation,
} = clientApi;
