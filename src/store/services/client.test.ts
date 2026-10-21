import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { clientApi } from './client';
import { citiesApi } from './parameter';

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
		reducer: { [clientApi.reducerPath]: clientApi.reducer, [citiesApi.reducerPath]: citiesApi.reducer },
		middleware: (get) => get().concat(clientApi.middleware, citiesApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(clientApi.util.resetApiState());
	store.dispatch(citiesApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('sends company, search, type codes, cities and ordering to Django for every infinite page', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 2,
			previous: null,
			next: config.params.page === 1 ? 'https://example.invalid/client/?page=2' : null,
			results: [{ id: config.params.page, code_client: `CLT${config.params.page}` }],
		}),
	);
	const args = {
		company_id: 5,
		pageSize: 1,
		search: 'Atlas',
		client_type: 'PM',
		ville_ids: '2,3',
		archived: false,
		ordering: '-nom',
	};
	await store.dispatch(clientApi.endpoints.getClientsInfiniteList.initiate(args)).unwrap();
	await store.dispatch(clientApi.endpoints.getClientsInfiniteList.initiate(args, { direction: 'forward' })).unwrap();
	expect(adapter.mock.calls.map(([config]) => config.params)).toEqual(
		[1, 2].map((page) => ({
			company_id: 5,
			page_size: 1,
			page,
			pagination: true,
			search: 'Atlas',
			client_type: 'PM',
			ville_ids: '2,3',
			archived: false,
			ordering: '-nom',
		})),
	);
	expect(clientApi.endpoints.getClientsInfiniteList.select(args)(store.getState()).data?.pages).toHaveLength(2);
});

it('keeps search and filters when selecting all matching clients without pagination', async () => {
	adapter.mockImplementation(async (config) => response(config, [{ id: 2 }, { id: 9 }]));
	await store
		.dispatch(
			clientApi.endpoints.getClientsList.initiate({
				company_id: 5,
				with_pagination: false,
				search: 'Atlas',
				archived: false,
				ville_ids: '2,3',
				code_client__istartswith: 'CLT',
				date_created_after: '2026-01-01',
			}),
		)
		.unwrap();
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/client/',
		method: 'get',
		params: {
			company_id: 5,
			pagination: false,
			search: 'Atlas',
			archived: false,
			ville_ids: '2,3',
			code_client__istartswith: 'CLT',
			date_created_after: '2026-01-01',
		},
	});
});

it('keeps different companies in different query caches', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, {
			count: 1,
			next: null,
			results: [{ id: config.params.company_id }],
		}),
	);
	await store.dispatch(clientApi.endpoints.getClientsInfiniteList.initiate({ company_id: 5 })).unwrap();
	await store.dispatch(clientApi.endpoints.getClientsInfiniteList.initiate({ company_id: 11 })).unwrap();
	expect(
		clientApi.endpoints.getClientsInfiniteList.select({ company_id: 5 })(store.getState()).data?.pages[0].results,
	).toEqual([{ id: 5 }]);
	expect(
		clientApi.endpoints.getClientsInfiniteList.select({ company_id: 11 })(store.getState()).data?.pages[0].results,
	).toEqual([{ id: 11 }]);
});

it('reads configured endpoints rather than hardcoding paths', async () => {
	adapter.mockImplementation(async (config) => response(config, []));
	const env = [
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_CLIENT_LIST', '/custom/clients/'),
		jest.replaceProperty(process.env, 'EXPO_PUBLIC_PARAMETER_VILLE', '/custom/cities/'),
	];
	try {
		await store.dispatch(clientApi.endpoints.getClientsList.initiate({ company_id: 5 })).unwrap();
		await store.dispatch(citiesApi.endpoints.getCitiesList.initiate({ company_id: 5 })).unwrap();
		expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/custom/clients/', '/custom/cities/']);
		expect(adapter.mock.calls[1][0].params).toEqual({ company_id: 5 });
	} finally {
		env.forEach((variable) => variable.restore());
	}
});

it('uses the web endpoints for singular and bulk mutations, including empty DELETE responses', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, config.method === 'delete' ? undefined : { updated: 2 }, config.method === 'delete' ? 204 : 200),
	);
	await expect(store.dispatch(clientApi.endpoints.deleteClient.initiate({ id: 7 })).unwrap()).resolves.toBeUndefined();
	await store.dispatch(clientApi.endpoints.patchArchive.initiate({ id: 7, data: { archived: true } })).unwrap();
	await expect(
		store.dispatch(clientApi.endpoints.bulkDeleteClients.initiate({ ids: [7, 8] })).unwrap(),
	).resolves.toBeUndefined();
	await store.dispatch(clientApi.endpoints.bulkArchiveClients.initiate({ ids: [7, 8], archived: true })).unwrap();
	expect(
		adapter.mock.calls.map(([config]) => [config.url, config.method, config.data && JSON.parse(config.data)]),
	).toEqual([
		['/client/7/', 'delete', undefined],
		['/client/archive/7/', 'patch', { archived: true }],
		['/client/bulk_delete/', 'delete', { ids: [7, 8] }],
		['/client/bulk_archive/', 'patch', { ids: [7, 8], archived: true }],
	]);
});

it('invalidates active lists after success but keeps them after a rejected deletion', async () => {
	adapter.mockImplementation(async (config) => response(config, { count: 1, next: null, results: [{ id: 7 }] }));
	await store.dispatch(clientApi.endpoints.getClientsInfiniteList.initiate({ company_id: 5 })).unwrap();
	adapter.mockImplementation(async (config) => {
		if (config.method === 'delete')
			throw new AxiosError('Forbidden', '403', config, undefined, response(config, { message: 'Forbidden' }, 403));
		return response(config, { count: 1, next: null, results: [{ id: 7 }] });
	});
	await expect(store.dispatch(clientApi.endpoints.deleteClient.initiate({ id: 7 })).unwrap()).rejects.toMatchObject({
		status: 403,
	});
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(1);
	adapter.mockImplementation(async (config) =>
		response(config, config.method === 'get' ? { count: 0, next: null, results: [] } : undefined),
	);
	await store.dispatch(clientApi.endpoints.deleteClient.initiate({ id: 7 })).unwrap();
	await Promise.all(store.dispatch(clientApi.util.getRunningQueriesThunk()));
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
});
