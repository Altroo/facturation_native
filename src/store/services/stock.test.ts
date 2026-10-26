import { configureStore, isAction, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { stockApi } from './stock';
import { articleApi } from './article';
import { logistiqueApi } from './logistique';
import { stockReceipt } from '@/__tests__/stockFixtures';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const actions: UnknownAction[] = [];
const recordActions: Middleware = () => (next) => (action) => {
	if (isAction(action)) actions.push(action);
	return next(action);
};
const createStore = () =>
	configureStore({
		reducer: {
			[stockApi.reducerPath]: stockApi.reducer,
			[articleApi.reducerPath]: articleApi.reducer,
			[logistiqueApi.reducerPath]: logistiqueApi.reducer,
		},
		middleware: (get) =>
			get().concat(recordActions, stockApi.middleware, articleApi.middleware, logistiqueApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	actions.length = 0;
	auth.instance.defaults.adapter = adapter;
	adapter.mockImplementation(async (config) => ({
		config,
		status: 200,
		statusText: 'OK',
		headers: {},
		data:
			config.method === 'get'
				? {
						count: 2,
						next: config.params?.page === 1 ? '?page=2' : null,
						previous: null,
						results: [{ id: config.params?.page }],
					}
				: stockReceipt,
	}));
	store = createStore();
});
afterEach(async () => {
	store.dispatch(stockApi.util.resetApiState());
	store.dispatch(articleApi.util.resetApiState());
	store.dispatch(logistiqueApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it.each([
	['getStockBalancesInfiniteList', 'balances'],
	['getStockMovementsInfiniteList', 'movements'],
	['getStockReceiptsInfiniteList', 'receipts'],
	['getInventoriesInfiniteList', 'inventories'],
] as const)('preserves server filters and company on every %s page', async (name, path) => {
	const args = {
		company_id: 5,
		article_id: 7,
		search: 'Atlas',
		ordering: '-date_created',
		pageSize: 1,
		page: 99,
		filters: { filter_groups: JSON.stringify([{ quantity__gte: '2' }, { note__icontains: 'test' }]) },
	};
	const request = async (direction?: 'forward') => {
		const options = { direction };
		if (name === 'getStockBalancesInfiniteList')
			return store.dispatch(stockApi.endpoints.getStockBalancesInfiniteList.initiate(args, options)).unwrap();
		if (name === 'getStockMovementsInfiniteList')
			return store.dispatch(stockApi.endpoints.getStockMovementsInfiniteList.initiate(args, options)).unwrap();
		if (name === 'getStockReceiptsInfiniteList')
			return store.dispatch(stockApi.endpoints.getStockReceiptsInfiniteList.initiate(args, options)).unwrap();
		return store.dispatch(stockApi.endpoints.getInventoriesInfiniteList.initiate(args, options)).unwrap();
	};
	await request();
	await request('forward');
	expect(adapter.mock.calls.map(([config]) => ({ url: config.url, params: config.params }))).toEqual(
		[1, 2].map((page) => ({
			url: `/stock/${path}/`,
			params: {
				company_id: 5,
				article_id: 7,
				search: 'Atlas',
				ordering: '-date_created',
				filter_groups: args.filters.filter_groups,
				page_size: 1,
				page,
				pagination: true,
			},
		})),
	);
});

it.each([
	['getStockBalance', 'balances'],
	['getStockMovement', 'movements'],
	['getStockReceipt', 'receipts'],
	['getInventory', 'inventories'],
] as const)('scopes %s details to the current company', async (name, path) => {
	const args = { id: 11, company_id: 5 };
	if (name === 'getStockBalance') await store.dispatch(stockApi.endpoints.getStockBalance.initiate(args)).unwrap();
	else if (name === 'getStockMovement')
		await store.dispatch(stockApi.endpoints.getStockMovement.initiate(args)).unwrap();
	else if (name === 'getStockReceipt') await store.dispatch(stockApi.endpoints.getStockReceipt.initiate(args)).unwrap();
	else await store.dispatch(stockApi.endpoints.getInventory.initiate(args)).unwrap();
	expect(adapter.mock.calls[0]![0]).toMatchObject({
		url: `/stock/${path}/11/`,
		method: 'get',
		params: { company_id: 5 },
	});
});

it('posts all adjustment fields with a signed quantity', async () => {
	const data = {
		company_id: 5,
		article: 7,
		emplacement: 2,
		movement_type: 'adjustment' as const,
		quantity: -1.25,
		reason: 'Correction',
	};
	await store.dispatch(stockApi.endpoints.createStockAdjustment.initiate(data)).unwrap();
	expect(adapter.mock.calls[0]![0].url).toBe('/stock/adjustments/');
	expect(JSON.parse(adapter.mock.calls[0]![0].data)).toEqual(data);
});

it.each(['validateStockReceipt', 'cancelStockReceipt', 'validateInventory'] as const)(
	'refreshes stock and article caches only on successful %s',
	async (name) => {
		const request = (id: number) => {
			const args = { company_id: 5, id };
			return name === 'validateStockReceipt'
				? store.dispatch(stockApi.endpoints.validateStockReceipt.initiate(args)).unwrap()
				: name === 'cancelStockReceipt'
					? store.dispatch(stockApi.endpoints.cancelStockReceipt.initiate(args)).unwrap()
					: store.dispatch(stockApi.endpoints.validateInventory.initiate(args)).unwrap();
		};
		await request(31);
		await jest.runOnlyPendingTimersAsync();
		expect(actions.filter(articleApi.util.invalidateTags.match)).toEqual([
			expect.objectContaining({ payload: ['Article'] }),
		]);
		if (name !== 'validateInventory')
			expect(actions.filter(logistiqueApi.util.invalidateTags.match)).toEqual([
				expect.objectContaining({
					payload: [
						{ type: 'Logistique', id: 'LIST' },
						{ type: 'Logistique', id: 41 },
					],
				}),
			]);
		const post = adapter.mock.calls.find(([config]) => config.method === 'post')![0];
		expect(post.url).toBe(
			`/stock/${name === 'validateInventory' ? 'inventories' : 'receipts'}/31/${name === 'cancelStockReceipt' ? 'cancel' : 'validate'}/`,
		);
		expect(JSON.parse(post.data)).toEqual({ company_id: 5 });
		actions.length = 0;
		adapter.mockImplementation(async (config) =>
			Promise.reject(
				new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, {
					config,
					status: 403,
					statusText: 'Denied',
					headers: {},
					data: { details: 'Denied' },
				}),
			),
		);
		await expect(request(32)).rejects.toMatchObject({ status: 403 });
		await jest.runOnlyPendingTimersAsync();
		expect(actions.filter(articleApi.util.invalidateTags.match)).toHaveLength(0);
		expect(actions.filter(logistiqueApi.util.invalidateTags.match)).toHaveLength(0);
	},
);

it('creates drafts without altering their quantities before validation', async () => {
	const receipt = {
		company_id: 5,
		logistics_order: 41,
		reference: 'REC',
		note: 'Partiel',
		lines: [{ logistics_line: 61, article: 7, emplacement: 2, quantity: 2.5 }],
	};
	const inventory = {
		company_id: 5,
		emplacement: 2,
		reference: 'INV',
		note: 'Comptage',
		lines: [{ article: 7, counted_quantity: 0 }],
	};
	await store.dispatch(stockApi.endpoints.createStockReceipt.initiate(receipt)).unwrap();
	await store.dispatch(stockApi.endpoints.createInventory.initiate(inventory)).unwrap();
	expect(adapter.mock.calls.map(([config]) => [config.url, JSON.parse(config.data)])).toEqual([
		['/stock/receipts/', receipt],
		['/stock/inventories/', inventory],
	]);
});
