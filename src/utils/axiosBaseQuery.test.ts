import axios, { CanceledError } from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { axiosBaseQuery, ApiErrorResponseType } from './axiosBaseQuery';

const makeBaseQueryApi = (state: unknown): BaseQueryApi => {
	const api: Partial<BaseQueryApi> = {
		getState: () => state,
		dispatch: (() => void 0) as BaseQueryApi['dispatch'],
		extra: undefined,
		endpoint: '',
		type: 'query',
		signal: new AbortController().signal,
	};
	return api as BaseQueryApi;
};

describe('axiosBaseQuery (real Axios instance, no any)', () => {
	let instance: AxiosInstance;

	beforeEach(() => {
		instance = axios.create();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('returns data on success', async () => {
		const responseData = { ok: true };
		const spy = jest.spyOn(instance, 'request').mockResolvedValueOnce({ data: responseData });

		const getInstance = () => instance;
		const baseQuery = axiosBaseQuery(getInstance);

		const result = await baseQuery({ url: '/x', method: 'GET' }, makeBaseQueryApi({}), {});
		expect(result).toEqual({ data: responseData });
		expect(spy).toHaveBeenCalledWith({
			url: '/x',
			method: 'GET',
			data: undefined,
			params: undefined,
			signal: expect.any(AbortSignal),
		});
	});

	it('handles normalized errors thrown by interceptors', async () => {
		const normalized = {
			error: {
				status_code: 401,
				message: 'Token expired',
				details: { token: ['expired'] },
			},
		};

		jest.spyOn(instance, 'request').mockRejectedValueOnce(normalized);

		const getInstance = () => instance;
		const baseQuery = axiosBaseQuery(getInstance);

		const result = await baseQuery({ url: '/x', method: 'GET' }, makeBaseQueryApi({}), {});
		expect(result).toEqual({ error: { status: 401, data: normalized.error } });
	});

	it('handles axios errors with response', async () => {
		const serverError: ApiErrorResponseType = {
			status_code: 500,
			message: 'Server failure',
			details: { backend: ['boom'] },
		};

		const axiosErr = {
			isAxiosError: true,
			message: 'Request failed',
			response: { status: 500, data: serverError },
			config: {},
		} as Partial<AxiosError<ApiErrorResponseType>>;

		jest.spyOn(instance, 'request').mockRejectedValueOnce(axiosErr);

		const getInstance = () => instance;
		const baseQuery = axiosBaseQuery(getInstance);

		const result = await baseQuery({ url: '/x', method: 'GET' }, makeBaseQueryApi({}), {});
		expect(result).toEqual({ error: { status: 500, data: serverError } });
	});

	it('handles unknown errors', async () => {
		const unknownErr = new Error('unexpected');

		jest.spyOn(instance, 'request').mockRejectedValueOnce(unknownErr);

		const getInstance = () => instance;
		const baseQuery = axiosBaseQuery(getInstance);

		const result = await baseQuery({ url: '/x', method: 'GET' }, makeBaseQueryApi({}), {});
		expect(result).toEqual({
			error: {
				status: 0,
				data: {
					status_code: 0,
					message: 'unexpected',
					details: { error: ["Une erreur inattendue s'est produite."] },
				},
			},
		});
	});

	it.each([
		[new Error('unexpected'), 'unexpected'],
		[{ error: null }, 'Erreur inconnue'],
		[undefined, 'Erreur inconnue'],
	])(
		'safely returns an unexpected rejection (%p) without throwing from its normalized-error guard',
		async (failure, message) => {
			jest.spyOn(instance, 'request').mockRejectedValue(failure);
			await expect(
				axiosBaseQuery(() => instance)({ url: '/example/', method: 'GET' }, makeBaseQueryApi({}), {}),
			).resolves.toEqual({
				error: {
					status: 0,
					data: { status_code: 0, message, details: { error: ["Une erreur inattendue s'est produite."] } },
				},
			});
		},
	);

	it('returns factory failures through RTK Query instead of rejecting its baseQuery promise', async () => {
		const query = axiosBaseQuery(() => {
			throw new Error('Session is unavailable');
		});
		await expect(query({ url: '/example/', method: 'GET' }, makeBaseQueryApi({}), {})).resolves.toMatchObject({
			error: { status: 0, data: { message: 'Session is unavailable' } },
		});
	});

	it('passes cancellation to a real Axios adapter and returns a failed query when it aborts', async () => {
		const controller = new AbortController();
		const api = { ...makeBaseQueryApi({}), signal: controller.signal };
		let receivedSignal: AbortSignal | undefined;
		instance.defaults.adapter = (config) =>
			new Promise((_resolve, reject) => {
				receivedSignal = config.signal as AbortSignal;
				config.signal?.addEventListener?.('abort', () => reject(new CanceledError('Canceled', config)));
			});
		const pending = axiosBaseQuery(() => instance)({ url: '/example/', method: 'GET' }, api, {});
		await Promise.resolve();
		expect(receivedSignal).toBe(controller.signal);
		controller.abort();
		await expect(pending).resolves.toMatchObject({ error: { status: 0, data: { message: 'Canceled' } } });
	});
});
