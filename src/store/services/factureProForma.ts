import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { FactureClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DevisQueryParams, DeviFactureLineFormValues, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';

type WriteData = Omit<Partial<FactureClass>, 'lignes'> & { lignes?: DeviFactureLineFormValues[] };

export const factureProFormaApi = createApi({
	reducerPath: 'factureProFormaApi',
	tagTypes: ['FactureProForma', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getFactureProFormaList: builder.query<
			Array<Partial<FactureClass>> | PaginationResponseType<FactureClass>,
			DevisQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_PROFORMA_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['FactureProForma', 'Dashboard'],
		}),
		getFactureProFormaInfiniteList: builder.infiniteQuery<
			PaginationResponseType<FactureClass>,
			DevisQueryParams,
			number
		>({
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
					url: process.env.EXPO_PUBLIC_FACTURE_PROFORMA_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['FactureProForma', 'Dashboard'],
		}),
		getFactureProForma: builder.query<FactureClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['FactureProForma', 'Dashboard'],
		}),
		getNumFactureProForma: builder.query<Pick<FactureClass, 'numero_facture'>, { company_id: number }>({
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_FACTURE_PROFORMA_GENERATE_NUM_FACTURE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['FactureProForma', 'Dashboard'],
		}),
		addFactureProForma: builder.mutation<FactureClass, { data: WriteData }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureProForma', 'Dashboard']),
		}),
		editFactureProForma: builder.mutation<FactureClass, { id: number; data: WriteData }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_ROOT}/${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureProForma', 'Dashboard']),
		}),
		deleteFactureProForma: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureProForma', 'Dashboard']),
		}),
		patchStatut: builder.mutation<
			Pick<FactureClass, 'statut'>,
			{ id: number; data: { statut: TypeFactureLivraisonDevisStatus } }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_SWITCH_STATUT}${id}/`,
				method: 'PATCH',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureProForma', 'Dashboard']),
		}),
		bulkDeleteFactureProForma: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['FactureProForma', 'Dashboard']),
		}),
	}),
});

export const {
	useLazyGetFactureProFormaListQuery,
	useGetFactureProFormaInfiniteListInfiniteQuery,
	useGetFactureProFormaQuery,
	useGetNumFactureProFormaQuery,
	useAddFactureProFormaMutation,
	useEditFactureProFormaMutation,
	useDeleteFactureProFormaMutation,
	usePatchStatutMutation,
	useBulkDeleteFactureProFormaMutation,
} = factureProFormaApi;
