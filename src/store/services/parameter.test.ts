import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
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
		reducer: { [citiesApi.reducerPath]: citiesApi.reducer },
		middleware: (get) => get().concat(citiesApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	jest.useFakeTimers();
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(async () => {
	store.dispatch(citiesApi.util.resetApiState());
	await jest.runOnlyPendingTimersAsync();
	jest.useRealTimers();
});

it('creates, renames and deletes a city with the same scoped Django API as the web', async () => {
	adapter.mockImplementation(async (config) =>
		response(config, config.method === 'delete' ? undefined : { id: 3, ...JSON.parse(config.data) }),
	);
	await expect(
		store.dispatch(citiesApi.endpoints.addCity.initiate({ data: { company: 5, nom: 'Rabat' } })).unwrap(),
	).resolves.toMatchObject({ id: 3 });
	await store.dispatch(citiesApi.endpoints.editCity.initiate({ id: 3, data: { company: 5, nom: 'Agadir' } })).unwrap();
	await store.dispatch(citiesApi.endpoints.deleteCity.initiate({ id: 3 })).unwrap();
	expect(adapter.mock.calls.map(([config]) => ({ method: config.method, url: config.url }))).toEqual([
		{ method: 'post', url: '/parameter/ville/' },
		{ method: 'put', url: '/parameter/ville/3/' },
		{ method: 'delete', url: '/parameter/ville/3/' },
	]);
	expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({ company: 5, nom: 'Rabat' });
	expect(JSON.parse(adapter.mock.calls[1][0].data)).toEqual({ company: 5, nom: 'Agadir' });
});

it('keeps city lookups scoped to their company and exposes failed writes without invalidating the list', async () => {
	adapter.mockImplementation(async (config) => {
		if (config.method === 'get') return response(config, [{ id: 2, nom: 'Casablanca', company: 5 }]);
		throw new AxiosError(
			'Validation failed',
			'ERR_BAD_REQUEST',
			config,
			undefined,
			response(config, { nom: ['City already exists'] }, 400),
		);
	});
	await store.dispatch(citiesApi.endpoints.getCitiesList.initiate({ company_id: 5 })).unwrap();
	await expect(
		store.dispatch(citiesApi.endpoints.addCity.initiate({ data: { nom: 'Casablanca', company: 5 } })).unwrap(),
	).rejects.toMatchObject({ status: 400 });
	expect(adapter.mock.calls[0][0].params).toEqual({ company_id: 5 });
	expect(adapter.mock.calls.filter(([config]) => config.method === 'get')).toHaveLength(1);
	expect(citiesApi.endpoints.getCitiesList.select({ company_id: 5 })(store.getState()).data).toMatchObject([
		{ id: 2, nom: 'Casablanca' },
	]);
});
