import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { factureClientApi } from './factureClient';
import { factureProFormaApi } from './factureProForma';
import { deviApi } from './devi';
import { bonDeLivraisonApi } from './bonDeLivraison';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
const createStore = () =>
	configureStore({
		reducer: {
			[factureClientApi.reducerPath]: factureClientApi.reducer,
			[factureProFormaApi.reducerPath]: factureProFormaApi.reducer,
			[deviApi.reducerPath]: deviApi.reducer,
			[bonDeLivraisonApi.reducerPath]: bonDeLivraisonApi.reducer,
		},
		middleware: (get) =>
			get().concat(
				factureClientApi.middleware,
				factureProFormaApi.middleware,
				deviApi.middleware,
				bonDeLivraisonApi.middleware,
			),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});

it('requests unpaid invoices through the dedicated endpoint and preserves filters on the next page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/facture_client/unpaid/?page=2' : null,
			results: [{ id: config.params.page }],
			stats_by_currency: { MAD: { chiffre_affaire_total: '2000', total_reglements: '500', total_impayes: '1500' } },
		}),
	);
	const args = { company_id: 5, pageSize: 1, search: 'Atlas', ordering: '-date_facture', date_after: '2026-10-01' };
	await store.dispatch(factureClientApi.endpoints.getFactureClientUnpaidInfiniteList.initiate(args)).unwrap();
	await store
		.dispatch(factureClientApi.endpoints.getFactureClientUnpaidInfiniteList.initiate(args, { direction: 'forward' }))
		.unwrap();
	expect(adapter.mock.calls.map(([config]) => [config.url, config.params])).toEqual(
		[1, 2].map((page) => [
			'/facture_client/unpaid/',
			{
				company_id: 5,
				pagination: true,
				page,
				page_size: 1,
				search: 'Atlas',
				ordering: '-date_facture',
				date_after: '2026-10-01',
			},
		]),
	);
	expect(
		factureClientApi.endpoints.getFactureClientUnpaidInfiniteList.select(args)(store.getState()).data?.pages[0]
			.stats_by_currency.MAD.total_impayes,
	).toBe('1500');
});

it('refreshes invoice lists after a quote is converted', async () => {
	adapter.mockImplementation(async (config) => response(config, config.method === 'post' ? { id: 31 } : []));
	await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 5 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	await store.dispatch(deviApi.endpoints.convertDeviToFactureClient.initiate({ id: 7 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.find(([config]) => config.method === 'post')?.[0].url).toBe(
		'/devi/convert_to_facture_client/7/',
	);
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
});

it('refreshes invoice lists after a pro-forma is converted', async () => {
	adapter.mockImplementation(async (config) => response(config, config.method === 'post' ? { id: 31 } : []));
	await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 5 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	await store.dispatch(factureProFormaApi.endpoints.convertFactureProFormaToFacture.initiate({ id: 7 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.find(([config]) => config.method === 'post')?.[0].url).toBe(
		'/facture_proforma/convert_to_facture_client/7/',
	);
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
});
afterEach(async () => {
	store.dispatch(factureClientApi.util.resetApiState());
	store.dispatch(factureProFormaApi.util.resetApiState());
	store.dispatch(deviApi.util.resetApiState());
	store.dispatch(bonDeLivraisonApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('keeps company, search, filters, ordering and page size on every infinite page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/facture_client/?page=2' : null,
			results: [{ id: config.params.page }],
		}),
	);
	const args = {
		company_id: 5,
		pageSize: 1,
		search: 'DEV',
		statut: 'Envoyé',
		date_after: '2026-10-01',
		ordering: '-date_facture',
		with_pagination: false,
		page: 99,
	};
	await store.dispatch(factureClientApi.endpoints.getFactureClientInfiniteList.initiate(args)).unwrap();
	await store
		.dispatch(factureClientApi.endpoints.getFactureClientInfiniteList.initiate(args, { direction: 'forward' }))
		.unwrap();
	expect(adapter.mock.calls.map(([config]) => config.params)).toEqual(
		[1, 2].map((page) => ({
			company_id: 5,
			page_size: 1,
			page,
			pagination: true,
			search: 'DEV',
			statut: 'Envoyé',
			date_after: '2026-10-01',
			ordering: '-date_facture',
		})),
	);
	expect(
		factureClientApi.endpoints.getFactureClientInfiniteList.select(args)(store.getState()).data?.pages,
	).toHaveLength(2);
});

it('asks the backend for eligible invoices scoped to the selected company and client', async () => {
	adapter.mockImplementation(async (config) => response(config, [{ id: 7, remaining_amount: '500.00' }]));
	await store
		.dispatch(factureClientApi.endpoints.getFactureClientForPayment.initiate({ company_id: 5, client_id: 3 }))
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/facture_client/for_payment/',
		method: 'get',
		params: { company_id: 5, client_id: 3 },
	});
});

it('selects all matching records without losing search or OR filters', async () => {
	adapter.mockImplementation(async (config) => response(config, [{ id: 7 }, { id: 8 }]));
	const filter_groups = JSON.stringify([{ statut: 'Envoyé' }, { date_after: '2026-10-01' }]);
	await store
		.dispatch(
			factureClientApi.endpoints.getFactureClientList.initiate({
				company_id: 5,
				with_pagination: false,
				search: 'Atlas',
				filter_logic: 'or',
				filter_groups,
			}),
		)
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/facture_client/',
		params: { company_id: 5, pagination: false, search: 'Atlas', filter_logic: 'or', filter_groups },
	});
});

