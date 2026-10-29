import { configureStore } from '@reduxjs/toolkit';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { changelogApi } from './changelog';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});

describe('Changelog API', () => {
	it('requests mobile history from the configured API, leaving platform filtering to Django', async () => {
		jest.useFakeTimers();
		const env = jest.replaceProperty(process.env, 'EXPO_PUBLIC_CHANGELOG', '/configured-changelog/');
		const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>(async (config) => ({
			config,
			status: 200,
			statusText: 'OK',
			headers: {},
			data: [],
		}));
		auth.instance.defaults.adapter = adapter;
		const store = configureStore({
			reducer: { [changelogApi.reducerPath]: changelogApi.reducer },
			middleware: (get) => get().concat(changelogApi.middleware),
		});
		try {
			const request = store.dispatch(changelogApi.endpoints.getChangelog.initiate());
			await expect(request.unwrap()).resolves.toEqual([]);
			expect(adapter.mock.calls[0]![0]).toMatchObject({
				url: '/configured-changelog/',
				method: 'get',
				params: { platform: 'mobile' },
			});
			request.unsubscribe();
		} finally {
			store.dispatch(changelogApi.util.resetApiState());
			await jest.runOnlyPendingTimersAsync();
			jest.useRealTimers();
			env.restore();
		}
	});
});
