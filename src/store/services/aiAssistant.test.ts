import { configureStore } from '@reduxjs/toolkit';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/auth';
import { aiAssistantApi } from './aiAssistant';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});

const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const request = {
	action: 'fix_grammar' as const,
	text: 'Le rapport sont prêt.',
	source_language: 'auto' as const,
	context: 'form',
};
const response = {
	original_text: request.text,
	suggested_text: 'Le rapport est prêt.',
	detected_language: 'fr',
	model: 'test-model',
	cached: false,
	processing_ms: 12,
};
const createStore = () =>
	configureStore({
		reducer: { [aiAssistantApi.reducerPath]: aiAssistantApi.reducer },
		middleware: (get) => get().concat(aiAssistantApi.middleware),
	});
let store: ReturnType<typeof createStore>;
beforeEach(() => {
	adapter.mockReset();
	auth.instance.defaults.adapter = adapter;
	store = createStore();
});
afterEach(() => store.dispatch(aiAssistantApi.util.resetApiState()));

it('uses the configured authenticated endpoint and preserves the web request and response contract', async () => {
	adapter.mockImplementation(async (config) => ({
		config,
		data: response,
		status: 200,
		statusText: 'OK',
		headers: {},
	}));
	await expect(store.dispatch(aiAssistantApi.endpoints.assistText.initiate(request)).unwrap()).resolves.toEqual(
		response,
	);
	expect(adapter.mock.calls[0][0]).toMatchObject({ url: '/ai/assist/', method: 'post', timeout: 0 });
	expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual(request);
});

it('returns a recoverable backend error without changing the source text', async () => {
	adapter.mockImplementation(async (config) => {
		return Promise.reject(
			new AxiosError('Unavailable', undefined, config, undefined, {
				config,
				status: 503,
				statusText: 'Unavailable',
				headers: {},
				data: { status_code: 503, message: 'Model unavailable' },
			}),
		);
	});
	await expect(store.dispatch(aiAssistantApi.endpoints.assistText.initiate(request)).unwrap()).rejects.toMatchObject({
		status: 503,
	});
	expect(request.text).toBe('Le rapport sont prêt.');
});
