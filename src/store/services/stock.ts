import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getDjangoNextPageParam, isAuthenticatedInstance } from '@/utils/helpers';
import { articleApi } from '@/store/services/article';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import { logistiqueApi } from '@/store/services/logistique';
import type {
	InventorySession,
	InventoryResponse,
	StockBalance,
	StockBalanceResponse,
	StockMovement,
	StockMovementResponse,
	StockMovementType,
	StockListQueryParams,
	StockReceipt,
	StockReceiptResponse,
} from '@/types/stockTypes';

export const stockApi = createApi({
	reducerPath: 'stockApi',
	tagTypes: ['StockBalance', 'StockMovement', 'StockReceipt', 'Inventory'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getStockBalancesInfiniteList: builder.infiniteQuery<StockBalanceResponse, StockListQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, filters = {}, ...params } = queryArg;
				delete params.page;
				return {
					url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/balances/`,
					method: 'GET',
					params: { ...params, ...filters, page: pageParam, page_size: pageSize, pagination: true },
				};
			},
			providesTags: ['StockBalance'],
		}),
		getStockMovementsInfiniteList: builder.infiniteQuery<StockMovementResponse, StockListQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, filters = {}, ...params } = queryArg;
				delete params.page;
				return {
					url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/movements/`,
					method: 'GET',
					params: { ...params, ...filters, page: pageParam, page_size: pageSize, pagination: true },
				};
			},
			providesTags: ['StockMovement'],
		}),
		getStockReceiptsInfiniteList: builder.infiniteQuery<StockReceiptResponse, StockListQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, filters = {}, ...params } = queryArg;
				delete params.page;
				return {
					url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/receipts/`,
					method: 'GET',
					params: { ...params, ...filters, page: pageParam, page_size: pageSize, pagination: true },
				};
			},
			providesTags: ['StockReceipt'],
		}),
		getInventoriesInfiniteList: builder.infiniteQuery<InventoryResponse, StockListQueryParams, number>({
			infiniteQueryOptions: {
				initialPageParam: 1,
				refetchCachedPages: false,
				getNextPageParam: (lastPage, _pages, page) => getDjangoNextPageParam(lastPage.next, page),
			},
			query: ({ queryArg, pageParam }) => {
				const { pageSize = MODULES_PAGE_SIZE, filters = {}, ...params } = queryArg;
				delete params.page;
				return {
					url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/inventories/`,
					method: 'GET',
					params: { ...params, ...filters, page: pageParam, page_size: pageSize, pagination: true },
				};
			},
			providesTags: ['Inventory'],
		}),
		getStockBalance: builder.query<StockBalance, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/balances/${id}/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['StockBalance'],
		}),
		getStockMovement: builder.query<StockMovement, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/movements/${id}/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['StockMovement'],
		}),
		createStockAdjustment: builder.mutation<
			StockMovement,
			{
				company_id: number;
				article: number;
				emplacement: number;
				quantity: number;
				movement_type: Extract<StockMovementType, 'opening' | 'adjustment'>;
				reason: string;
			}
		>({
			query: (data) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/adjustments/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['StockBalance', 'StockMovement']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					// Keep cached article stock values when the adjustment fails.
				}
			},
		}),
		getStockReceipt: builder.query<StockReceipt, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/receipts/${id}/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['StockReceipt'],
		}),
		createStockReceipt: builder.mutation<
			StockReceipt,
			{
				company_id: number;
				logistics_order: number;
				reference: string;
				note: string;
				lines: Array<{ logistics_line: number; article: number; emplacement: number; quantity: number }>;
			}
		>({
			query: (data) => ({ url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/receipts/`, method: 'POST', data }),
			invalidatesTags: (_result, error) => (error ? [] : ['StockReceipt']),
		}),
		validateStockReceipt: builder.mutation<StockReceipt, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/receipts/${id}/validate/`,
				method: 'POST',
				data: { company_id },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['StockReceipt', 'StockBalance', 'StockMovement']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
					dispatch(
						logistiqueApi.util.invalidateTags([
							{ type: 'Logistique', id: 'LIST' },
							{ type: 'Logistique', id: data.logistics_order },
						]),
					);
				} catch {
					// Keep cached stock and logistics values when validation fails.
				}
			},
		}),
		cancelStockReceipt: builder.mutation<StockReceipt, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/receipts/${id}/cancel/`,
				method: 'POST',
				data: { company_id },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['StockReceipt', 'StockBalance', 'StockMovement']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					const { data } = await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
					dispatch(
						logistiqueApi.util.invalidateTags([
							{ type: 'Logistique', id: 'LIST' },
							{ type: 'Logistique', id: data.logistics_order },
						]),
					);
				} catch {
					// Keep cached stock and logistics values when cancellation fails.
				}
			},
		}),
		getInventory: builder.query<InventorySession, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/inventories/${id}/`,
				method: 'GET',
				params: { company_id },
			}),
			providesTags: ['Inventory'],
		}),
		createInventory: builder.mutation<
			InventorySession,
			{
				company_id: number;
				emplacement: number;
				reference: string;
				note: string;
				lines: Array<{ article: number; counted_quantity: number }>;
			}
		>({
			query: (data) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/inventories/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Inventory']),
		}),
		validateInventory: builder.mutation<InventorySession, { company_id: number; id: number }>({
			query: ({ company_id, id }) => ({
				url: `${process.env.EXPO_PUBLIC_STOCK_ROOT}/inventories/${id}/validate/`,
				method: 'POST',
				data: { company_id },
			}),
			invalidatesTags: (_result, error) => (error ? [] : ['Inventory', 'StockBalance', 'StockMovement']),
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				try {
					await queryFulfilled;
					dispatch(articleApi.util.invalidateTags(['Article']));
				} catch {
					// Keep cached article stock values when inventory validation fails.
				}
			},
		}),
	}),
});

export const {
	useGetStockBalancesInfiniteListInfiniteQuery,
	useGetStockMovementsInfiniteListInfiniteQuery,
	useGetStockReceiptsInfiniteListInfiniteQuery,
	useGetInventoriesInfiniteListInfiniteQuery,
	useGetStockBalanceQuery,
	useGetStockMovementQuery,
	useCreateStockAdjustmentMutation,
	useGetStockReceiptQuery,
	useCreateStockReceiptMutation,
	useValidateStockReceiptMutation,
	useCancelStockReceiptMutation,
	useGetInventoryQuery,
	useCreateInventoryMutation,
	useValidateInventoryMutation,
} = stockApi;
