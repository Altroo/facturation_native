import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { bonDeLivraisonApi } from './bonDeLivraison';
import { articleApi } from './article';

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
			[bonDeLivraisonApi.reducerPath]: bonDeLivraisonApi.reducer,
			[articleApi.reducerPath]: articleApi.reducer,
		},
		middleware: (get) => get().concat(bonDeLivraisonApi.middleware, articleApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});

afterEach(async () => {
	store.dispatch(bonDeLivraisonApi.util.resetApiState());
	store.dispatch(articleApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('keeps company, search, filters, ordering and page size on every infinite page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/bon_de_livraison/?page=2' : null,
			results: [{ id: config.params.page }],
		}),
	);
	const args = {
		company_id: 5,
		pageSize: 1,
		search: 'DEV',
		statut: 'Envoyé',
		date_after: '2026-10-01',
		ordering: '-date_bon_livraison',
		with_pagination: false,
		page: 99,
	};
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonInfiniteList.initiate(args)).unwrap();
	await store
		.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonInfiniteList.initiate(args, { direction: 'forward' }))
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
			ordering: '-date_bon_livraison',
		})),
	);
	expect(
		bonDeLivraisonApi.endpoints.getBonDeLivraisonInfiniteList.select(args)(store.getState()).data?.pages,
	).toHaveLength(2);
});

it('selects all matching records without losing search or OR filters', async () => {
	adapter.mockImplementation(async (config) => response(config, [{ id: 7 }, { id: 8 }]));
	const filter_groups = JSON.stringify([{ statut: 'Envoyé' }, { date_after: '2026-10-01' }]);
	await store
		.dispatch(
			bonDeLivraisonApi.endpoints.getBonDeLivraisonList.initiate({
				company_id: 5,
				with_pagination: false,
				search: 'Atlas',
				filter_logic: 'or',
				filter_groups,
			}),
		)
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/bon_de_livraison/',
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
					: { id: 7, numero_bon_livraison: '001/26' },
			config.method === 'delete' ? 204 : 200,
		),
	);
	await store.dispatch(bonDeLivraisonApi.endpoints.getNumBonDeLivraison.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraison.initiate({ id: 7 })).unwrap();
	const data = { numero_bon_livraison: '001/26', client: 3, date_bon_livraison: '2026-10-22' };
	await store.dispatch(bonDeLivraisonApi.endpoints.addBonDeLivraison.initiate({ data })).unwrap();
	await store.dispatch(bonDeLivraisonApi.endpoints.editBonDeLivraison.initiate({ id: 7, data })).unwrap();
	await expect(
		store
			.dispatch(bonDeLivraisonApi.endpoints.patchBonDeLivraisonStatut.initiate({ id: 7, data: { statut: 'Accepté' } }))
			.unwrap(),
	).resolves.toEqual({ statut: 'Accepté' });
	await store.dispatch(bonDeLivraisonApi.endpoints.deleteBonDeLivraison.initiate({ id: 7 })).unwrap();
	await store.dispatch(bonDeLivraisonApi.endpoints.bulkDeleteBonDeLivraison.initiate({ ids: [7, 8] })).unwrap();
	const writes = adapter.mock.calls.map(([config]) => [
		config.url,
		config.method,
		config.data && JSON.parse(config.data),
	]);
	expect(writes).toEqual(
		expect.arrayContaining([
			['/bon_de_livraison/generate_num_bon_livraison/', 'get', undefined],
			['/bon_de_livraison/7/', 'get', undefined],
			['/bon_de_livraison/', 'post', data],
			['/bon_de_livraison/7/', 'put', data],
			['/bon_de_livraison/switch_statut/7/', 'patch', { statut: 'Accepté' }],
			['/bon_de_livraison/7/', 'delete', undefined],
			['/bon_de_livraison/bulk_delete/', 'delete', { ids: [7, 8] }],
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
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.initiate({ company_id: 11 })).unwrap();
	await expect(
		store.dispatch(bonDeLivraisonApi.endpoints.deleteBonDeLivraison.initiate({ id: 5 })).unwrap(),
	).rejects.toMatchObject({
		status: 403,
	});
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	expect(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.select({ company_id: 5 })(store.getState()).data).toEqual([
		{ id: 5 },
	]);
	expect(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.select({ company_id: 11 })(store.getState()).data).toEqual([
		{ id: 11 },
	]);
});

it('keeps the uninvoiced endpoint, delivery filter and ordering on every loaded page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/bon_de_livraison/uninvoiced/?page=2' : null,
			results: [{ id: config.params.page }],
		}),
	);
	const args = { company_id: 5, search: 'Atlas', livre_par_ids: '6', pageSize: 1, ordering: '-date_bon_livraison' };
	await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonUninvoicedInfiniteList.initiate(args)).unwrap();
	await store
		.dispatch(
			bonDeLivraisonApi.endpoints.getBonDeLivraisonUninvoicedInfiniteList.initiate(args, { direction: 'forward' }),
		)
		.unwrap();
	expect(adapter.mock.calls.map(([config]) => [config.url, config.params])).toEqual(
		[1, 2].map((page) => [
			'/bon_de_livraison/uninvoiced/',
			{
				company_id: 5,
				search: 'Atlas',
				livre_par_ids: '6',
				ordering: '-date_bon_livraison',
				pagination: true,
				page,
				page_size: 1,
			},
		]),
	);
});
it.each([true, false])('refreshes article stock only when a delivery status write succeeds: %s', async (success) => {
	adapter.mockImplementation(async (config) => {
		if (config.method === 'get') return response(config, [{ id: 4, available_quantity: 10 }]);
		if (!success)
			throw new AxiosError(
				'Insufficient stock',
				'ERR_BAD_REQUEST',
				config,
				undefined,
				response(config, { detail: 'Insufficient stock' }, 400),
			);
		return response(config, { statut: 'Accepté' });
	});
	await store.dispatch(articleApi.endpoints.getArticlesList.initiate({ company_id: 5 })).unwrap();
	await jest.runOnlyPendingTimersAsync();
	const result = store
		.dispatch(bonDeLivraisonApi.endpoints.patchBonDeLivraisonStatut.initiate({ id: 7, data: { statut: 'Accepté' } }))
		.unwrap();
	if (success) await expect(result).resolves.toEqual({ statut: 'Accepté' });
	else await expect(result).rejects.toMatchObject({ status: 400 });
	await jest.runOnlyPendingTimersAsync();
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(success ? 2 : 1);
});
