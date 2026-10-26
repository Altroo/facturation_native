import { configureStore } from '@reduxjs/toolkit';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { logistiqueApi } from './logistique';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});

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
