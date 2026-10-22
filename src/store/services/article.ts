import { Platform } from 'react-native';
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import type { ArticleClass } from '@/models/classes';
import type { PaginationResponseType } from '@/types/_initTypes';
import type { ArticleImportFile, ImportArticlesResponseType, ArticlesQueryParams } from '@/types/articleTypes';

export const articleApi = createApi({
	reducerPath: 'articleApi',
	tagTypes: ['Article'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getArticlesList: builder.query<
			Array<Partial<ArticleClass>> | PaginationResponseType<ArticleClass>,
			ArticlesQueryParams
		>({
			query: ({ with_pagination, page, pageSize, ...filters }) => ({
				url: process.env.EXPO_PUBLIC_ARTICLE_LIST,
				method: 'GET',
				params: {
					...filters,
					pagination: !!with_pagination,
					page: with_pagination ? page : undefined,
					page_size: with_pagination ? pageSize : undefined,
				},
			}),
			providesTags: ['Article'],
		}),
		// Same Django endpoint as the web. RTK Query keeps the loaded pages together
		// so the native list can append a page when the user reaches the bottom.
		getArticlesInfiniteList: builder.infiniteQuery<PaginationResponseType<ArticleClass>, ArticlesQueryParams, number>({
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
					url: process.env.EXPO_PUBLIC_ARTICLE_LIST,
					method: 'GET',
					params: { ...filters, pagination: true, page: pageParam, page_size: pageSize },
				};
			},
			providesTags: ['Article'],
		}),
		// Same request as the web; Expo exposes this URL through EXPO_PUBLIC_ variables.
		getArticle: builder.query<ArticleClass, { id: number }>({
			query: ({ id }) => ({
				url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/${id}/`,
				method: 'GET',
			}),
			providesTags: ['Article'],
		}),
		getCodeReference: builder.query<Pick<ArticleClass, 'reference'>, { company_id: number }>({
			// A new form needs a fresh code, rather than the previous form's suggestion.
			keepUnusedDataFor: 0,
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_ARTICLE_GENERATE_CODE_REFERENCE,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Article'],
		}),
		addArticle: builder.mutation<
			ArticleClass,
			{ data: Partial<ArticleClass> & { photo_cropped?: string | ArrayBuffer | null } }
		>({
			query: ({ data }) => ({ url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		editArticle: builder.mutation<
			ArticleClass,
			{ id: number; data: Partial<ArticleClass> & { photo_cropped?: string | ArrayBuffer | null } }
		>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/${id}/`, method: 'PUT', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		deleteArticle: builder.mutation<void, { id: number }>({
			query: ({ id }) => ({ url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/${id}/`, method: 'DELETE' }),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		patchArchive: builder.mutation<ArticleClass, { id: number; data: { archived: boolean } }>({
			query: ({ id, data }) => ({ url: `${process.env.EXPO_PUBLIC_ARCHIVE_ARTICLE}${id}/`, method: 'PATCH', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		bulkDeleteArticles: builder.mutation<void, { ids: number[] }>({
			query: ({ ids }) => ({
				url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/bulk_delete/`,
				method: 'DELETE',
				data: { ids },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		bulkArchiveArticles: builder.mutation<{ updated: number }, { ids: number[]; archived: boolean }>({
			query: ({ ids, archived }) => ({
				url: `${process.env.EXPO_PUBLIC_ARTICLE_ROOT}/bulk_archive/`,
				method: 'PATCH',
				data: { ids, archived },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		importArticles: builder.mutation<ImportArticlesResponseType, { file: ArticleImportFile; company_id: number }>({
			query: ({ file, company_id }) => {
				const data = new FormData();
				// React Native uploads a cached file URI; browsers upload the File itself.
				// Leave Content-Type unset so Axios adds the multipart boundary.
				data.append(
					'file',
					Platform.OS === 'web' && file.file
						? file.file
						: ({
								uri: file.uri,
								name: file.name,
								type:
									file.mimeType ??
									(file.name.toLowerCase().endsWith('.csv')
										? 'text/csv'
										: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
							} as unknown as Blob),
				);
				data.append('company_id', String(company_id));
				return { url: process.env.EXPO_PUBLIC_ARTICLE_IMPORT, method: 'POST', data };
			},
			invalidatesTags: (_result, error) => (error ? [] : ['Article']),
		}),
		sendCSVExampleEmail: builder.mutation<{ message: string }, { company_id: number }>({
			query: ({ company_id }) => ({
				url: process.env.EXPO_PUBLIC_ARTICLE_SEND_CSV_EXAMPLE_EMAIL,
				method: 'POST',
				data: { company_id },
			}),
		}),
	}),
});

export const {
	useLazyGetArticlesListQuery,
	useGetArticlesInfiniteListInfiniteQuery,
	useGetArticleQuery,
	useGetCodeReferenceQuery,
	useAddArticleMutation,
	useEditArticleMutation,
	useDeleteArticleMutation,
	usePatchArchiveMutation,
	useBulkDeleteArticlesMutation,
	useBulkArchiveArticlesMutation,
	useImportArticlesMutation,
	useSendCSVExampleEmailMutation,
} = articleApi;
