import { factureProFormaApi } from '@/store/services/factureProForma';
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { FactureClass } from '@/models/classes';
import type {
	FactureClientListResponseType,
	FactureClientUnpaginatedResponseType,
	FactureForPayment,
} from '@/types/companyDocumentsTypes';
import type { DevisQueryParams, DeviFactureLineFormValues, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';

type WriteData = Omit<Partial<FactureClass>, 'lignes'> & { lignes?: DeviFactureLineFormValues[] };

export const factureClientApi = createApi({
	reducerPath: 'factureClientApi',
	tagTypes: ['FactureClient', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getFactureClientList: builder.query<
			Array<Partial<FactureClass>> | FactureClientListResponseType | FactureClientUnpaginatedResponseType,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_CLIENT_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['FactureClient', 'Dashboard'],
		}),
		getFactureClientInfiniteList: builder.infiniteQuery<FactureClientListResponseType, DevisQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_FACTURE_CLIENT_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['FactureClient', 'Dashboard'],
		}),
		getFactureClientUnpaidInfiniteList: builder.infiniteQuery<FactureClientListResponseType, DevisQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_FACTURE_CLIENT_UNPAID,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['FactureClient', 'Dashboard'],
		}),
		getFactureClientForPayment: builder.query<FactureForPayment[], { company_id: number; client_id?: number }>({
			query: ({ company_id, client_id }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_CLIENT_FOR_PAYMENT,
				method: 'GET',
				params: { company_id, client_id },
			}),
			providesTags: ['FactureClient'],
		}),
		getFactureClient: builder.query<FactureClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['FactureClient', 'Dashboard'],
		}),
		getNumFactureClient: builder.query<Pick<FactureClass, 'numero_facture'>, { company_id: number }>({
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_CLIENT_GENERATE_NUM_FACTURE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['FactureClient', 'Dashboard'],
		}),
		addFactureClient: builder.mutation<FactureClass, { data: WriteData }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureClient', 'Dashboard']),
		}),
		editFactureClient: builder.mutation<FactureClass, { id: number; data: WriteData }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_ROOT}/${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureClient', 'Dashboard']),
		}),
		deleteFactureClient: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureProFormaApi.util.invalidateTags(['FactureProForma']));
				} catch {
					// Keep source documents cached if invoice deletion was rejected.
				}
			},
		}),
		patchStatut: builder.mutation<
			Pick<FactureClass, 'statut'>,
			{ id: number; data: { statut: TypeFactureLivraisonDevisStatus } }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_SWITCH_STATUT}${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureClient', 'Dashboard']),
		}),
		bulkDeleteFactureClient: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_CLIENT_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureClient', 'Dashboard']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureProFormaApi.util.invalidateTags(['FactureProForma']));
				} catch {
					// Keep source documents cached if invoice deletion was rejected.
				}
			},
		}),
	}),
});

export const {
	useLazyGetFactureClientListQuery,
	useGetFactureClientInfiniteListInfiniteQuery,
	useGetFactureClientUnpaidInfiniteListInfiniteQuery,
	useGetFactureClientQuery,
	useGetFactureClientForPaymentQuery,
	useGetNumFactureClientQuery,
	useAddFactureClientMutation,
	useEditFactureClientMutation,
	useDeleteFactureClientMutation,
	usePatchStatutMutation,
	useBulkDeleteFactureClientMutation,
} = factureClientApi;
