import { Platform } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { articleApi } from './article';
import { citiesApi } from './parameter';

// Load Axios after the native FormData constructor, as React Native does at
// startup. Jest otherwise supplies the browser constructor before test imports.
jest.mock('axios', () => {
	globalThis.FormData = jest.requireActual('react-native/Libraries/Network/FormData').default;
	return jest.requireActual('axios');
});

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
		reducer: { [articleApi.reducerPath]: articleApi.reducer, [citiesApi.reducerPath]: citiesApi.reducer },
		middleware: (get) => get().concat(articleApi.middleware, citiesApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(articleApi.util.resetApiState());
	store.dispatch(citiesApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

describe('Article API', () => {
	it('generates an article reference for the requested company and sends article creation and edit payloads through axios', async () => {
		adapter.mockImplementation(async (config) =>
			response(config, config.method === 'get' ? { reference: 'ART020' } : { id: 8, ...JSON.parse(config.data) }),
		);
		await expect(
			store.dispatch(articleApi.endpoints.getCodeReference.initiate({ company_id: 5 })).unwrap(),
		).resolves.toEqual({ reference: 'ART020' });
		const data = {
			company: 5,
			type_article: 'Produit' as const,
			reference: 'ART020',
			designation: 'Article Atlas',
		};
		await store.dispatch(articleApi.endpoints.addArticle.initiate({ data })).unwrap();
		await store
			.dispatch(articleApi.endpoints.editArticle.initiate({ id: 8, data: { ...data, designation: 'Updated' } }))
			.unwrap();
		expect(
			adapter.mock.calls.map(([config]) => ({ method: config.method, url: config.url, params: config.params })),
		).toEqual(
			expect.arrayContaining([
				{ method: 'get', url: '/article/generate_reference_article/', params: { company_id: 5 } },
				{ method: 'post', url: '/article/', params: undefined },
				{ method: 'put', url: '/article/8/', params: undefined },
			]),
		);
		expect(JSON.parse(adapter.mock.calls.find(([config]) => config.method === 'post')![0].data)).toEqual(data);
	});

	it.each([false, true])(
		'sends company, search, types, classification and ordering for every page, archived=%s',
		async (archived) => {
			adapter.mockImplementation(async (config) =>
				response(config, {
					count: 2,
					previous: null,
					next: config.params.page === 1 ? 'https://example.invalid/article/?page=2' : null,
					results: [{ id: config.params.page, reference: `ART${config.params.page}` }],
				}),
			);
			const args = {
				company_id: 5,
				pageSize: 1,
				search: 'Atlas',
				type_article: 'Produit' as const,
				categorie_ids: '2,3',
				archived,
				ordering: '-designation',
			};
			await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate(args)).unwrap();
			await store
				.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate(args, { direction: 'forward' }))
				.unwrap();
			expect(adapter.mock.calls.map(([config]) => config.params)).toEqual(
				[1, 2].map((page) => ({
					company_id: 5,
					page_size: 1,
					page,
					pagination: true,
					search: 'Atlas',
					type_article: 'Produit' as const,
					categorie_ids: '2,3',
					archived,
					ordering: '-designation',
				})),
			);
			expect(articleApi.endpoints.getArticlesInfiniteList.select(args)(store.getState()).data?.pages).toHaveLength(2);
		},
	);

	it('keeps search and filters when selecting all matching articles without pagination', async () => {
		adapter.mockImplementation(async (config) => response(config, [{ id: 2 }, { id: 9 }]));
		await store
			.dispatch(
				articleApi.endpoints.getArticlesList.initiate({
					company_id: 5,
					with_pagination: false,
					search: 'Atlas',
					archived: false,
					categorie_ids: '2,3',
					reference__istartswith: 'ART',
					date_created_after: '2026-01-01',
				}),
			)
			.unwrap();
		expect(adapter.mock.calls[0][0]).toMatchObject({
			url: '/article/',
			method: 'get',
			params: {
				company_id: 5,
				pagination: false,
				search: 'Atlas',
				archived: false,
				categorie_ids: '2,3',
				reference__istartswith: 'ART',
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
		await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate({ company_id: 5 })).unwrap();
		await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate({ company_id: 11 })).unwrap();
		expect(
			articleApi.endpoints.getArticlesInfiniteList.select({ company_id: 5 })(store.getState()).data?.pages[0].results,
		).toEqual([{ id: 5 }]);
		expect(
			articleApi.endpoints.getArticlesInfiniteList.select({ company_id: 11 })(store.getState()).data?.pages[0].results,
		).toEqual([{ id: 11 }]);
	});

	it('reads configured endpoints rather than hardcoding paths', async () => {
		adapter.mockImplementation(async (config) => response(config, []));
		const env = [
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_ARTICLE_LIST', '/custom/articles/'),
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_PARAMETER_VILLE', '/custom/cities/'),
		];
		try {
			await store.dispatch(articleApi.endpoints.getArticlesList.initiate({ company_id: 5 })).unwrap();
			await store.dispatch(citiesApi.endpoints.getCitiesList.initiate({ company_id: 5 })).unwrap();
			expect(adapter.mock.calls.map(([config]) => config.url)).toEqual(['/custom/articles/', '/custom/cities/']);
			expect(adapter.mock.calls[1][0].params).toEqual({ company_id: 5 });
		} finally {
			env.forEach((variable) => variable.restore());
		}
	});

	it('uses the web endpoints for singular and bulk mutations, including empty DELETE responses', async () => {
		adapter.mockImplementation(async (config) =>
			response(config, config.method === 'delete' ? '' : { updated: 2 }, config.method === 'delete' ? 204 : 200),
		);
		await expect(store.dispatch(articleApi.endpoints.deleteArticle.initiate({ id: 7 })).unwrap()).resolves.toBe('');
		await store.dispatch(articleApi.endpoints.patchArchive.initiate({ id: 7, data: { archived: true } })).unwrap();
		await expect(
			store.dispatch(articleApi.endpoints.bulkDeleteArticles.initiate({ ids: [7, 8] })).unwrap(),
		).resolves.toBe('');
		await store.dispatch(articleApi.endpoints.bulkArchiveArticles.initiate({ ids: [7, 8], archived: true })).unwrap();
		expect(
			adapter.mock.calls.map(([config]) => [config.url, config.method, config.data && JSON.parse(config.data)]),
		).toEqual([
			['/article/7/', 'delete', undefined],
			['/article/archive/7/', 'patch', { archived: true }],
			['/article/bulk_delete/', 'delete', { ids: [7, 8] }],
			['/article/bulk_archive/', 'patch', { ids: [7, 8], archived: true }],
		]);
	});

	it('invalidates active lists after success but keeps them after a rejected deletion', async () => {
		adapter.mockImplementation(async (config) => response(config, { count: 1, next: null, results: [{ id: 7 }] }));
		await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate({ company_id: 5 })).unwrap();
		adapter.mockImplementation(async (config) => {
			if (config.method === 'delete')
				throw new AxiosError('Forbidden', '403', config, undefined, response(config, { message: 'Forbidden' }, 403));
			return response(config, { count: 1, next: null, results: [{ id: 7 }] });
		});
		await expect(store.dispatch(articleApi.endpoints.deleteArticle.initiate({ id: 7 })).unwrap()).rejects.toMatchObject(
			{
				status: 403,
			},
		);
		expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(1);
		adapter.mockImplementation(async (config) =>
			response(config, config.method === 'get' ? { count: 0, next: null, results: [] } : ''),
		);
		await store.dispatch(articleApi.endpoints.deleteArticle.initiate({ id: 7 })).unwrap();
		await Promise.all(store.dispatch(articleApi.util.getRunningQueriesThunk()));
		expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
	});

	it.each(['single', 'bulk'] as const)('refreshes both cached lists after a successful %s restore', async (action) => {
		let restored = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'patch') {
				restored = true;
				return response(config, action === 'bulk' ? { updated: 1 } : { id: 7, archived: false });
			}
			const results = config.params.archived === !restored ? [{ id: 7 }] : [];
			return response(config, { count: results.length, next: null, results });
		});
		const activeArgs = { company_id: 5, archived: false };
		const archivedArgs = { company_id: 5, archived: true };
		await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate(activeArgs)).unwrap();
		await store.dispatch(articleApi.endpoints.getArticlesInfiniteList.initiate(archivedArgs)).unwrap();
		const activeRows = () =>
			articleApi.endpoints.getArticlesInfiniteList.select(activeArgs)(store.getState()).data?.pages[0].results;
		const archivedRows = () =>
			articleApi.endpoints.getArticlesInfiniteList.select(archivedArgs)(store.getState()).data?.pages[0].results;
		expect(activeRows()).toEqual([]);
		expect(archivedRows()).toEqual([{ id: 7 }]);
		if (action === 'bulk')
			await store.dispatch(articleApi.endpoints.bulkArchiveArticles.initiate({ ids: [7], archived: false })).unwrap();
		else
			await store.dispatch(articleApi.endpoints.patchArchive.initiate({ id: 7, data: { archived: false } })).unwrap();
		await Promise.all(store.dispatch(articleApi.util.getRunningQueriesThunk()));
		expect(adapter.mock.calls.find(([config]) => config.method === 'patch')?.[0]).toMatchObject({
			url: action === 'bulk' ? '/article/bulk_archive/' : '/article/archive/7/',
			data: JSON.stringify(action === 'bulk' ? { ids: [7], archived: false } : { archived: false }),
		});
		expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(4);
		expect(activeRows()).toEqual([{ id: 7 }]);
		expect(archivedRows()).toEqual([]);
	});

	it('fetches article details from the configured root and exposes a retryable error', async () => {
		adapter.mockImplementationOnce(async (config) => {
			throw new AxiosError('Offline', 'ERR_NETWORK', config);
		});
		await expect(store.dispatch(articleApi.endpoints.getArticle.initiate({ id: 7 })).unwrap()).rejects.toMatchObject({
			status: 0,
		});
		adapter.mockImplementation(async (config) => response(config, { id: 7, company: 5, reference: 'ART007' }));
		await expect(
			store.dispatch(articleApi.endpoints.getArticle.initiate({ id: 7 }, { forceRefetch: true })).unwrap(),
		).resolves.toMatchObject({ id: 7, company: 5 });
		expect(adapter.mock.calls.at(-1)?.[0]).toMatchObject({ url: '/article/7/', method: 'get' });
	});

	it.each(['ios', 'android'] as const)('uploads the selected cached file as multipart on %s', async (platform) => {
		const os = jest.replaceProperty(Platform, 'OS', platform);
		adapter.mockImplementation(async (config) =>
			response(config, { total: 2, created: 1, errors: [{ row: 3, message: 'Référence existe' }] }),
		);
		try {
			await expect(
				store
					.dispatch(
						articleApi.endpoints.importArticles.initiate({
							company_id: 5,
							file: { uri: 'file:///cache/articles.csv', name: 'articles.csv', mimeType: 'text/csv' },
						}),
					)
					.unwrap(),
			).resolves.toMatchObject({ created: 1, errors: [{ row: 3, message: 'Référence existe' }] });
			const request = adapter.mock.calls[0][0];
			expect(request.url).toBe('/article/import/');
			expect(request.data).toBeInstanceOf(FormData);
			expect(request.headers.get('Content-Type')).not.toBe('application/json');
			const parts = (
				request.data as FormData & {
					getParts: () => Array<{ fieldName: string; string?: string; uri?: string; name?: string; type?: string }>;
				}
			).getParts();
			expect(parts).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						fieldName: 'file',
						uri: 'file:///cache/articles.csv',
						name: 'articles.csv',
						type: 'text/csv',
					}),
					expect.objectContaining({ fieldName: 'company_id', string: '5' }),
				]),
			);
		} finally {
			os.restore();
		}
	});

	it('requests the import guide for the selected company', async () => {
		adapter.mockImplementation(async (config) => response(config, { message: 'Sent' }));
		await store.dispatch(articleApi.endpoints.sendCSVExampleEmail.initiate({ company_id: 11 })).unwrap();
		expect(adapter.mock.calls[0][0]).toMatchObject({
			url: '/article/send-csv-example-email/',
			method: 'post',
			data: JSON.stringify({ company_id: 11 }),
		});
	});
});
