import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type { DevisQueryParams } from '@/types/devisTypes';
import type { LogistiqueListResponse, LogistiqueOrder } from '@/types/logistiqueTypes';

export const logistiqueApi = createApi({
	reducerPath: 'logistiqueApi',
	tagTypes: ['Logistique'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
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
	}),
});

export const { useGetLogistiqueListQuery, useGetLogistiqueQuery } = logistiqueApi;
