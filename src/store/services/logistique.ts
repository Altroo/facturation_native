import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { factureProFormaApi } from '@/store/services/factureProForma';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DevisQueryParams } from '@/types/devisTypes';
import type {
	LogistiqueListResponse,
	LogistiqueOrder,
	LogistiqueStats,
	LogistiqueSupplier,
	LogistiqueSupplierFormValues,
} from '@/types/logistiqueTypes';

export const logistiqueApi = createApi({
	reducerPath: 'logistiqueApi',
	tagTypes: ['Logistique', 'Dashboard', 'Supplier'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getLogistiqueSupplier: builder.query<LogistiqueSupplier, { id: number; company_id: number }>({
			query: ({ id, company_id }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/fournisseurs/${id}/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: (_result, _error, { id }) => [{ type: 'Supplier', id }],
		}),
		addLogistiqueSupplier: builder.mutation<
			LogistiqueSupplier,
			{ company_id: number } & Omit<LogistiqueSupplierFormValues, 'globalError'>
		>({
			query: ({ company_id, ...data }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/fournisseurs/`,
				method: 'POST',
				params: { company_id },
				data,
			}),
			invalidatesTags: (result) => (result ? ['Supplier'] : []),
		}),
		editLogistiqueSupplier: builder.mutation<
			LogistiqueSupplier,
			{ id: number; company_id: number } & Omit<LogistiqueSupplierFormValues, 'globalError'>
		>({
			query: ({ id, company_id, ...data }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/fournisseurs/${id}/`,
				method: 'PUT',
				params: { company_id },
				data,
			}),
			invalidatesTags: (result) => (result ? ['Supplier'] : []),
		}),
		getLogistiqueInfiniteList: builder.infiniteQuery<LogistiqueListResponse, DevisQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, ...params } = queryArg;
				delete params.with_pagination;
				delete params.page;
				return {
					url: process.env.EXPO_PUBLIC_LOGISTIQUE_LIST,
					method: 'GET',
					params: { ...params, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: [{ type: 'Logistique', id: 'LIST' }],
		}),
		getLogistiqueDashboard: builder.query<LogistiqueStats, { company_id: number }>({
			query: ({ company_id }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/dashboard/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Dashboard'],
		}),
		getLogistiqueSuppliersInfiniteList: builder.infiniteQuery<
			PaginationResponseType<LogistiqueSupplier>,
			DevisQueryParams,
			number
		>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, ...params } = queryArg;
				delete params.with_pagination;
				delete params.page;
				return {
					url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/fournisseurs/`,
					method: 'GET',
					params: { ...params, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Supplier'],
		}),
		getLogistiqueList: builder.query<LogistiqueListResponse, DevisQueryParams>({
			query: ({ company_id, with_pagination, page, pageSize, search, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_LOGISTIQUE_LIST,
				method: 'GET',
				params: {
					company_id,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
					search,
					...filters,
				},
			}),
			providesTags: [{ type: 'Logistique', id: 'LIST' }],
		}),
		getLogistique: builder.query<LogistiqueOrder, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/${id}/`, method: 'GET' }),
			providesTags: (_result, _error, { id }) => [{ type: 'Logistique', id }],
		}),
		deleteLogistique: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : [{ type: 'Logistique', id: 'LIST' }, 'Dashboard', 'Supplier']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureProFormaApi.util.invalidateTags(['FactureProForma']));
				} catch {
					// Failed deletions leave the linked pro forma cache unchanged.
				}
			},
		}),
		bulkDeleteLogistique: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : [{ type: 'Logistique', id: 'LIST' }, 'Dashboard', 'Supplier']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureProFormaApi.util.invalidateTags(['FactureProForma']));
				} catch {
					// Failed deletions leave the linked pro forma cache unchanged.
				}
			},
		}),
		deleteLogistiqueSupplier: builder.mutation<void, { id: number; company_id: number }>({
			query: ({ id, company_id }) => ({
				url: `${process.env.EXPO_PUBLIC_LOGISTIQUE_ROOT}/fournisseurs/${id}/`,
				method: 'DELETE',
				params: { company_id },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Supplier', 'Dashboard', { type: 'Logistique', id: 'LIST' }]),
		}),
	}),
});

export const {
	useGetLogistiqueSupplierQuery,
	useAddLogistiqueSupplierMutation,
	useEditLogistiqueSupplierMutation,
	useGetLogistiqueListQuery,
	useLazyGetLogistiqueListQuery,
	useGetLogistiqueQuery,
	useGetLogistiqueInfiniteListInfiniteQuery,
	useGetLogistiqueDashboardQuery,
	useGetLogistiqueSuppliersInfiniteListInfiniteQuery,
	useDeleteLogistiqueMutation,
	useBulkDeleteLogistiqueMutation,
	useDeleteLogistiqueSupplierMutation,
} = logistiqueApi;
