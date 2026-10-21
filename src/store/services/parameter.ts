import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type { CitiesClass } from '@/models/classes';

export const citiesApi = createApi({
	reducerPath: 'citiesApi',
	tagTypes: ['Cities'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getCitiesList: builder.query<Array<CitiesClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_VILLE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Cities'],
		}),
	}),
});

export const { useGetCitiesListQuery } = citiesApi;
