import { setupApiStore } from '@/__tests__/setupApiStore';
import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { accountApi, groupApi, profilApi, usersApi } from '@/store/services/account';
import { auth, publicInstance } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		auth: { instance: create() },
		publicInstance: create(),
	};
});

const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const publicAdapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: status === 204 ? 'No Content' : 'OK',
	headers: {},
});
const createStore = () =>
	configureStore({
		reducer: {
			[accountApi.reducerPath]: accountApi.reducer,
			[profilApi.reducerPath]: profilApi.reducer,
			[usersApi.reducerPath]: usersApi.reducer,
			[groupApi.reducerPath]: groupApi.reducer,
		},
		middleware: (get) =>
			get().concat(accountApi.middleware, profilApi.middleware, usersApi.middleware, groupApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	adapter.mockImplementation(async (config) => response(config, { ok: true }));
	publicAdapter.mockReset();
	publicAdapter.mockImplementation(async (config) => response(config, { ok: true }));
	auth.instance.defaults.adapter = adapter;
	publicInstance.defaults.adapter = publicAdapter;
	store = createStore();
});
afterEach(async () => {
	for (const api of [accountApi, profilApi, usersApi, groupApi]) store.dispatch(api.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

describe('Account API', () => {
	it('uses Expo endpoint overrides for user queries and profile requests', async () => {
		const env = [
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_USERS_ROOT', '/custom/users/'),
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_ACCOUNT_PROFIL', '/custom/profile/'),
		];
		try {
			await store.dispatch(usersApi.endpoints.getUsersList.initiate({})).unwrap();
			await store.dispatch(usersApi.endpoints.getUser.initiate({ id: 7 })).unwrap();
			await store.dispatch(profilApi.endpoints.getProfil.initiate()).unwrap();
			expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
				'/custom/users/',
				'/custom/users/7/',
				'/custom/profile/',
			]);
		} finally {
			env.forEach((variable) => variable.restore());
		}
	});

	it('keeps paginated users and date filters in the Django request contract', async () => {
		const result = { count: 1, next: null, previous: null, results: [{ id: 7, first_name: 'Test' }] };
		adapter.mockImplementation(async (config) => response(config, result));
		await expect(
			store
				.dispatch(
					usersApi.endpoints.getUsersList.initiate({
						with_pagination: true,
						page: 2,
						pageSize: 10,
						search: 'Test',
						date_joined_after: '2026-01-01',
						last_login_before: '2026-10-01',
						is_active: true,
					}),
				)
				.unwrap(),
		).resolves.toEqual(result);
		expect(adapter).toHaveBeenCalledWith(
			expect.objectContaining({
				url: '/account/users/',
				method: 'get',
				params: {
					pagination: true,
					page: 2,
					page_size: 10,
					search: 'Test',
					date_joined_after: '2026-01-01',
					last_login_before: '2026-10-01',
					is_active: true,
				},
				signal: expect.anything(),
			}),
		);
	});

	it('supports the unpaginated users list used by the company manager picker', async () => {
		const users = [{ id: 7, first_name: 'Test', last_name: 'User' }];
		adapter.mockImplementation(async (config) => response(config, users));
		await expect(
			store
				.dispatch(usersApi.endpoints.getUsersList.initiate({ with_pagination: false, search: 'Ignored for picker' }))
				.unwrap(),
		).resolves.toEqual(users);
		expect(adapter.mock.calls[0][0].params).toEqual({
			pagination: undefined,
			page: undefined,
			page_size: undefined,
			search: undefined,
		});
	});

	it('creates a user without assuming the 204 response contains a user record', async () => {
		const companies = [
			{
				membership_id: 0,
				company_id: 4,
				raison_sociale: 'Example',
				role: 'Commercial',
				can_validate_factures: false,
				can_change_document_status: true,
			},
		];
		const data = {
			email: 'new@example.invalid',
			first_name: 'New',
			last_name: 'User',
			gender: 'Femme',
			is_active: true,
			is_staff: false,
			companies,
		};
		adapter.mockImplementation(async (config) => response(config, '', 204));
		await expect(store.dispatch(usersApi.endpoints.addUser.initiate({ data })).unwrap()).resolves.toBe('');
		const config = adapter.mock.calls[0][0];
		expect(config).toMatchObject({ url: '/account/users/', method: 'post' });
		expect(JSON.parse(config.data)).toEqual(data);
	});

	it('updates a user with membership IDs and both permission flags intact', async () => {
		const companies = [
			{
				membership_id: 12,
				company_id: 4,
				raison_sociale: 'Example',
				role: 'Caissier',
				can_validate_factures: true,
				can_change_document_status: false,
			},
		];
		const data = { first_name: 'Updated', gender: 'Homme', is_active: false, is_staff: false, companies };
		adapter.mockImplementation(async (config) => response(config, { id: 7, ...data }));
		await store.dispatch(usersApi.endpoints.editUser.initiate({ id: 7, data })).unwrap();
		const config = adapter.mock.calls[0][0];
		expect(config).toMatchObject({ url: '/account/users/7/', method: 'put' });
		expect(JSON.parse(config.data)).toEqual(data);
	});

	it('preserves duplicate-email field errors for Formik', async () => {
		const data = { status_code: 400, message: 'Invalid email', details: { email: ['Already used'] } };
		adapter.mockImplementation(async (config) => {
			throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, response(config, data, 400));
		});
		await expect(
			store.dispatch(usersApi.endpoints.checkEmail.initiate({ email: 'used@example.invalid' })).unwrap(),
		).rejects.toEqual({ status: 400, data });
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/account/check_email/', method: 'post' });
	});

	it('refreshes a subscribed users list after deletion', async () => {
		let removed = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'delete') {
				removed = true;
				return response(config, '', 204);
			}
			return response(config, removed ? [] : [{ id: 7 }]);
		});
		const query = store.dispatch(usersApi.endpoints.getUsersList.initiate({}));
		await query.unwrap();
		await store.dispatch(usersApi.endpoints.deleteUser.initiate({ id: 7 })).unwrap();
		await Promise.all(store.dispatch(usersApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		expect(adapter).toHaveBeenCalledTimes(3);
		expect(adapter.mock.calls[1][0]).toMatchObject({ url: '/account/users/7/', method: 'delete' });
		expect(usersApi.endpoints.getUsersList.select({})(store.getState()).data).toEqual([]);
		query.unsubscribe();
	});

	it('bulk deletes with the original DELETE body and refreshes the subscribed users list', async () => {
		let removed = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'delete') {
				removed = true;
				return response(config, '', 204);
			}
			return response(config, removed ? [] : [{ id: 7 }, { id: 8 }]);
		});
		const query = store.dispatch(usersApi.endpoints.getUsersList.initiate({}));
		await query.unwrap();
		await store.dispatch(usersApi.endpoints.bulkDeleteUsers.initiate({ ids: [7, 8] })).unwrap();
		await Promise.all(store.dispatch(usersApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		expect(adapter.mock.calls[1][0]).toMatchObject({ url: '/account/users/bulk_delete/', method: 'delete' });
		expect(JSON.parse(adapter.mock.calls[1][0].data)).toEqual({ ids: [7, 8] });
		expect(usersApi.endpoints.getUsersList.select({})(store.getState()).data).toEqual([]);
		query.unsubscribe();
	});

	it('returns profile PATCH fields as-is and refreshes the full subscribed profile', async () => {
		const current = { id: 7, email: 'user@example.invalid', first_name: 'Before', gender: 'Homme', is_staff: true };
		const partial = { first_name: 'After', gender: 'F' };
		let edited = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'patch') {
				edited = true;
				return response(config, partial);
			}
			return response(config, edited ? { ...current, ...partial, gender: 'Femme' } : current);
		});
		const query = store.dispatch(profilApi.endpoints.getProfil.initiate());
		await query.unwrap();
		const data = { first_name: 'After', gender: 'Femme' };
		await expect(store.dispatch(profilApi.endpoints.editProfil.initiate({ data })).unwrap()).resolves.toEqual(partial);
		await Promise.all(store.dispatch(profilApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		expect(adapter.mock.calls[1][0]).toMatchObject({ url: '/account/profil/', method: 'patch' });
		expect(JSON.parse(adapter.mock.calls[1][0].data)).toEqual(data);
		expect(profilApi.endpoints.getProfil.select()(store.getState()).data).toMatchObject({
			...current,
			first_name: 'After',
			gender: 'Femme',
		});
		query.unsubscribe();
	});

	it('uses the password-change endpoint and keeps confirmation in the request', async () => {
		const data = {
			old_password: 'old-example-pass',
			new_password: 'new-example-pass',
			new_password2: 'new-example-pass',
		};
		adapter.mockImplementation(async (config) => response(config, '', 204));
		await store.dispatch(profilApi.endpoints.editPassword.initiate({ data })).unwrap();
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/account/password_change/', method: 'put' });
		expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual(data);
	});

	it('automatically refreshes a subscribed profile after changing the password', async () => {
		let changed = false;
		adapter.mockImplementation(async (config) => {
			if (config.method === 'put') {
				changed = true;
				return response(config, '', 204);
			}
			return response(config, { id: 7, default_password_set: !changed });
		});
		const subscription = store.dispatch(profilApi.endpoints.getProfil.initiate());
		await subscription.unwrap();
		await store
			.dispatch(
				profilApi.endpoints.editPassword.initiate({
					data: {
						old_password: 'old-example-pass',
						new_password: 'new-example-pass',
						new_password2: 'new-example-pass',
					},
				}),
			)
			.unwrap();
		await Promise.all(store.dispatch(profilApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
		expect(profilApi.endpoints.getProfil.select()(store.getState()).data).toMatchObject({
			id: 7,
			default_password_set: false,
		});
		expect(adapter.mock.calls.map(([config]) => config.method)).toEqual(['get', 'put', 'get']);
		subscription.unsubscribe();
	});

	it('loads the existing group endpoint and preserves the role names', async () => {
		const data = { group_titles: ['Caissier', 'Commercial', 'Comptable', 'Lecture'] };
		adapter.mockImplementation(async (config) => response(config, data));
		await expect(store.dispatch(groupApi.endpoints.getGroups.initiate()).unwrap()).resolves.toEqual(data);
		expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/account/group/', method: 'get' });
	});

	it('requests a reset code through the public transport without requiring a session', async () => {
		publicAdapter.mockImplementation(async (config) => response(config, '', 204));
		await store
			.dispatch(accountApi.endpoints.sendPasswordResetCode.initiate({ email: 'recovery@example.invalid' }))
			.unwrap();
		expect(publicAdapter.mock.calls[0][0]).toMatchObject({ url: '/account/send_password_reset/', method: 'post' });
		expect(JSON.parse(publicAdapter.mock.calls[0][0].data)).toEqual({ email: 'recovery@example.invalid' });
		expect(adapter).not.toHaveBeenCalled();
	});

	it('verifies all six code digits and safely encodes the email path segment', async () => {
		publicAdapter.mockImplementation(async (config) => response(config, '', 204));
		await store
			.dispatch(accountApi.endpoints.passwordReset.initiate({ email: 'a+b@example.invalid', code: '012345' }))
			.unwrap();
		expect(publicAdapter.mock.calls[0][0]).toMatchObject({
			url: '/account/password_reset/a%2Bb%40example.invalid/012345/',
			method: 'get',
		});
		expect(adapter).not.toHaveBeenCalled();
	});

	it('uses PUT with the original password-reset payload and accepts an empty success response', async () => {
		const data = {
			email: 'recovery@example.invalid',
			code: '012345',
			new_password: 'new-example-pass',
			new_password2: 'new-example-pass',
		};
		publicAdapter.mockImplementation(async (config) => response(config, '', 204));
		await expect(store.dispatch(accountApi.endpoints.SetPassword.initiate(data)).unwrap()).resolves.toBe('');
		expect(publicAdapter.mock.calls[0][0]).toMatchObject({ url: '/account/password_reset/', method: 'put' });
		expect(JSON.parse(publicAdapter.mock.calls[0][0].data)).toEqual(data);
		expect(adapter).not.toHaveBeenCalled();
	});

	it('preserves expired-code errors from the public endpoint for the recovery form', async () => {
		const data = { status_code: 400, message: 'Invalid code', details: { code: ['Code expired'] } };
		publicAdapter.mockImplementation(async (config) => {
			throw new AxiosError('Bad request', 'ERR_BAD_REQUEST', config, undefined, response(config, data, 400));
		});
		await expect(
			store
				.dispatch(accountApi.endpoints.passwordReset.initiate({ email: 'recovery@example.invalid', code: '012345' }))
				.unwrap(),
		).rejects.toEqual({ status: 400, data });
	});

	describe('infinite list', () => {
		const endpoint = usersApi.endpoints.getUsersInfiniteList;

		it('starts at one, follows Django next-page numbers and carries server filters until the terminal page', async () => {
			const filters = {
				search: 'Test',
				gender: 'F',
				is_active: false,
				date_joined_after: '2026-01-01',
				ordering: '-date_joined',
			};
			const args = { ...filters, with_pagination: false, page: 99 };
			adapter.mockImplementation(async (config) =>
				response(config, {
					count: 11,
					next: config.params.page === 1 ? 'https://example.invalid/api/account/users/?page=3' : null,
					previous: null,
					results: [{ id: config.params.page }],
				}),
			);
			const query = store.dispatch(endpoint.initiate(args));
			await query.unwrap();
			await store.dispatch(endpoint.initiate(args, { direction: 'forward', subscribe: false })).unwrap();
			expect(adapter.mock.calls.map(([config]) => ({ url: config.url, params: config.params }))).toEqual([
				{ url: '/account/users/', params: { ...filters, pagination: true, page: 1, page_size: 10 } },
				{ url: '/account/users/', params: { ...filters, pagination: true, page: 3, page_size: 10 } },
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
					results: [{ id: config.params.page, search: config.params.search, filter: config.params.is_active }],
				}),
			);
			const firstArgs = { search: 'First', is_active: true, pageSize: 25 };
			const filteredArgs = { ...firstArgs, is_active: false };
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

		it('refreshes only the first page after deletion invalidates a previously longer list', async () => {
			let removed = false;
			adapter.mockImplementation(async (config) => {
				if (config.method === 'delete') {
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
			await store.dispatch(usersApi.endpoints.deleteUser.initiate({ id: 8 })).unwrap();
			await Promise.all(store.dispatch(usersApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
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

		it.each(['deleteUser', 'bulkDeleteUsers'] as const)(
			'preserves all loaded pages without refetching when %s is rejected',
			async (mutation) => {
				const error = { message: 'No permission to delete this user' };
				adapter.mockImplementation(async (config) => {
					if (config.method === 'delete')
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
				const deletion =
					mutation === 'deleteUser'
						? store.dispatch(usersApi.endpoints.deleteUser.initiate({ id: 8 }))
						: store.dispatch(usersApi.endpoints.bulkDeleteUsers.initiate({ ids: [8] }));
				await expect(deletion.unwrap()).rejects.toEqual({
					status: 403,
					data: { ...error, status_code: 403, details: { error: [error.message] } },
				});
				await Promise.all(store.dispatch(usersApi.util.getRunningQueriesThunk()).map((request) => request.unwrap()));
				expect(
					adapter.mock.calls.filter(([config]) => config.method === 'get').map(([config]) => config.params.page),
				).toEqual([1, 2]);
				expect(adapter).toHaveBeenCalledTimes(3);
				expect(endpoint.select({})(store.getState()).data).toBe(cached);
				expect(endpoint.select({})(store.getState()).data?.pageParams).toEqual([1, 2]);
				expect(endpoint.select({})(store.getState()).isError).toBe(false);
				query.unsubscribe();
			},
		);

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

	describe('accountApi', () => {
		const storeRef = setupApiStore(accountApi);

		it('sendPasswordResetCode mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				accountApi.endpoints.sendPasswordResetCode.initiate({ email: 'test@example.com' }),
			);
			expect('error' in result).toBe(false);
		});

		it('passwordReset mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				accountApi.endpoints.passwordReset.initiate({ email: 'test@example.com', code: '123456' }),
			);
			expect('error' in result).toBe(false);
		});

		it('SetPassword mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				accountApi.endpoints.SetPassword.initiate({
					email: 'test@example.com',
					code: '123456',
					new_password: 'newpass',
					new_password2: 'newpass',
				}),
			);
			expect('error' in result).toBe(false);
		});
	});

	describe('groupApi', () => {
		const storeRef = setupApiStore(groupApi);

		it('getGroups query should complete without error', async () => {
			const result = await storeRef.store.dispatch(groupApi.endpoints.getGroups.initiate());
			expect('error' in result).toBe(false);
		});
	});

	describe('usersApi', () => {
		const storeRef = setupApiStore(usersApi);

		it('getUsersList query with pagination should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				usersApi.endpoints.getUsersList.initiate({
					with_pagination: true,
					page: 1,
					pageSize: 10,
					search: '',
				}),
			);
			expect('error' in result).toBe(false);
		});

		it('getUser query should complete without error', async () => {
			const result = await storeRef.store.dispatch(usersApi.endpoints.getUser.initiate({ id: 1 }));
			expect('error' in result).toBe(false);
		});

		it('checkEmail mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				usersApi.endpoints.checkEmail.initiate({ email: 'test@example.com' }),
			);
			expect('error' in result).toBe(false);
		});

		it('deleteUser mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(usersApi.endpoints.deleteUser.initiate({ id: 1 }));
			expect('error' in result).toBe(false);
		});

		it('editUser mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				usersApi.endpoints.editUser.initiate({
					id: 1,
					data: { first_name: 'Updated' },
				}),
			);
			expect('error' in result).toBe(false);
		});

		it('addUser mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				usersApi.endpoints.addUser.initiate({
					data: { first_name: 'New' },
				}),
			);
			expect('error' in result).toBe(false);
		});
	});

	describe('profilApi', () => {
		const storeRef = setupApiStore(profilApi);

		it('getProfil query should complete without error', async () => {
			const result = await storeRef.store.dispatch(profilApi.endpoints.getProfil.initiate());
			expect('error' in result).toBe(false);
		});

		it('editProfil mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				profilApi.endpoints.editProfil.initiate({
					data: { first_name: 'Updated' },
				}),
			);
			expect('error' in result).toBe(false);
		});

		it('editPassword mutation should complete without error', async () => {
			const result = await storeRef.store.dispatch(
				profilApi.endpoints.editPassword.initiate({
					data: {
						old_password: 'oldpass',
						new_password: 'newpass',
						new_password2: 'newpass',
					},
				}),
			);
			expect('error' in result).toBe(false);
		});
	});
});
