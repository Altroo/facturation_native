import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance } from '@/utils/helpers';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import type {
	ReceivablesByClientData,
	UninvoicedDeliveriesData,
	ClientMultidimensionalData,
	CollectionRateData,
	DateFilterParams,
	DiscountImpactData,
	KPICardsData,
	MonthlyDocumentVolumeData,
	MonthlyGlobalPerformanceData,
	MonthlyObjectivesData,
	MonthlyObjectivesSettings,
	MonthlyObjectivesSettingsInput,
	MonthlyRevenueData,
	OverdueReceivablesData,
	PaymentDelayData,
	PaymentStatusData,
	PaymentTimelineData,
	ProductMarginVolumeData,
	ProductPriceVolumeData,
	QuoteConversionData,
	SectionMicroTrendsData,
	TopClientData,
	TopProductData,
} from '@/types/dashboardTypes';
import { buildDateQueryString } from '@/utils/apiHelpers';

export const dashboardApi = createApi({
	reducerPath: 'dashboardApi',
	tagTypes: ['Dashboard', 'MonthlyObjectivesSettings'],
	baseQuery: axiosBaseQuery(() => isAuthenticatedInstance()),
	endpoints: (builder) => ({
		getReceivablesByClient: builder.query<ReceivablesByClientData, DateFilterParams>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/financial/receivables-by-client/${buildDateQueryString(params)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getUninvoicedDeliveries: builder.query<UninvoicedDeliveriesData, DateFilterParams>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/operational/uninvoiced-deliveries/${buildDateQueryString(params)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		// Financial Overview
		getMonthlyRevenueEvolution: builder.query<MonthlyRevenueData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/financial/monthly-revenue/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getPaymentStatusOverview: builder.query<PaymentStatusData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/financial/payment-status/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getCollectionRate: builder.query<CollectionRateData, DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/financial/collection-rate/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Commercial Performance
		getTopClientsByRevenue: builder.query<TopClientData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/commercial/top-clients/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getTopProductsByQuantity: builder.query<TopProductData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/commercial/top-products/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getQuoteConversionRate: builder.query<QuoteConversionData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/commercial/quote-conversion/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getProductPriceVolumeAnalysis: builder.query<ProductPriceVolumeData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/commercial/product-price-volume/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Operational Indicators
		getMonthlyDocumentVolume: builder.query<MonthlyDocumentVolumeData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/operational/document-volume/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Cash Flow Analysis
		getPaymentTimeline: builder.query<PaymentTimelineData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/cashflow/payment-timeline/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getOverdueReceivables: builder.query<OverdueReceivablesData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/cashflow/overdue-receivables/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getPaymentDelayByClient: builder.query<PaymentDelayData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/cashflow/payment-delay/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Client Analysis
		getClientMultidimensionalProfile: builder.query<ClientMultidimensionalData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/client/multidimensional-profile/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// KPI Cards
		getKPICardsWithTrends: builder.query<KPICardsData, DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/kpi/cards-with-trends/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getMonthlyObjectives: builder.query<MonthlyObjectivesData, DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/kpi/monthly-objectives/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Discount and Margin Analysis
		getDiscountImpactAnalysis: builder.query<DiscountImpactData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/analysis/discount-impact/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getProductMarginVolume: builder.query<ProductMarginVolumeData[], DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/analysis/product-margin-volume/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Synthetic Dashboards
		getMonthlyGlobalPerformance: builder.query<MonthlyGlobalPerformanceData, DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/synthetic/monthly-performance/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),
		getSectionMicroTrends: builder.query<SectionMicroTrendsData, DateFilterParams | void>({
			query: (params) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/synthetic/section-micro-trends/${buildDateQueryString(params ?? undefined)}`,
				method: 'GET',
			}),
			providesTags: ['Dashboard'],
		}),

		// Monthly Objectives Settings CRUD
		getMonthlyObjectivesSettingsByCompany: builder.query<MonthlyObjectivesSettings, number>({
			query: (companyId) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/objectives/by-company/${companyId}/`,
				method: 'GET',
			}),
			providesTags: ['MonthlyObjectivesSettings'],
		}),
		createMonthlyObjectivesSettings: builder.mutation<MonthlyObjectivesSettings, MonthlyObjectivesSettingsInput>({
			query: (data) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/objectives/`,
				method: 'POST',
				data,
			}),
			invalidatesTags: ['MonthlyObjectivesSettings', 'Dashboard'],
		}),
		updateMonthlyObjectivesSettings: builder.mutation<
			MonthlyObjectivesSettings,
			{ id: number; data: MonthlyObjectivesSettingsInput }
		>({
			query: ({ id, data }) => ({
				url: `${process.env.EXPO_PUBLIC_DASHBOARD_ROOT}/objectives/${id}/`,
				method: 'PUT',
				data,
			}),
			invalidatesTags: ['MonthlyObjectivesSettings', 'Dashboard'],
		}),
	}),
});

export const {
	useGetReceivablesByClientQuery,
	useGetUninvoicedDeliveriesQuery,
	useGetMonthlyRevenueEvolutionQuery,
	useGetPaymentStatusOverviewQuery,
	useGetCollectionRateQuery,
	useGetTopClientsByRevenueQuery,
	useGetTopProductsByQuantityQuery,
	useGetQuoteConversionRateQuery,
	useGetProductPriceVolumeAnalysisQuery,
	useGetMonthlyDocumentVolumeQuery,
	useGetPaymentTimelineQuery,
	useGetOverdueReceivablesQuery,
	useGetPaymentDelayByClientQuery,
	useGetClientMultidimensionalProfileQuery,
	useGetKPICardsWithTrendsQuery,
	useGetMonthlyObjectivesQuery,
	useGetDiscountImpactAnalysisQuery,
	useGetProductMarginVolumeQuery,
	useGetMonthlyGlobalPerformanceQuery,
	useGetSectionMicroTrendsQuery,
	useGetMonthlyObjectivesSettingsByCompanyQuery,
	useCreateMonthlyObjectivesSettingsMutation,
	useUpdateMonthlyObjectivesSettingsMutation,
} = dashboardApi;