it('uses configured endpoints for generation, detail, creation, editing, status and deletion', async () => {
	adapter.mockImplementation(async (config) =>
		response(
			config,
			config.method === 'delete'
				? ''
				: config.method === 'patch'
					? { statut: 'Accepté' }
					: { id: 7, numero_facture: '001/26' },
			config.method === 'delete' ? 204 : 200,
		),
	);
	await store.dispatch(factureClientApi.endpoints.getNumFactureClient.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(factureClientApi.endpoints.getFactureClient.initiate({ id: 7 })).unwrap();
	const data = { numero_facture: '001/26', client: 3, date_facture: '2026-10-22' };
	await store.dispatch(factureClientApi.endpoints.addFactureClient.initiate({ data })).unwrap();
	await store.dispatch(factureClientApi.endpoints.editFactureClient.initiate({ id: 7, data })).unwrap();
	await expect(
		store.dispatch(factureClientApi.endpoints.patchStatut.initiate({ id: 7, data: { statut: 'Accepté' } })).unwrap(),
	).resolves.toEqual({ statut: 'Accepté' });
	await store.dispatch(factureClientApi.endpoints.deleteFactureClient.initiate({ id: 7 })).unwrap();
	await store.dispatch(factureClientApi.endpoints.bulkDeleteFactureClient.initiate({ ids: [7, 8] })).unwrap();
	const writes = adapter.mock.calls.map(([config]) => [
		config.url,
		config.method,
		config.data && JSON.parse(config.data),
	]);
	expect(writes).toEqual(
		expect.arrayContaining([
			['/facture_client/generate_num_facture_client/', 'get', undefined],
			['/facture_client/7/', 'get', undefined],
			['/facture_client/', 'post', data],
			['/facture_client/7/', 'put', data],
			['/facture_client/switch_statut/7/', 'patch', { statut: 'Accepté' }],
			['/facture_client/7/', 'delete', undefined],
			['/facture_client/bulk_delete/', 'delete', { ids: [7, 8] }],
		]),
	);
	expect(adapter.mock.calls[0][0].params).toEqual({ company_id: 5 });
});

it('preserves cached lists after rejected writes and keeps company caches separate', async () => {
	adapter.mockImplementation(async (config) =>
		config.method === 'get'
			? response(config, [{ id: config.params.company_id }])
			: Promise.reject(
					new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, response(config, { detail: 'Denied' }, 403)),
				),
	);
	await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 11 })).unwrap();
	await expect(
		store.dispatch(factureClientApi.endpoints.deleteFactureClient.initiate({ id: 5 })).unwrap(),
	).rejects.toMatchObject({
		status: 403,
	});
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	expect(factureClientApi.endpoints.getFactureClientList.select({ company_id: 5 })(store.getState()).data).toEqual([
		{ id: 5 },
	]);
	expect(factureClientApi.endpoints.getFactureClientList.select({ company_id: 11 })(store.getState()).data).toEqual([
		{ id: 11 },
	]);
});

it.each([true, false])('refreshes delivery lists only when invoice conversion succeeds: %s', async (success) => {
	adapter.mockImplementation(async (config) => {
		if (config.method === 'get') return response(config, []);
		if (!success)
			throw new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, response(config, { detail: 'Denied' }, 403));
		return response(config, { id: 31 });
	});
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.initiate({ company_id: 5 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	const conversion = store
		.dispatch(factureClientApi.endpoints.convertFactureClientToBonDeLivraison.initiate({ id: 7 }))
		.unwrap();
	if (success) await expect(conversion).resolves.toEqual({ id: 31 });
	else await expect(conversion).rejects.toMatchObject({ status: 403 });
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.find(([config]) => config.method === 'post')?.[0].url).toBe(
		'/facture_client/convert_to_bon_de_livraison/7/',
	);
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(success ? 2 : 1);
});
