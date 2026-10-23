import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { factureProFormaApi } from '@/store/services/factureProForma';
import type { DeviClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DevisQueryParams, DeviFactureLineFormValues, TypeFactureLivraisonDevisStatus } from '@/types/devisTypes';

type WriteData = Omit<Partial<DeviClass>, 'lignes'> & { lignes?: DeviFactureLineFormValues[] };

export const deviApi = createApi({
	reducerPath: 'deviApi',
	tagTypes: ['Devi'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getDevisList: builder.query<Array<Partial<DeviClass>> | PaginationResponseType<DeviClass>, DevisQueryParams>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_DEVIS_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['Devi'],
		}),
		getDevisInfiniteList: builder.infiniteQuery<PaginationResponseType<DeviClass>, DevisQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_DEVIS_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Devi'],
		}),
		getDevi: builder.query<DeviClass, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_DEVIS_ROOT}/${id}/`, method: 'GET' }),
			providesTags: ['Devi'],
		}),
		getNumDevis: builder.query<Pick<DeviClass, 'numero_devis'>, { company_id: number }>({
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_DEVIS_GENERATE_NUM_DEVIS,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Devi'],
		}),
		addDevi: builder.mutation<DeviClass, { data: WriteData }>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_DEVIS_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
		}),
		editDevi: builder.mutation<DeviClass, { id: number; data: WriteData }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_DEVIS_ROOT}/${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
		}),
		deleteDevi: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_DEVIS_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
		}),
		patchStatut: builder.mutation<
			Pick<DeviClass, 'statut'>,
			{ id: number; data: { statut: TypeFactureLivraisonDevisStatus } }
		>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_DEVIS_SWITCH_STATUT}${id}/`, method: 'PATCH', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
		}),
		bulkDeleteDevis: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_DEVIS_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
		}),
		convertDeviToFactureProForma: builder.mutation<{ id: number }, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_DEVIS_CONVERT_TO_FACTURE_PRO_FORMA}${id}/`,
				method: 'POST',
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Devi']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(factureProFormaApi.util.invalidateTags(['FactureProForma']));
				} catch {
					// The caller reports rejected conversions; keep the destination cache intact.
				}
			},
		}),
	}),
});

export const {
	useLazyGetDevisListQuery,
	useGetDevisInfiniteListInfiniteQuery,
	useGetDeviQuery,
	useGetNumDevisQuery,
	useAddDeviMutation,
	useEditDeviMutation,
	useDeleteDeviMutation,
	usePatchStatutMutation,
	useBulkDeleteDevisMutation,
	useConvertDeviToFactureProFormaMutation,
} = deviApi;
