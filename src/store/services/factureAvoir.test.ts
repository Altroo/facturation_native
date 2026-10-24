import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { factureAvoirApi } from './factureAvoir';
import { factureClientApi } from './factureClient';

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
			[factureAvoirApi.reducerPath]: factureAvoirApi.reducer,
			[factureClientApi.reducerPath]: factureClientApi.reducer,
		},
		middleware: (get) => get().concat(factureAvoirApi.middleware, factureClientApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(factureAvoirApi.util.resetApiState());
	store.dispatch(factureClientApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('keeps company, search, OR filters, sorting and currency statistics across infinite pages', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/facture_avoir/?page=2' : null,
			results: [{ id: config.params.page }],
			stats_by_currency: { MAD: { total_avoirs: '240', total_tva: '40' } },
		}),
	);
	const args = {
		company_id: 5,
		pageSize: 1,
		with_pagination: false,
		page: 99,
		search: 'Atlas',
		ordering: '-date_avoir',
		filter_logic: 'or',
		filter_groups: JSON.stringify([{ motif_avoir: 'remise' }, { date_after: '2026-10-01', date_before: '2026-10-24' }]),
	};
	await store.dispatch(factureAvoirApi.endpoints.getFactureAvoirInfiniteList.initiate(args)).unwrap();
	await store
		.dispatch(factureAvoirApi.endpoints.getFactureAvoirInfiniteList.initiate(args, { direction: 'forward' }))
		.unwrap();
	expect(adapter.mock.calls.map(([config]) => [config.url, config.params])).toEqual(
		[1, 2].map((page) => [
			'/facture_avoir/',
			{
				company_id: 5,
				pagination: true,
				page,
				page_size: 1,
				search: 'Atlas',
				ordering: '-date_avoir',
				filter_logic: 'or',
				filter_groups: args.filter_groups,
			},
		]),
	);
	const data = factureAvoirApi.endpoints.getFactureAvoirInfiniteList.select(args)(store.getState()).data;
	expect(data?.pages).toHaveLength(2);
	expect(data?.pages[0].stats_by_currency.MAD.total_avoirs).toBe('240');
});

it('supports the backend object response when selecting all matching credit notes', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, { results: [{ id: 7 }, { id: 8 }], stats_by_currency: {} }),
	);
	await expect(
		store
			.dispatch(
				factureAvoirApi.endpoints.getFactureAvoirList.initiate({
					company_id: 5,
					with_pagination: false,
					search: 'Atlas',
					motif_avoir: 'remise',
				}),
			)
			.unwrap(),
	).resolves.toMatchObject({ results: [{ id: 7 }, { id: 8 }] });
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/facture_avoir/',
		params: { company_id: 5, pagination: false, search: 'Atlas', motif_avoir: 'remise' },
	});
});

it('uses configured endpoints for number generation, original-invoice data and all writes', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, config.method === 'delete' ? '' : { id: 7, statut: 'Accepté' }),
	);
	await store.dispatch(factureAvoirApi.endpoints.getNumFactureAvoir.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(factureAvoirApi.endpoints.getFactureAvoir.initiate({ id: 7 })).unwrap();
	await store.dispatch(factureAvoirApi.endpoints.getFactureAvoirFromFacture.initiate({ id: 12 })).unwrap();
	const data = { facture_origine: 12, date_avoir: '2026-10-24', motif_avoir: 'remise' };
	await store.dispatch(factureAvoirApi.endpoints.addFactureAvoir.initiate({ data })).unwrap();
	await store.dispatch(factureAvoirApi.endpoints.editFactureAvoir.initiate({ id: 7, data })).unwrap();
	await store
		.dispatch(factureAvoirApi.endpoints.patchFactureAvoirStatut.initiate({ id: 7, data: { statut: 'Accepté' } }))
		.unwrap();
	await store.dispatch(factureAvoirApi.endpoints.deleteFactureAvoir.initiate({ id: 7 })).unwrap();
	await store.dispatch(factureAvoirApi.endpoints.bulkDeleteFactureAvoir.initiate({ ids: [7, 8] })).unwrap();
	expect(
		adapter.mock.calls.map(([config]) => [config.url, config.method, config.data && JSON.parse(config.data)]),
	).toEqual(
		expect.arrayContaining([
			['/facture_avoir/generate_num_facture_avoir/', 'get', undefined],
			['/facture_avoir/7/', 'get', undefined],
			['/facture_avoir/from_facture/12/', 'get', undefined],
			['/facture_avoir/', 'post', data],
			['/facture_avoir/7/', 'put', data],
			['/facture_avoir/switch_statut/7/', 'patch', { statut: 'Accepté' }],
			['/facture_avoir/7/', 'delete', undefined],
			['/facture_avoir/bulk_delete/', 'delete', { ids: [7, 8] }],
		]),
	);
	expect(adapter.mock.calls[0][0].params).toEqual({ company_id: 5 });
});

it.each(['add', 'edit', 'status', 'delete', 'bulk'] as const)(
	'refreshes invoice balances after a successful credit %s',
	async (operation) => {
		adapter.mockImplementation(async (config) => response(config, config.method === 'get' ? [] : { id: 7 }));
		await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 5 })).unwrap();
		await jest.runOnlyPendingTimersAsync();
		const data = { facture_origine: 12, motif_avoir: 'remise' };
		if (operation === 'add')
			await store.dispatch(factureAvoirApi.endpoints.addFactureAvoir.initiate({ data })).unwrap();
		if (operation === 'edit')
			await store.dispatch(factureAvoirApi.endpoints.editFactureAvoir.initiate({ id: 7, data })).unwrap();
		if (operation === 'status')
			await store
				.dispatch(factureAvoirApi.endpoints.patchFactureAvoirStatut.initiate({ id: 7, data: { statut: 'Accepté' } }))
				.unwrap();
		if (operation === 'delete')
			await store.dispatch(factureAvoirApi.endpoints.deleteFactureAvoir.initiate({ id: 7 })).unwrap();
		if (operation === 'bulk')
			await store.dispatch(factureAvoirApi.endpoints.bulkDeleteFactureAvoir.initiate({ ids: [7] })).unwrap();
		await jest.runOnlyPendingTimersAsync();
		expect(adapter.mock.calls.filter(([config]) => config.url === '/facture_client/')).toHaveLength(2);
	},
);

it('preserves cached credits and invoice balances after a rejected mutation', async () => {
	adapter.mockImplementation(async (config) =>
		config.method === 'get'
			? response(config, [{ id: 7 }])
			: Promise.reject(
					new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, response(config, { detail: 'Denied' }, 403)),
				),
	);
	await store.dispatch(factureClientApi.endpoints.getFactureClientList.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(factureAvoirApi.endpoints.getFactureAvoirList.initiate({ company_id: 5 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	await expect(
		store.dispatch(factureAvoirApi.endpoints.deleteFactureAvoir.initiate({ id: 7 })).unwrap(),
	).rejects.toMatchObject({ status: 403 });
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	expect(factureAvoirApi.endpoints.getFactureAvoirList.select({ company_id: 5 })(store.getState()).data).toEqual([
		{ id: 7 },
	]);
});
