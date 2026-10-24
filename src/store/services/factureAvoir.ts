import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { factureClientApi } from '@/store/services/factureClient';
import type { FactureAvoirClass } from '@/models/classes';
import type { DevisQueryParams, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';
import type {
	FactureAvoirFromFactureResponse,
	FactureAvoirListResponseType,
	FactureAvoirWriteData,
} from '@/types/companyDocumentsTypes';

export const factureAvoirApi = createApi({
	reducerPath: 'factureAvoirApi',
	tagTypes: ['FactureAvoir', 'FactureClient', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getFactureAvoirList: builder.query<
			| Array<Partial<FactureAvoirClass>>
			| FactureAvoirListResponseType
			| Pick<FactureAvoirListResponseType, 'results' | 'stats_by_currency'>,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_AVOIR_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['FactureAvoir'],
		}),
		getFactureAvoirInfiniteList: builder.infiniteQuery<FactureAvoirListResponseType, DevisQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_FACTURE_AVOIR_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['FactureAvoir'],
		}),
		getFactureAvoir: builder.query<FactureAvoirClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['FactureAvoir'],
		}),
		getNumFactureAvoir: builder.query<Pick<FactureAvoirClass, 'numero_avoir'>, { company_id: number }>({
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_AVOIR_GENERATE_NUM_FACTURE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['FactureAvoir'],
		}),
		getFactureAvoirFromFacture: builder.query<FactureAvoirFromFactureResponse, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_FROM_FACTURE}${id}/`, method: 'GET' }),
			providesTags: ['FactureClient'],
		}),
		addFactureAvoir: builder.mutation<FactureAvoirClass, { data: FactureAvoirWriteData }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureAvoir', 'FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					// Credits change invoice balances and payment eligibility in the other API cache.
					dispatch(factureClientApi.util.invalidateTags(['FactureClient', 'Dashboard']));
				} catch {
					/* The form handles rejected requests; keep cached invoice balances. */
				}
			},
		}),
		editFactureAvoir: builder.mutation<FactureAvoirClass, { id: number; data: FactureAvoirWriteData }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_ROOT}/${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureAvoir', 'FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient', 'Dashboard']));
				} catch {
					/* The form reports rejected requests. */
				}
			},
		}),
		patchFactureAvoirStatut: builder.mutation<
			Pick<FactureAvoirClass, 'statut'>,
			{ id: number; data: { statut: TypeFactureLivraisonDevisStatus } }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_SWITCH_STATUT}${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureAvoir', 'FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient', 'Dashboard']));
				} catch {
					/* The form reports rejected requests. */
				}
			},
		}),
		deleteFactureAvoir: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureAvoir', 'FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient', 'Dashboard']));
				} catch {
					/* The list or detail page reports rejected requests. */
				}
			},
		}),
		bulkDeleteFactureAvoir: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_AVOIR_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureAvoir', 'FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureClientApi.util.invalidateTags(['FactureClient', 'Dashboard']));
				} catch {
					/* The list reports rejected requests. */
				}
			},
		}),
	}),
});

export const {
	useLazyGetFactureAvoirListQuery,
	useGetFactureAvoirInfiniteListInfiniteQuery,
	useGetFactureAvoirQuery,
	useGetNumFactureAvoirQuery,
	useGetFactureAvoirFromFactureQuery,
	useLazyGetFactureAvoirFromFactureQuery,
	useAddFactureAvoirMutation,
	useEditFactureAvoirMutation,
	usePatchFactureAvoirStatutMutation,
	useDeleteFactureAvoirMutation,
	useBulkDeleteFactureAvoirMutation,
} = factureAvoirApi;
