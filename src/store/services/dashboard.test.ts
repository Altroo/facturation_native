import { configureStore } from '@reduxjs/toolkit';
import { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { dashboardApi } from './dashboard';
import { buildDateQueryString } from '@/utils/apiHelpers';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const createStore = () =>
	configureStore({
		reducer: { [dashboardApi.reducerPath]: dashboardApi.reducer },
		middleware: (get) => get().concat(dashboardApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	adapter.mockImplementation(async (config) => ({ config, status: 200, statusText: 'OK', headers: {}, data: [] }));
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(dashboardApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

describe('Dashboard API', () => {
	it('encodes the same company, date, currency, client and project scope as the web', () => {
		expect(buildDateQueryString()).toBe('');
		expect(buildDateQueryString({})).toBe('');
		const params = new URLSearchParams(
			buildDateQueryString({
				company_id: 5,
				date_from: '2026-01-01',
				date_to: '2026-10-26',
				devise: 'EUR',
				client_id: 8,
				project: 'A & B',
			}).slice(1),
		);
		expect(Object.fromEntries(params)).toEqual({
			company_id: '5',
			date_from: '2026-01-01',
			date_to: '2026-10-26',
			devise: 'EUR',
			client_id: '8',
			project: 'A & B',
		});
	});

	it.each([
		['getMonthlyRevenueEvolution', 'financial/monthly-revenue'],
		['getReceivablesByClient', 'financial/receivables-by-client'],
		['getPaymentStatusOverview', 'financial/payment-status'],
		['getCollectionRate', 'financial/collection-rate'],
		['getTopClientsByRevenue', 'commercial/top-clients'],
		['getTopProductsByQuantity', 'commercial/top-products'],
		['getQuoteConversionRate', 'commercial/quote-conversion'],
		['getProductPriceVolumeAnalysis', 'commercial/product-price-volume'],
		['getUninvoicedDeliveries', 'operational/uninvoiced-deliveries'],
		['getMonthlyDocumentVolume', 'operational/document-volume'],
		['getPaymentTimeline', 'cashflow/payment-timeline'],
		['getOverdueReceivables', 'cashflow/overdue-receivables'],
		['getPaymentDelayByClient', 'cashflow/payment-delay'],
		['getClientMultidimensionalProfile', 'client/multidimensional-profile'],
		['getKPICardsWithTrends', 'kpi/cards-with-trends'],
		['getMonthlyObjectives', 'kpi/monthly-objectives'],
		['getDiscountImpactAnalysis', 'analysis/discount-impact'],
		['getProductMarginVolume', 'analysis/product-margin-volume'],
		['getMonthlyGlobalPerformance', 'synthetic/monthly-performance'],
		['getSectionMicroTrends', 'synthetic/section-micro-trends'],
	] as const)('uses the configured endpoint for %s and keeps filters server-side', async (name, path) => {
		const env = jest.replaceProperty(process.env, 'EXPO_PUBLIC_DASHBOARD_ROOT', '/custom-dashboard');
		try {
			const endpoint = dashboardApi.endpoints[name] as typeof dashboardApi.endpoints.getMonthlyRevenueEvolution;
			const request = store.dispatch(
				endpoint.initiate({ company_id: 5, devise: 'USD', client_id: 8, project: 'Atlas' }),
			);
			await request.unwrap();
			const url = new URL(adapter.mock.calls[0]![0].url!, 'https://example.invalid');
			expect(url.pathname).toBe(`/custom-dashboard/${path}/`);
			expect(Object.fromEntries(url.searchParams)).toEqual({
				company_id: '5',
				devise: 'USD',
				client_id: '8',
				project: 'Atlas',
			});
			request.unsubscribe();
		} finally {
			env.restore();
		}
	});

	it('reads and saves monthly objectives with the web payload and invalidates displayed statistics', async () => {
		const subscription = store.dispatch(dashboardApi.endpoints.getMonthlyObjectives.initiate({ company_id: 5 }));
		await subscription.unwrap();
		const data = {
			company: 5,
			objectif_ca: '500000',
			objectif_ca_eur: '20000',
			objectif_ca_usd: null,
			objectif_factures: 25,
			objectif_conversion: '65',
		};
		await store.dispatch(dashboardApi.endpoints.getMonthlyObjectivesSettingsByCompany.initiate(5)).unwrap();
		await store.dispatch(dashboardApi.endpoints.createMonthlyObjectivesSettings.initiate(data)).unwrap();
		await store.dispatch(dashboardApi.endpoints.updateMonthlyObjectivesSettings.initiate({ id: 11, data })).unwrap();
		await Promise.all(store.dispatch(dashboardApi.util.getRunningQueriesThunk()));
		expect(adapter.mock.calls.find(([config]) => config.method === 'post')?.[0]).toMatchObject({
			url: '/dashboard/objectives/',
			data: JSON.stringify(data),
		});
		expect(adapter.mock.calls.find(([config]) => config.method === 'put')?.[0]).toMatchObject({
			url: '/dashboard/objectives/11/',
			data: JSON.stringify(data),
		});
		expect(adapter.mock.calls.some(([config]) => config.url === '/dashboard/objectives/by-company/5/')).toBe(true);
		expect(
			adapter.mock.calls.filter(([config]) => config.url?.includes('/kpi/monthly-objectives/')).length,
		).toBeGreaterThan(1);
		subscription.unsubscribe();
	});
});
