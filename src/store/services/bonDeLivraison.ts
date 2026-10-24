import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { articleApi } from '@/store/services/article';
import type { BonDeLivraisonClass } from '@/models/classes';
import type { DevisQueryParams, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DocumentWriteData } from '@/types/companyDocumentsTypes';

export const bonDeLivraisonApi = createApi({
	reducerPath: 'bonDeLivraisonApi',
	tagTypes: ['BonDeLivraison', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getBonDeLivraisonList: builder.query<
			Array<Partial<BonDeLivraisonClass>> | PaginationResponseType<BonDeLivraisonClass>,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['BonDeLivraison'],
		}),
		getBonDeLivraisonInfiniteList: builder.infiniteQuery<
			PaginationResponseType<BonDeLivraisonClass>,
			DevisQueryParams,
			number
		>({
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
					url: process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['BonDeLivraison'],
		}),
		getBonDeLivraisonUninvoicedList: builder.query<
			Array<Partial<BonDeLivraisonClass>> | PaginationResponseType<BonDeLivraisonClass>,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_UNINVOICED,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['BonDeLivraison'],
		}),
		getBonDeLivraisonUninvoicedInfiniteList: builder.infiniteQuery<
			PaginationResponseType<BonDeLivraisonClass>,
			DevisQueryParams,
			number
		>({
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
					url: process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_UNINVOICED,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['BonDeLivraison'],
		}),
		getBonDeLivraison: builder.query<BonDeLivraisonClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['BonDeLivraison'],
		}),
		getNumBonDeLivraison: builder.query<Pick<BonDeLivraisonClass, 'numero_bon_livraison'>, { company_id: number }>({
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_GENERATE_NUM_BON_DE_LIVRAISON,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['BonDeLivraison'],
		}),
		addBonDeLivraison: builder.mutation<BonDeLivraisonClass, { data: DocumentWriteData }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['BonDeLivraison', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					// Delivery status and deletion can change the backend stock ledger.
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					/* The form handles rejected requests; keep cached stock values. */
				}
			},
		}),
		editBonDeLivraison: builder.mutation<BonDeLivraisonClass, { id: number; data: DocumentWriteData }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_ROOT}/${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['BonDeLivraison', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					/* The form reports rejected requests. */
				}
			},
		}),
		patchBonDeLivraisonStatut: builder.mutation<
			Pick<BonDeLivraisonClass, 'statut'>,
			{ id: number; data: { statut: TypeFactureLivraisonDevisStatus } }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_SWITCH_STATUT}${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['BonDeLivraison', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					/* The form reports rejected requests. */
				}
			},
		}),
		deleteBonDeLivraison: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['BonDeLivraison', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					/* The list or detail page reports rejected requests. */
				}
			},
		}),
		bulkDeleteBonDeLivraison: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['BonDeLivraison', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					/* The list reports rejected requests. */
				}
			},
		}),
	}),
});

export const {
	useLazyGetBonDeLivraisonListQuery,
	useLazyGetBonDeLivraisonUninvoicedListQuery,
	useGetBonDeLivraisonUninvoicedInfiniteListInfiniteQuery,
	useGetBonDeLivraisonInfiniteListInfiniteQuery,
	useGetBonDeLivraisonQuery,
	useGetNumBonDeLivraisonQuery,
	useAddBonDeLivraisonMutation,
	useEditBonDeLivraisonMutation,
	usePatchBonDeLivraisonStatutMutation,
	useDeleteBonDeLivraisonMutation,
	useBulkDeleteBonDeLivraisonMutation,
} = bonDeLivraisonApi;
