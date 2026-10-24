import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type { ReglementClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { DevisQueryParams } from '@/types/devisTypes';
import type { ReglementSchemaType } from '@/types/reglementTypes';
import { factureClientApi } from '@/store/services/factureClient';

export const reglementApi = createApi({
	reducerPath: 'reglementApi',
	tagTypes: ['Reglement', 'Dashboard'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getReglementsList: builder.query<ReglementClass[] | PaginationResponseType<ReglementClass>, DevisQueryParams>({
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
	}),
});

export const { useGetReglementsListQuery, useAddReglementMutation } = reglementApi;
