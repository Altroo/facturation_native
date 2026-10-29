import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
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
		reducer: { [factureProFormaApi.reducerPath]: factureProFormaApi.reducer },
		middleware: (get) => get().concat(factureProFormaApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(factureProFormaApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

describe('Facture Pro Forma API', () => {
	it('preserves pro-forma data when invoice conversion is rejected', async () => {
		adapter.mockImplementation(async (config) =>
			config.method === 'get'
				? response(config, [{ id: 7 }])
				: Promise.reject(
						new AxiosError('Denied', 'ERR_BAD_REQUEST', config, undefined, response(config, { detail: 'Denied' }, 403)),
					),
		);
		const args = { company_id: 5 };
		await store.dispatch(factureProFormaApi.endpoints.getFactureProFormaList.initiate(args)).unwrap();
		await expect(
			store.dispatch(factureProFormaApi.endpoints.convertFactureProFormaToFacture.initiate({ id: 7 })).unwrap(),
		).rejects.toMatchObject({ status: 403 });
		expect(factureProFormaApi.endpoints.getFactureProFormaList.select(args)(store.getState()).data).toEqual([
			{ id: 7 },
		]);
		expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(1);
	});

	it('keeps company, search, filters, ordering and page size on every infinite page', async () => {
		adapter.mockImplementation(async (config) =>
			response(config, {
				count: 2,
				previous: null,
				next: config.params.page === 1 ? 'https://example.invalid/facture_proforma/?page=2' : null,
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
		await store.dispatch(factureProFormaApi.endpoints.getFactureProFormaInfiniteList.initiate(args)).unwrap();
		await store
			.dispatch(factureProFormaApi.endpoints.getFactureProFormaInfiniteList.initiate(args, { direction: 'forward' }))
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
			factureProFormaApi.endpoints.getFactureProFormaInfiniteList.select(args)(store.getState()).data?.pages,
		).toHaveLength(2);
	});

	it('selects all matching records without losing search or OR filters', async () => {
		adapter.mockImplementation(async (config) => response(config, [{ id: 7 }, { id: 8 }]));
		const filter_groups = JSON.stringify([{ statut: 'Envoyé' }, { date_after: '2026-10-01' }]);
		await store
			.dispatch(
				factureProFormaApi.endpoints.getFactureProFormaList.initiate({
					company_id: 5,
					with_pagination: false,
					search: 'Atlas',
					filter_logic: 'or',
					filter_groups,
				}),
			)
			.unwrap();
		expect(adapter.mock.calls[0][0]).toMatchObject({
			url: '/facture_proforma/',
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
		await store.dispatch(factureProFormaApi.endpoints.getNumFactureProForma.initiate({ company_id: 5 })).unwrap();
		await store.dispatch(factureProFormaApi.endpoints.getFactureProForma.initiate({ id: 7 })).unwrap();
		const data = { numero_facture: '001/26', client: 3, date_facture: '2026-10-22' };
		await store.dispatch(factureProFormaApi.endpoints.addFactureProForma.initiate({ data })).unwrap();
		await store.dispatch(factureProFormaApi.endpoints.editFactureProForma.initiate({ id: 7, data })).unwrap();
		await expect(
			store
				.dispatch(factureProFormaApi.endpoints.patchStatut.initiate({ id: 7, data: { statut: 'Accepté' } }))
				.unwrap(),
		).resolves.toEqual({ statut: 'Accepté' });
		await store.dispatch(factureProFormaApi.endpoints.deleteFactureProForma.initiate({ id: 7 })).unwrap();
		await store.dispatch(factureProFormaApi.endpoints.bulkDeleteFactureProForma.initiate({ ids: [7, 8] })).unwrap();
		const writes = adapter.mock.calls.map(([config]) => [
			config.url,
			config.method,
			config.data && JSON.parse(config.data),
		]);
		expect(writes).toEqual(
			expect.arrayContaining([
				['/facture_proforma/generate_num_facture_proforma/', 'get', undefined],
				['/facture_proforma/7/', 'get', undefined],
				['/facture_proforma/', 'post', data],
				['/facture_proforma/7/', 'put', data],
				['/facture_proforma/switch_statut/7/', 'patch', { statut: 'Accepté' }],
				['/facture_proforma/7/', 'delete', undefined],
				['/facture_proforma/bulk_delete/', 'delete', { ids: [7, 8] }],
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
		await store.dispatch(factureProFormaApi.endpoints.getFactureProFormaList.initiate({ company_id: 5 })).unwrap();
		await store.dispatch(factureProFormaApi.endpoints.getFactureProFormaList.initiate({ company_id: 11 })).unwrap();
		await expect(
			store.dispatch(factureProFormaApi.endpoints.deleteFactureProForma.initiate({ id: 5 })).unwrap(),
		).rejects.toMatchObject({
			status: 403,
		});
		expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(2);
		expect(
			factureProFormaApi.endpoints.getFactureProFormaList.select({ company_id: 5 })(store.getState()).data,
		).toEqual([{ id: 5 }]);
		expect(
			factureProFormaApi.endpoints.getFactureProFormaList.select({ company_id: 11 })(store.getState()).data,
		).toEqual([{ id: 11 }]);
	});
});
