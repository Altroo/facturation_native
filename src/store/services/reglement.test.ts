import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { reglementApi } from './reglement';
import { factureClientApi } from './factureClient';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const createStore = () =>
	configureStore({
		reducer: {
			[reglementApi.reducerPath]: reglementApi.reducer,
			[factureClientApi.reducerPath]: factureClientApi.reducer,
		},
		middleware: (get) => get().concat(reglementApi.middleware, factureClientApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	adapter.mockImplementation(async (config) => ({
		config,
		data: [{ id: config.params.facture_client }],
		status: 200,
		statusText: 'OK',
		headers: {},
	}));
	store = createStore();
});
afterEach(async () => {
	store.dispatch(reglementApi.util.resetApiState());
	store.dispatch(factureClientApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('uses the configured payment endpoint with the current company and invoice', async () => {
	await store
		.dispatch(
			reglementApi.endpoints.getReglementsList.initiate({ company_id: 5, facture_client: 7, with_pagination: false }),
		)
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/reglement/',
		method: 'get',
		params: { company_id: 5, facture_client: 7, pagination: false },
	});
});
it('keeps invoice payment caches separate', async () => {
	const first = { company_id: 5, facture_client: 7, with_pagination: false };
	const second = { company_id: 11, facture_client: 8, with_pagination: false };
	await store.dispatch(reglementApi.endpoints.getReglementsList.initiate(first)).unwrap();
	await store.dispatch(reglementApi.endpoints.getReglementsList.initiate(second)).unwrap();
	expect(reglementApi.endpoints.getReglementsList.select(first)(store.getState()).data).toEqual([{ id: 7 }]);
	expect(reglementApi.endpoints.getReglementsList.select(second)(store.getState()).data).toEqual([{ id: 8 }]);
	expect(adapter).toHaveBeenCalledTimes(2);
});

it('posts a payment and refreshes both payment history and the associated invoice balance', async () => {
	const data = {
		facture_client: 7,
		mode_reglement: 2,
		libelle: 'Virement',
		observations: '',
		montant: 100,
		date_reglement: '2026-10-23',
	};
	adapter.mockImplementation(async (config) => ({
		config,
		data: config.method === 'post' ? { id: 3, ...data } : { id: 7, total_paye: 100 },
		status: 200,
		statusText: 'OK',
		headers: {},
	}));
	await store.dispatch(factureClientApi.endpoints.getFactureClient.initiate({ id: 7 })).unwrap();
	await store
		.dispatch(reglementApi.endpoints.getReglementsList.initiate({ company_id: 5, facture_client: 7 }))
		.unwrap();
	await jest.runOnlyPendingTimersAsync();
	await store.dispatch(reglementApi.endpoints.addReglement.initiate({ data })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	const request = adapter.mock.calls.find(([config]) => config.method === 'post')![0];
	expect(request.url).toBe('/reglement/');
	expect(JSON.parse(request.data)).toEqual(data);
	expect(adapter.mock.calls.filter(([config]) => config.url === '/facture_client/7/')).toHaveLength(2);
	expect(adapter.mock.calls.filter(([config]) => config.url === '/reglement/' && config.method === 'get')).toHaveLength(
		2,
	);
});

it('keeps both caches intact if the server rejects the payment', async () => {
	adapter.mockImplementation(async (config) => {
		const response = {
			config,
			data: { details: { montant: ['Amount exceeds balance'] } },
			status: config.method === 'post' ? 400 : 200,
			statusText: 'OK',
			headers: {},
		};
		if (config.method === 'post')
			return Promise.reject(new AxiosError('Invalid amount', 'ERR_BAD_REQUEST', config, undefined, response));
		return response;
	});
	await store.dispatch(factureClientApi.endpoints.getFactureClient.initiate({ id: 7 })).unwrap();
	await store
		.dispatch(reglementApi.endpoints.getReglementsList.initiate({ company_id: 5, facture_client: 7 }))
		.unwrap();
	await jest.runOnlyPendingTimersAsync();
	await expect(
		store
			.dispatch(
				reglementApi.endpoints.addReglement.initiate({
					data: { facture_client: 7, mode_reglement: null, montant: 999, date_reglement: '2026-10-23' },
				}),
			)
			.unwrap(),
	).rejects.toMatchObject({ status: 400 });
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
});
