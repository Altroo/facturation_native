import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { isAuthenticatedInstance } from '@/utils/helpers';
import type {
	CitiesClass,
	MarqueClass,
	CategorieClass,
	UniteClass,
	EmplacementClass,
	ModePaiementClass,
	LivreParClass,
} from '@/models/classes';

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

export const marqueApi = createApi({
	reducerPath: 'marqueApi',
	tagTypes: ['Marque'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getMarqueList: builder.query<Array<MarqueClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_MARQUE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Marque'],
		}),
		addMarque: builder.mutation<MarqueClass, { data: Partial<MarqueClass> }>({
			query: ({ data }) => ({ url: process.env.EXPO_PUBLIC_PARAMETER_MARQUE, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Marque']),
		}),
		editMarque: builder.mutation<MarqueClass, { id: number; data: Partial<MarqueClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_MARQUE}${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Marque']),
		}),
		deleteMarque: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_MARQUE}${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Marque']),
		}),
	}),
});

export const { useGetMarqueListQuery, useAddMarqueMutation, useEditMarqueMutation, useDeleteMarqueMutation } =
	marqueApi;

export const categorieApi = createApi({
	reducerPath: 'categorieApi',
	tagTypes: ['Categorie'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getCategorieList: builder.query<Array<CategorieClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_CATEGORIE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Categorie'],
		}),
		addCategorie: builder.mutation<CategorieClass, { data: Partial<CategorieClass> }>({
			query: ({ data }) => ({ url: process.env.EXPO_PUBLIC_PARAMETER_CATEGORIE, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Categorie']),
		}),
		editCategorie: builder.mutation<CategorieClass, { id: number; data: Partial<CategorieClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_CATEGORIE}${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Categorie']),
		}),
		deleteCategorie: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_CATEGORIE}${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Categorie']),
		}),
	}),
});

export const {
	useGetCategorieListQuery,
	useAddCategorieMutation,
	useEditCategorieMutation,
	useDeleteCategorieMutation,
} = categorieApi;

export const uniteApi = createApi({
	reducerPath: 'uniteApi',
	tagTypes: ['Unite'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getUniteList: builder.query<Array<UniteClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_UNITE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Unite'],
		}),
		addUnite: builder.mutation<UniteClass, { data: Partial<UniteClass> }>({
			query: ({ data }) => ({ url: process.env.EXPO_PUBLIC_PARAMETER_UNITE, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Unite']),
		}),
		editUnite: builder.mutation<UniteClass, { id: number; data: Partial<UniteClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_UNITE}${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Unite']),
		}),
		deleteUnite: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_UNITE}${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Unite']),
		}),
	}),
});

export const { useGetUniteListQuery, useAddUniteMutation, useEditUniteMutation, useDeleteUniteMutation } = uniteApi;

export const emplacementApi = createApi({
	reducerPath: 'emplacementApi',
	tagTypes: ['Emplacement'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getEmplacementList: builder.query<Array<EmplacementClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_EMPLACEMENT,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Emplacement'],
		}),
		addEmplacement: builder.mutation<EmplacementClass, { data: Partial<EmplacementClass> }>({
			query: ({ data }) => ({ url: process.env.EXPO_PUBLIC_PARAMETER_EMPLACEMENT, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Emplacement']),
		}),
		editEmplacement: builder.mutation<EmplacementClass, { id: number; data: Partial<EmplacementClass> }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_EMPLACEMENT}${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Emplacement']),
		}),
		deleteEmplacement: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_PARAMETER_EMPLACEMENT}${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Emplacement']),
		}),
	}),
});

export const {
	useGetEmplacementListQuery,
	useAddEmplacementMutation,
	useEditEmplacementMutation,
	useDeleteEmplacementMutation,
} = emplacementApi;

export const modePaiementApi = createApi({
	reducerPath: 'modePaiementApi',
	tagTypes: ['ModePaiement'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getModePaiementList: builder.query<Array<ModePaiementClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_MODE_PAIEMENT,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['ModePaiement'],
		}),
		deleteModePaiement: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_PARAMETER_MODE_PAIEMENT}${id}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['ModePaiement']),
		}),
		editModePaiement: builder.mutation<ModePaiementClass, { id: number; data: Partial<ModePaiementClass> }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_PARAMETER_MODE_PAIEMENT}${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['ModePaiement']),
		}),
		addModePaiement: builder.mutation<ModePaiementClass, { data: Partial<ModePaiementClass> }>({
			query: ({ data }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_MODE_PAIEMENT,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['ModePaiement']),
		}),
	}),
});

export const {
	useGetModePaiementListQuery,
	useDeleteModePaiementMutation,
	useEditModePaiementMutation,
	useAddModePaiementMutation,
} = modePaiementApi;

export const livreParApi = createApi({
	reducerPath: 'livreParApi',
	tagTypes: ['LivrePar'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getLivreParList: builder.query<Array<LivreParClass>, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_LIVRE_PAR,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['LivrePar'],
		}),
		deleteLivrePar: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_PARAMETER_LIVRE_PAR}${id}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['LivrePar']),
		}),
		editLivrePar: builder.mutation<LivreParClass, { id: number; data: Partial<LivreParClass> }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_PARAMETER_LIVRE_PAR}${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['LivrePar']),
		}),
		addLivrePar: builder.mutation<LivreParClass, { data: Partial<LivreParClass> }>({
			query: ({ data }) => ({
				url: process.env.EXPO_PUBLIC_PARAMETER_LIVRE_PAR,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['LivrePar']),
		}),
	}),
});

export const { useGetLivreParListQuery, useDeleteLivreParMutation, useEditLivreParMutation, useAddLivreParMutation } =
	livreParApi;
