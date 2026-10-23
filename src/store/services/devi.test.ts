import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { deviApi } from './devi';
import { factureProFormaApi } from './factureProForma';

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
		reducer: { [deviApi.reducerPath]: deviApi.reducer, [factureProFormaApi.reducerPath]: factureProFormaApi.reducer },
		middleware: (get) => get().concat(deviApi.middleware, factureProFormaApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(deviApi.util.resetApiState());
	store.dispatch(factureProFormaApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('keeps company, search, filters, ordering and page size on every infinite page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/devi/?page=2' : null,
			results: [{ id: config.params.page }],
		}),
	);
	const args = {
		company_id: 5,
		pageSize: 1,
		search: 'DEV',
		statut: 'Envoyé',
		date_after: '2026-10-01',
		ordering: '-date_devis',
		with_pagination: false,
		page: 99,
	};
	await store.dispatch(deviApi.endpoints.getDevisInfiniteList.initiate(args)).unwrap();
	await store.dispatch(deviApi.endpoints.getDevisInfiniteList.initiate(args, { direction: 'forward' })).unwrap();
	expect(adapter.mock.calls.map(([config]) => config.params)).toEqual(
		[1, 2].map((page) => ({
			company_id: 5,
			page_size: 1,
			page,
			pagination: true,
			search: 'DEV',
			statut: 'Envoyé',
			date_after: '2026-10-01',
			ordering: '-date_devis',
		})),
	);
	expect(deviApi.endpoints.getDevisInfiniteList.select(args)(store.getState()).data?.pages).toHaveLength(2);
});

it('selects all matching records without losing search or OR filters', async () => {
	adapter.mockImplementation(async (config) => response(config, [{ id: 7 }, { id: 8 }]));
	const filter_groups = JSON.stringify([{ statut: 'Envoyé' }, { date_after: '2026-10-01' }]);
	await store
		.dispatch(
			deviApi.endpoints.getDevisList.initiate({
				company_id: 5,
				with_pagination: false,
				search: 'Atlas',
				filter_logic: 'or',
				filter_groups,
			}),
		)
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/devi/',
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
					: { id: 7, numero_devis: '001/26' },
			config.method === 'delete' ? 204 : 200,
		),
	);
	await store.dispatch(deviApi.endpoints.getNumDevis.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(deviApi.endpoints.getDevi.initiate({ id: 7 })).unwrap();
	const data = { numero_devis: '001/26', client: 3, date_devis: '2026-10-22' };
	await store.dispatch(deviApi.endpoints.addDevi.initiate({ data })).unwrap();
	await store.dispatch(deviApi.endpoints.editDevi.initiate({ id: 7, data })).unwrap();
	await expect(
		store.dispatch(deviApi.endpoints.patchStatut.initiate({ id: 7, data: { statut: 'Accepté' } })).unwrap(),
	).resolves.toEqual({ statut: 'Accepté' });
	await store.dispatch(deviApi.endpoints.deleteDevi.initiate({ id: 7 })).unwrap();
	await store.dispatch(deviApi.endpoints.bulkDeleteDevis.initiate({ ids: [7, 8] })).unwrap();
	const writes = adapter.mock.calls.map(([config]) => [
		config.url,
		config.method,
		config.data && JSON.parse(config.data),
	]);
	expect(writes).toEqual(
		expect.arrayContaining([
			['/devi/generate_num_devis/', 'get', undefined],
			['/devi/7/', 'get', undefined],
			['/devi/', 'post', data],
			['/devi/7/', 'put', data],
			['/devi/switch_statut/7/', 'patch', { statut: 'Accepté' }],
			['/devi/7/', 'delete', undefined],
			['/devi/bulk_delete/', 'delete', { ids: [7, 8] }],
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
	await store.dispatch(deviApi.endpoints.getDevisList.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(deviApi.endpoints.getDevisList.initiate({ company_id: 11 })).unwrap();
	await expect(store.dispatch(deviApi.endpoints.deleteDevi.initiate({ id: 5 })).unwrap()).rejects.toMatchObject({
		status: 403,
	});
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	expect(deviApi.endpoints.getDevisList.select({ company_id: 5 })(store.getState()).data).toEqual([{ id: 5 }]);
	expect(deviApi.endpoints.getDevisList.select({ company_id: 11 })(store.getState()).data).toEqual([{ id: 11 }]);
});

it('converts through the configured endpoint and refreshes the Pro-forma list only on success', async () => {
	adapter.mockImplementation(async (config) => response(config, config.method === 'post' ? { id: 21 } : []));
	await store.dispatch(factureProFormaApi.endpoints.getFactureProFormaList.initiate({ company_id: 5 })).unwrap();
	await expect(
		store.dispatch(deviApi.endpoints.convertDeviToFactureProForma.initiate({ id: 7 })).unwrap(),
	).resolves.toEqual({ id: 21 });
	expect(adapter.mock.calls.find(([config]) => config.method === 'post')?.[0]).toMatchObject({
		url: '/devi/convert_to_facture_proforma/7/',
		method: 'post',
	});
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	adapter.mockImplementation(async (config) =>
		Promise.reject(
			new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, response(config, { detail: 'Denied' }, 403)),
		),
	);
	await expect(
		store.dispatch(deviApi.endpoints.convertDeviToFactureProForma.initiate({ id: 8 })).unwrap(),
	).rejects.toMatchObject({ status: 403 });
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
});
