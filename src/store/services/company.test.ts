import { setupApiStore } from '@/__tests__/setupApiStore';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { companyApi } from '@/store/services/company';
import { auth } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: status === 204 ? 'No Content' : 'OK',
	headers: {},
});
const createStore = () =>
	configureStore({
		reducer: { [companyApi.reducerPath]: companyApi.reducer },
		middleware: (get) => get().concat(companyApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	adapter.mockImplementation(async (config) => response(config, { ok: true }));
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(companyApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

describe('Company API', () => {
	it('uses configured company list, detail and membership endpoints', async () => {
		const env = [
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_COMPANY_LIST', '/custom/company-list/'),
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_COMPANY_ROOT', '/custom/company'),
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_USER_COMPANIES_LIST', '/custom/memberships/'),
		];
		try {
			await store.dispatch(companyApi.endpoints.getCompaniesList.initiate({})).unwrap();
			await store.dispatch(companyApi.endpoints.getCompany.initiate({ id: 4 })).unwrap();
			await store.dispatch(companyApi.endpoints.getUserCompanies.initiate()).unwrap();
			expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
				'/custom/company-list/',
				'/custom/company/4/',
				'/custom/memberships/',
			]);
		} finally {
			env.forEach((variable) => variable.restore());
		}
	});

	it('forwards pagination, date filters and extra company filters', async () => {
		const data = { count: 1, next: null, previous: null, results: [{ id: 4, raison_sociale: 'Example' }] };
		adapter.mockImplementation(async (config) => response(config, data));
		await expect(
			store
				.dispatch(
					companyApi.endpoints.getCompaniesList.initiate({
						with_pagination: true,
						page: 2,
						pageSize: 15,
						search: 'Example',
						date_created_after: '2026-01-01',
						stock_management_enabled: true,
					}),
				)
				.unwrap(),
		).resolves.toEqual(data);
		expect(adapter.mock.calls[0][0]).toMatchObject({
			url: '/company/',
			method: 'get',
			params: {
				pagination: true,
				page: 2,
				page_size: 15,
				search: 'Example',
				date_created_after: '2026-01-01',
				stock_management_enabled: true,
			},
		});
	});

	it('supports an unpaginated company picker without requiring list options', async () => {
		const data = [{ id: 4, raison_sociale: 'Example' }];
		adapter.mockImplementation(async (config) => response(config, data));
		await expect(store.dispatch(companyApi.endpoints.getCompaniesList.initiate({})).unwrap()).resolves.toEqual(data);
		expect(adapter.mock.calls[0][0].params).toEqual({
			pagination: undefined,
			page: undefined,
			page_size: undefined,
			search: undefined,
		});
	});

	it('preserves the original unpaginated picker search contract', async () => {
		adapter.mockImplementation(async (config) => response(config, [{ id: 4 }, { id: 8 }]));
		await store
			.dispatch(
				companyApi.endpoints.getCompaniesList.initiate({
					with_pagination: false,
					search: 'Example',
					ICE__icontains: '123',
				}),
			)
			.unwrap();
		expect(adapter.mock.calls[0][0].params).toEqual({
			pagination: undefined,
			page: undefined,
			page_size: undefined,
			search: undefined,
			ICE__icontains: '123',
		});
	});

	it('sends selected IDs to the original bulk suspension endpoint and returns the actual count', async () => {
		adapter.mockImplementation(async (config) => response(config, { suspended: 1 }));
		await expect(
			store.dispatch(companyApi.endpoints.bulkSuspendCompanies.initiate({ ids: [4, 8] })).unwrap(),
		).resolves.toEqual({ suspended: 1 });
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/company/bulk-suspend/', method: 'post' });
		expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ ids: [4, 8] });
	});

	it('keeps membership roles and feature permissions in the user-company response', async () => {
		const data = [
			{
				id: 4,
				raison_sociale: 'Example',
				role: 'Caissier',
				uses_foreign_currency: true,
				stock_management_enabled: true,
				inventory_management_enabled: false,
				can_validate_factures: false,
				can_change_document_status: true,
			},
		];
		adapter.mockImplementation(async (config) => response(config, data));
		await expect(store.dispatch(companyApi.endpoints.getUserCompanies.initiate()).unwrap()).resolves.toEqual(data);
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/company/by_user/', method: 'get' });
	});

	it('sends a complete company PUT and refreshes subscribed detail and memberships', async () => {
		const data = {
			raison_sociale: 'Updated',
			email: 'company@example.invalid',
			nbr_employe: '1 à 5',
			civilite_responsable: 'Mme' as const,
			nom_responsable: 'Test',
			gsm_responsable: '',
			adresse: 'Address',
			telephone: '',
			fax: '',
			site_web: '',
			numero_du_compte: '',
			ICE: '123456789012345',
			registre_de_commerce: '',
			identifiant_fiscal: '',
			tax_professionnelle: '',
			CNSS: '',
			logo: 'https://example.invalid/logo.png',
			logo_cropped: 'https://example.invalid/crop.png',
			cachet: '',
			cachet_cropped: '',
			uses_foreign_currency: true,
			stock_management_enabled: true,
			inventory_management_enabled: false,
			managed_by: [{ pk: 7, role: 'Caissier', can_validate_factures: true, can_change_document_status: false }],
		};
		let edited = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'put') {
				edited = true;
				return response(config, { id: 4, ...data });
			}
			const company = { id: 4, raison_sociale: edited ? 'Updated' : 'Before' };
			return response(config, config.url === '/company/by_user/' ? [company] : company);
		});
		const detail = store.dispatch(companyApi.endpoints.getCompany.initiate({ id: 4 }));
		const memberships = store.dispatch(companyApi.endpoints.getUserCompanies.initiate());
		await Promise.all([detail.unwrap(), memberships.unwrap()]);
		await expect(
			store.dispatch(companyApi.endpoints.editCompany.initiate({ id: 4, data })).unwrap(),
		).resolves.toMatchObject({ id: 4, raison_sociale: 'Updated' });
		await Promise.all(store.dispatch(companyApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		const update = adapter.mock.calls.find(([config]) => config.method === 'put')![0];
		expect(update.url).toBe('/company/4/');
		expect(JSON.parse(update.data)).toEqual(data);
		expect(companyApi.endpoints.getCompany.select({ id: 4 })(store.getState()).data?.raison_sociale).toBe('Updated');
		expect(companyApi.endpoints.getUserCompanies.select()(store.getState()).data?.[0].raison_sociale).toBe('Updated');
		expect(adapter).toHaveBeenCalledTimes(5);
		detail.unsubscribe();
		memberships.unsubscribe();
	});

	it('creates with POST and suspends through the existing DELETE endpoint', async () => {
		adapter.mockImplementation(async (config) =>
			response(
				config,
				config.method === 'post' ? { id: 4, raison_sociale: 'New' } : '',
				config.method === 'post' ? 201 : 204,
			),
		);
		await expect(
			store.dispatch(companyApi.endpoints.addCompany.initiate({ data: { raison_sociale: 'New' } })).unwrap(),
		).resolves.toMatchObject({ id: 4 });
		await store.dispatch(companyApi.endpoints.suspendCompany.initiate({ id: 4 })).unwrap();
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/company/', method: 'post' });
		expect(adapter.mock.calls[1][0]).toMatchObject({ url: '/company/4/', method: 'delete' });
	});

	it.each(['single', 'bulk'])('automatically refreshes subscribed memberships after %s suspension', async (mode) => {
		const remaining = { id: 8, raison_sociale: 'Remaining Company' };
		let suspended = false;
		adapter.mockImplementation(async (config) => {
			if (config.method !== 'get') {
				suspended = true;
				return response(config, mode === 'bulk' ? { suspended: 1 } : '', mode === 'bulk' ? 200 : 204);
			}
			return response(config, suspended ? [remaining] : [{ id: 4, raison_sociale: 'Company Four' }, remaining]);
		});
		const subscription = store.dispatch(companyApi.endpoints.getUserCompanies.initiate());
		await subscription.unwrap();
		if (mode === 'single') await store.dispatch(companyApi.endpoints.suspendCompany.initiate({ id: 4 })).unwrap();
		else await store.dispatch(companyApi.endpoints.bulkSuspendCompanies.initiate({ ids: [4] })).unwrap();
		await Promise.all(store.dispatch(companyApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		expect(companyApi.endpoints.getUserCompanies.select()(store.getState()).data).toEqual([remaining]);
		expect(adapter.mock.calls.map(([config]) => config.method)).toEqual([
			'get',
			mode === 'bulk' ? 'post' : 'delete',
			'get',
		]);
		subscription.unsubscribe();
	});

	it('keeps a denied company edit as a typed backend permission error', async () => {
		const data = { status_code: 403, message: 'Forbidden', details: { error: ['No permission'] } };
		adapter.mockImplementation(async (config) => {
			throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, response(config, data, 403));
		});
		await expect(
			store.dispatch(companyApi.endpoints.editCompany.initiate({ id: 4, data: { raison_sociale: 'Denied' } })).unwrap(),
		).rejects.toEqual({ status: 403, data });
	});

	describe('infinite list', () => {
		const endpoint = companyApi.endpoints.getCompaniesInfiniteList;

		it('starts at one, follows Django next-page numbers and carries server filters until the terminal page', async () => {
			const filters = {
				search: 'Example',
				ICE__icontains: '123',
				email__isempty: false,
				date_created_after: '2026-01-01',
				ordering: '-date_created',
			};
			const args = { ...filters, with_pagination: false, page: 99 };
			adapter.mockImplementation(async (config) =>
				response(config, {
					count: 11,
					next: config.params.page === 1 ? 'https://example.invalid/api/company/?page=3' : null,
					previous: null,
					results: [{ id: config.params.page }],
				}),
			);
			const query = store.dispatch(endpoint.initiate(args));
			await query.unwrap();
			await store.dispatch(endpoint.initiate(args, { direction: 'forward', subscribe: false })).unwrap();
			expect(adapter.mock.calls.map(([config]) => ({ url: config.url, params: config.params }))).toEqual([
				{ url: '/company/', params: { ...filters, pagination: true, page: 1, page_size: 10 } },
				{ url: '/company/', params: { ...filters, pagination: true, page: 3, page_size: 10 } },
			]);
			expect(endpoint.select(args)(store.getState()).data?.pageParams).toEqual([1, 3]);
			expect(endpoint.select(args)(store.getState()).hasNextPage).toBe(false);
			await store.dispatch(endpoint.initiate(args, { direction: 'forward', subscribe: false })).unwrap();
			expect(adapter).toHaveBeenCalledTimes(2);
			query.unsubscribe();
		});

		it('keeps search, filter and page-size combinations in separate RTK caches', async () => {
			adapter.mockImplementation(async (config) =>
				response(config, {
					count: 30,
					next: config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: [{ id: config.params.page, search: config.params.search, filter: config.params.email__isempty }],
				}),
			);
			const firstArgs = { search: 'First', email__isempty: true, pageSize: 25 };
			const filteredArgs = { ...firstArgs, email__isempty: false };
			const searchedArgs = { ...firstArgs, search: 'Second' };
			const first = store.dispatch(endpoint.initiate(firstArgs));
			await first.unwrap();
			const filtered = store.dispatch(endpoint.initiate(filteredArgs));
			const searched = store.dispatch(endpoint.initiate(searchedArgs));
			await Promise.all([filtered.unwrap(), searched.unwrap()]);
			await store.dispatch(endpoint.initiate(firstArgs, { direction: 'forward', subscribe: false })).unwrap();
			expect(endpoint.select(firstArgs)(store.getState()).data?.pageParams).toEqual([1, 2]);
			expect(endpoint.select(filteredArgs)(store.getState()).data?.pageParams).toEqual([1]);
			expect(endpoint.select(searchedArgs)(store.getState()).data?.pages[0].results).toEqual([
				{ id: 1, search: 'Second', filter: true },
			]);
			expect(adapter.mock.calls.every(([config]) => config.params.page_size === 25)).toBe(true);
			expect(adapter).toHaveBeenCalledTimes(4);
			first.unsubscribe();
			filtered.unsubscribe();
			searched.unsubscribe();
		});

		it('retains loaded records after a next-page error and retries the same page', async () => {
			let failed = false;
			adapter.mockImplementation(async (config) => {
				if (config.params.page === 2 && !failed) {
					failed = true;
					throw new AxiosError(
						'Temporary failure',
						'ERR_BAD_RESPONSE',
						config,
						undefined,
						response(config, { message: 'Temporary failure' }, 503),
					);
				}
				return response(config, {
					count: 11,
					next: config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: [{ id: config.params.page }],
				});
			});
			const query = store.dispatch(endpoint.initiate({}));
			await query.unwrap();
			await expect(
				store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false })).unwrap(),
			).rejects.toMatchObject({ status: 503 });
			expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1]);
			expect(endpoint.select({})(store.getState()).isFetchNextPageError).toBe(true);
			await store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false })).unwrap();
			expect(adapter.mock.calls.map(([config]) => config.params.page)).toEqual([1, 2, 2]);
			expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1, 2]);
			expect(endpoint.select({})(store.getState()).isFetchNextPageError).toBe(false);
			query.unsubscribe();
		});

		it.each([false, true])('refreshes only the first page after suspension (bulk=%s)', async (bulk) => {
			let removed = false;
			adapter.mockImplementation(async (config) => {
				if (config.method === 'delete' || config.method === 'post') {
					removed = true;
					return response(config, '', 204);
				}
				if (removed && config.params.page !== 1)
					throw new AxiosError('Page disappeared', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 404));
				return response(config, {
					count: removed ? 1 : 11,
					next: !removed && config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: removed ? [{ id: 1 }] : [{ id: config.params.page === 1 ? 1 : 8 }],
				});
			});
			const query = store.dispatch(endpoint.initiate({}));
			await query.unwrap();
			await store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false })).unwrap();
			await (
				bulk
					? store.dispatch(companyApi.endpoints.bulkSuspendCompanies.initiate({ ids: [8] }))
					: store.dispatch(companyApi.endpoints.suspendCompany.initiate({ id: 8 }))
			).unwrap();
			await Promise.all(store.dispatch(companyApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
			expect(
				adapter.mock.calls.filter(([config]) => config.method === 'get').map(([config]) => config.params.page),
			).toEqual([1, 2, 1]);
			expect(endpoint.select({})(store.getState()).data).toMatchObject({
				pageParams: [1],
				pages: [{ count: 1, next: null, results: [{ id: 1 }] }],
			});
			expect(endpoint.select({})(store.getState()).isError).toBe(false);
			query.unsubscribe();
		});

		it.each([false, true])('preserves all loaded pages after rejected suspension (bulk=%s)', async (bulk) => {
			const error = { message: 'No permission to suspend this company' };
			adapter.mockImplementation(async (config) => {
				if (config.method === 'delete' || config.method === 'post')
					throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, response(config, error, 403));
				return response(config, {
					count: 11,
					next: config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: [{ id: config.params.page === 1 ? 1 : 8 }],
				});
			});
			const query = store.dispatch(endpoint.initiate({}));
			await query.unwrap();
			await store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false })).unwrap();
			const cached = endpoint.select({})(store.getState()).data;
			await expect(
				(bulk
					? store.dispatch(companyApi.endpoints.bulkSuspendCompanies.initiate({ ids: [8] }))
					: store.dispatch(companyApi.endpoints.suspendCompany.initiate({ id: 8 }))
				).unwrap(),
			).rejects.toEqual({
				status: 403,
				data: { ...error, status_code: 403, details: { error: [error.message] } },
			});
			await Promise.all(store.dispatch(companyApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
			expect(
				adapter.mock.calls.filter(([config]) => config.method === 'get').map(([config]) => config.params.page),
			).toEqual([1, 2]);
			expect(adapter).toHaveBeenCalledTimes(3);
			expect(endpoint.select({})(store.getState()).data).toBe(cached);
			expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1, 2]);
			expect(endpoint.select({})(store.getState()).isError).toBe(false);
			query.unsubscribe();
		});

		it('replaces cached pages with a fresh first page when pulled to refresh', async () => {
			adapter.mockImplementation(async (config) =>
				response(config, {
					count: 11,
					next: config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: [{ id: config.params.page }],
				}),
			);
			const query = store.dispatch(endpoint.initiate({}));
			await query.unwrap();
			await store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false })).unwrap();
			await query.refetch().unwrap();
			expect(adapter.mock.calls.map(([config]) => config.params.page)).toEqual([1, 2, 1]);
			expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1]);
			expect(endpoint.select({})(store.getState()).hasNextPage).toBe(true);
			query.unsubscribe();
		});

		it('deduplicates concurrent requests for the same next page', async () => {
			let finishNextPage!: () => void;
			let notifyNextPage!: () => void;
			const nextPageStarted = new Promise<void>((resolve) => {
				notifyNextPage = resolve;
			});
			adapter.mockImplementation((config) => {
				const data = {
					count: 11,
					next: config.params.page === 1 ? '?page=2' : null,
					previous: null,
					results: [{ id: config.params.page }],
				};
				if (config.params.page === 1) return Promise.resolve(response(config, data));
				return new Promise((resolve) => {
					finishNextPage = () => resolve(response(config, data));
					notifyNextPage();
				});
			});
			const query = store.dispatch(endpoint.initiate({}));
			await query.unwrap();
			const firstNext = store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false }));
			await nextPageStarted;
			const duplicateNext = store.dispatch(endpoint.initiate({}, { direction: 'forward', subscribe: false }));
			finishNextPage();
			await Promise.all([firstNext.unwrap(), duplicateNext.unwrap()]);
			expect(adapter).toHaveBeenCalledTimes(2);
			expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1, 2]);
			query.unsubscribe();
		});
	});

	describe('companyApi endpoints', () => {
		const storeRef = setupApiStore(companyApi);

		it('getCompaniesList query should return mocked data', async () => {
			const result = await storeRef.store.dispatch(
				companyApi.endpoints.getCompaniesList.initiate({
					with_pagination: true,
					page: 1,
					pageSize: 10,
					search: '',
				}),
			);
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});

		it('getCompany query should return mocked data', async () => {
			const result = await storeRef.store.dispatch(companyApi.endpoints.getCompany.initiate({ id: 1 }));
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});

		it('getUserCompanies query should return mocked data', async () => {
			const result = await storeRef.store.dispatch(companyApi.endpoints.getUserCompanies.initiate());
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});

		it('suspendCompany mutation should return mocked data', async () => {
			const result = await storeRef.store.dispatch(companyApi.endpoints.suspendCompany.initiate({ id: 1 }));
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});

		it('editCompany mutation should return mocked data', async () => {
			const result = await storeRef.store.dispatch(
				companyApi.endpoints.editCompany.initiate({
					id: 1,
					data: { raison_sociale: 'Updated Co' },
				}),
			);
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});

		it('addCompany mutation should return mocked data', async () => {
			const result = await storeRef.store.dispatch(
				companyApi.endpoints.addCompany.initiate({
					data: { raison_sociale: 'New Co' },
				}),
			);
			expect(result.error).toBeUndefined();
			expect(result.data).toEqual({ ok: true });
		});
	});
});
