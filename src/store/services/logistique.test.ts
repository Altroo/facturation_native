import { configureStore } from '@reduxjs/toolkit';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { logistiqueApi } from './logistique';
import { factureProFormaApi } from './factureProForma';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});

describe('Logistique API', () => {
	it('uses configured logistics list and detail endpoints for receipt order lookups', async () => {
		jest.useFakeTimers();
		const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>(async (config) => ({
			config,
			status: 200,
			statusText: 'OK',
			headers: {},
			data: { id: 41, company: 5, lignes: [] },
		}));
		auth.instance.defaults.adapter = adapter;
		const store = configureStore({
			reducer: { [logistiqueApi.reducerPath]: logistiqueApi.reducer },
			middleware: (get) => get().concat(logistiqueApi.middleware),
		});
		await store
			.dispatch(
				logistiqueApi.endpoints.getLogistiqueList.initiate({
					company_id: 5,
					with_pagination: true,
					page: 1,
					pageSize: 100,
				}),
			)
			.unwrap();
		await store.dispatch(logistiqueApi.endpoints.getLogistique.initiate({ id: 41 })).unwrap();
		expect(adapter.mock.calls[0]![0]).toMatchObject({
			url: '/logistique/',
			params: { company_id: 5, pagination: true, page: 1, page_size: 100 },
		});
		expect(adapter.mock.calls[1]![0].url).toBe('/logistique/41/');
		store.dispatch(logistiqueApi.util.resetApiState());
		await jest.runOnlyPendingTimersAsync();
		jest.useRealTimers();
	});

	it('paginates both lists on the server while retaining search, sorting and combined filters', async () => {
		jest.useFakeTimers();
		const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>(async (config) => ({
			config,
			status: 200,
			statusText: 'OK',
			headers: {},
			data: {
				count: 2,
				next: config.params.page === 1 ? '?page=2' : null,
				previous: null,
				results: [{ id: config.params.page }],
			},
		}));
		auth.instance.defaults.adapter = adapter;
		const store = configureStore({
			reducer: { [logistiqueApi.reducerPath]: logistiqueApi.reducer },
			middleware: (get) => get().concat(logistiqueApi.middleware),
		});
		const args = {
			company_id: 5,
			pageSize: 1,
			search: 'Atlas',
			ordering: '-cout_total',
			filter_logic: 'or',
			filter_groups: '[{"fournisseur":"Atlas"},{"cout_total__gt":"1000"}]',
		};
		try {
			await store.dispatch(logistiqueApi.endpoints.getLogistiqueInfiniteList.initiate(args)).unwrap();
			await store
				.dispatch(logistiqueApi.endpoints.getLogistiqueInfiniteList.initiate(args, { direction: 'forward' }))
				.unwrap();
			await store
				.dispatch(
					logistiqueApi.endpoints.getLogistiqueSuppliersInfiniteList.initiate({ ...args, ordering: '-total_dossiers' }),
				)
				.unwrap();
			await store
				.dispatch(
					logistiqueApi.endpoints.getLogistiqueSuppliersInfiniteList.initiate(
						{ ...args, ordering: '-total_dossiers' },
						{ direction: 'forward' },
					),
				)
				.unwrap();
			expect(adapter.mock.calls.map(([config]) => [config.url, config.params.page])).toEqual([
				['/logistique/', 1],
				['/logistique/', 2],
				['/logistique/fournisseurs/', 1],
				['/logistique/fournisseurs/', 2],
			]);
			expect(adapter.mock.calls[1]![0].params).toMatchObject({
				company_id: 5,
				pagination: true,
				page_size: 1,
				search: 'Atlas',
				ordering: '-cout_total',
				filter_logic: 'or',
				filter_groups: args.filter_groups,
			});
			expect(logistiqueApi.endpoints.getLogistiqueInfiniteList.select(args)(store.getState()).data?.pages).toHaveLength(
				2,
			);
		} finally {
			store.dispatch(logistiqueApi.util.resetApiState());
			await jest.runOnlyPendingTimersAsync();
			jest.useRealTimers();
		}
	});

	it('uses the web dashboard and deletion contracts with company-scoped suppliers', async () => {
		jest.useFakeTimers();
		const invalidate = jest.spyOn(factureProFormaApi.util, 'invalidateTags');
		const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>(async (config) => ({
			config,
			status: 200,
			statusText: 'OK',
			headers: {},
			data: {},
		}));
		auth.instance.defaults.adapter = adapter;
		const store = configureStore({
			reducer: { [logistiqueApi.reducerPath]: logistiqueApi.reducer },
			middleware: (get) => get().concat(logistiqueApi.middleware),
		});
		try {
			const dashboard = store.dispatch(logistiqueApi.endpoints.getLogistiqueDashboard.initiate({ company_id: 5 }));
			await dashboard.unwrap();
			dashboard.unsubscribe();
			await store.dispatch(logistiqueApi.endpoints.deleteLogistique.initiate({ id: 7 })).unwrap();
			await store.dispatch(logistiqueApi.endpoints.bulkDeleteLogistique.initiate({ ids: [7, 8] })).unwrap();
			await store
				.dispatch(logistiqueApi.endpoints.deleteLogistiqueSupplier.initiate({ id: 9, company_id: 5 }))
				.unwrap();
			expect(adapter.mock.calls[0]![0]).toMatchObject({
				url: '/logistique/dashboard/',
				params: { company_id: 5 },
				method: 'get',
			});
			expect(adapter.mock.calls[1]![0]).toMatchObject({ url: '/logistique/7/', method: 'delete' });
			expect(adapter.mock.calls[2]![0]).toMatchObject({
				url: '/logistique/bulk_delete/',
				method: 'delete',
				data: JSON.stringify({ ids: [7, 8] }),
			});
			expect(adapter.mock.calls[3]![0]).toMatchObject({
				url: '/logistique/fournisseurs/9/',
				method: 'delete',
				params: { company_id: 5 },
			});
			expect(invalidate).toHaveBeenCalledTimes(2);
		} finally {
			invalidate.mockRestore();
			store.dispatch(logistiqueApi.util.resetApiState());
			await jest.runOnlyPendingTimersAsync();
			jest.useRealTimers();
		}
	});

	it('loads, creates and edits suppliers with the company scope and all web form fields', async () => {
		jest.useFakeTimers();
		const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>(async (config) => ({
			config,
			status: 200,
			statusText: 'OK',
			headers: {},
			data: { id: 9, company: 5, nom: 'Atlas', email: 'contact@example.invalid', marques: [2, 3] },
		}));
		auth.instance.defaults.adapter = adapter;
		const store = configureStore({
			reducer: { [logistiqueApi.reducerPath]: logistiqueApi.reducer },
			middleware: (get) => get().concat(logistiqueApi.middleware),
		});
		try {
			const detail = store.dispatch(logistiqueApi.endpoints.getLogistiqueSupplier.initiate({ id: 9, company_id: 5 }));
			await detail.unwrap();
			detail.unsubscribe();
			const payload = { company_id: 5, nom: 'Atlas', email: 'contact@example.invalid', marques: [2, 3] };
			await store.dispatch(logistiqueApi.endpoints.addLogistiqueSupplier.initiate(payload)).unwrap();
			await store.dispatch(logistiqueApi.endpoints.editLogistiqueSupplier.initiate({ ...payload, id: 9 })).unwrap();
			expect(adapter.mock.calls[0]![0]).toMatchObject({
				url: '/logistique/fournisseurs/9/',
				method: 'get',
				params: { company_id: 5 },
			});
			expect(adapter.mock.calls[1]![0]).toMatchObject({
				url: '/logistique/fournisseurs/',
				method: 'post',
				params: { company_id: 5 },
				data: JSON.stringify({ nom: payload.nom, email: payload.email, marques: [2, 3] }),
			});
			expect(adapter.mock.calls[2]![0]).toMatchObject({
				url: '/logistique/fournisseurs/9/',
				method: 'put',
				params: { company_id: 5 },
				data: JSON.stringify({ nom: payload.nom, email: payload.email, marques: [2, 3] }),
			});
		} finally {
			store.dispatch(logistiqueApi.util.resetApiState());
			await jest.runOnlyPendingTimersAsync();
			jest.useRealTimers();
		}
	});
});
