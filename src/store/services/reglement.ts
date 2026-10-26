import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import type { ReglementClass } from '@/models/classes';
import type { DevisQueryParams } from '@/types/devisTypes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type {
	ReglementListResponseType,
	ReglementUnpaginatedResponseType,
	ReglementStatutType,
	ReglementSchemaType,
} from '@/types/reglementTypes';
import { factureClientApi } from '@/store/services/factureClient';

export const reglementApi = createApi({
	reducerPath: 'reglementApi',
	tagTypes: ['Reglement', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getReglementsList: builder.query<
			ReglementClass[] | ReglementListResponseType | ReglementUnpaginatedResponseType,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_REGLEMENT_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['Reglement'],
		}),

		getReglementsInfiniteList: builder.infiniteQuery<ReglementListResponseType, DevisQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, ...filters } = queryArg;
				delete filters.with_pagination;
				delete filters.page;
				return {
					url: process.env.EXPO_PUBLIC_REGLEMENT_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Reglement'],
		}),
		getReglement: builder.query<ReglementClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_REGLEMENT_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['Reglement'],
		}),
		addReglement: builder.mutation<ReglementClass, { data: Omit<ReglementSchemaType, 'globalError'> }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_REGLEMENT_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Reglement', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient']));
				} catch {
					// A rejected payment must not reload the invoice or erase its cached balance.
				}
			},
		}),
		editReglement: builder.mutation<ReglementClass, { id: number; data: Omit<ReglementSchemaType, 'globalError'> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_REGLEMENT_ROOT}/${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Reglement', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient']));
				} catch {
					// Rejected changes preserve the cached invoice balance and payment history.
				}
			},
		}),

		deleteReglement: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_REGLEMENT_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Reglement', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient']));
				} catch {
					// Rejected changes preserve the cached invoice balance and payment history.
				}
			},
		}),

		patchReglementStatut: builder.mutation<
			Pick<ReglementClass, 'statut'>,
			{ id: number; data: { statut: ReglementStatutType } }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_REGLEMENT_SWITCH_STATUT}${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Reglement', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient']));
				} catch {
					// Rejected changes preserve the cached invoice balance and payment history.
				}
			},
		}),

		bulkDeleteReglements: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_REGLEMENT_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Reglement', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient']));
				} catch {
					// Rejected changes preserve the cached invoice balance and payment history.
				}
			},
		}),
	}),
});

export const {
	useGetReglementsListQuery,
	useLazyGetReglementsListQuery,
	useGetReglementsInfiniteListInfiniteQuery,
	useGetReglementQuery,
	useAddReglementMutation,
	useEditReglementMutation,
	useDeleteReglementMutation,
	usePatchReglementStatutMutation,
	useBulkDeleteReglementsMutation,
} = reglementApi;
