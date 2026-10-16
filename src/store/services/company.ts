import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance, getDjangoNextPageParam } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type { CompanyClass } from '@/models/classes';
import type { ApiErrorResponseType, PaginationResponseType } from '@/types/_initTypes';
import type { CompaniesUserCompaniesType, CompaniesQueryParams } from '@/types/companyTypes';

export const companyApi = createApi({
	reducerPath: 'companyApi',
	tagTypes: ['Company'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getCompaniesList: builder.query<
			Array<Partial<CompanyClass>> | PaginationResponseType<CompanyClass>,
			CompaniesQueryParams
		>({
			query: ({
				with_pagination,
				page,
				pageSize,
				search,
				date_created_after,
				date_created_before,
				...extraFilters
			}) => ({
				url: process.env.EXPO_PUBLIC_COMPANY_LIST,
				method: 'GET',
				params: {
					pagination: with_pagination ? true : undefined,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
					search: with_pagination ? search : undefined,
					date_created_after,
					date_created_before,
					...extraFilters,
				},
			}),
			providesTags: ['Company'],
		}),
		getUserCompanies: builder.query<Array<CompaniesUserCompaniesType>, void>({
			query: () => ({
				url: process.env.EXPO_PUBLIC_USER_COMPANIES_LIST,
				method: 'GET',
			}),
			providesTags: ['Company'],
		}),
		getCompany: builder.query<CompanyClass, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_COMPANY_ROOT}/${id}/`,
				method: 'GET',
			}),
			providesTags: ['Company'],
		}),
		suspendCompany: builder.mutation<void | ApiErrorResponseType, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_COMPANY_ROOT}/${id}/`,
				method: 'DELETE',
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Company']),
		}),
		editCompany: builder.mutation<CompanyClass, { id: number; data: Partial<CompanyClass> }>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_COMPANY_ROOT}/${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: ['Company'],
		}),
		addCompany: builder.mutation<CompanyClass, { data: Partial<CompanyClass> }>({
			query: ({ data }) => ({
				url: `${process.env.EXPO_PUBLIC_COMPANY_ROOT}/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['Company'],
		}),
		bulkSuspendCompanies: builder.mutation<{ suspended: number }, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_COMPANY_ROOT}/bulk-suspend/`,
				method: 'POST',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Company']),
		}),
		getCompaniesInfiniteList: builder.infiniteQuery<PaginationResponseType<CompanyClass>, CompaniesQueryParams, number>(
			{
				infiniteQueryOptions: {
					initialPageParam: 1,
					refetchCachedPages: false,
					getNextPageParam: (lastPage, _pages, lastPageParam) => getDjangoNextPageParam(lastPage.next, lastPageParam),
				},
				query: ({
					queryArg: { with_pagination: _withPagination, page: _page, pageSize = MODULES_PAGE_SIZE, ...filters },
					pageParam,
				}) => ({
					url: process.env.EXPO_PUBLIC_COMPANY_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				}),
				providesTags: ['Company'],
			},
		),
	}),
});

export const {
	useGetCompaniesListQuery,
	useLazyGetCompaniesListQuery,
	useSuspendCompanyMutation,
	useBulkSuspendCompaniesMutation,
	useEditCompanyMutation,
	useGetCompanyQuery,
	useAddCompanyMutation,
	useGetUserCompaniesQuery,
	useGetCompaniesInfiniteListInfiniteQuery,
} = companyApi;
