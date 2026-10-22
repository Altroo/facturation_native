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
		addCity: builder.mutation<CitiesClass, { data: Partial<CitiesClass> }>({
			query: ({ data }) => ({ url: process.env.EXPO_PUBLIC_PARAMETER_VILLE, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Cities']),
		}),
		editCity: builder.mutation<CitiesClass, { id: number; data: Partial<CitiesClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_VILLE}${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Cities']),
		}),
		deleteCity: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_VILLE}${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Cities']),
		}),
	}),
});

export const { useGetCitiesListQuery, useAddCityMutation, useEditCityMutation, useDeleteCityMutation } = citiesApi;
