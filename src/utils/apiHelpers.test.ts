import axios, {
	create,
	AxiosError,
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApi, getAppVersion, postApi } from '@/utils/apiHelpers';

jest.mock('expo-constants', () => ({
	__esModule: true,
	default: { expoConfig: { name: 'test', slug: 'test', hostUri: 'metro.example.invalid:8081' } },
}));

const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const instance = create({ adapter });
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
beforeEach(() => adapter.mockReset());

describe('getAppVersion', () => {
	const originalDev = __DEV__;
	beforeEach(() => {
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
		jest.replaceProperty(Platform, 'OS', 'ios');
		jest.spyOn(axios, 'create').mockReturnValue(instance);
	});
	afterEach(() => {
		jest.restoreAllMocks();
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: originalDev });
	});

	it.each(['metro.example.invalid:8081', 'https://metro.example.invalid'])(
		'uses the Metro origin %s, with no Django authentication',
		async (hostUri) => {
			jest.replaceProperty(Constants, 'expoConfig', { name: 'test', slug: 'test', hostUri });
			adapter.mockImplementation(async (config) => response(config, '{"version":"1.10.0"}'));
			await expect(getAppVersion()).resolves.toEqual({ status: 200, data: { version: '1.10.0' } });
			expect(axios.create).toHaveBeenCalledWith({
				baseURL: hostUri.startsWith('https://') ? hostUri : `http://${hostUri}`,
			});
			expect(adapter.mock.calls[0][0]).toMatchObject({
				url: '/api/app-version',
				method: 'get',
				params: { check: expect.any(Number) },
				timeout: 10_000,
				responseType: 'json',
				transitional: expect.objectContaining({ silentJSONParsing: false }),
				headers: expect.objectContaining({ 'Cache-Control': 'no-store' }),
			});
			expect(adapter.mock.calls[0][0].headers.has('Authorization')).toBe(false);
		},
	);

	it('uses the current browser origin in production web previews', async () => {
		jest.replaceProperty(Platform, 'OS', 'web');
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
		adapter.mockImplementation(async (config) => response(config, { version: '1.10.0' }));
		await expect(getAppVersion()).resolves.toMatchObject({ status: 200 });
		expect(axios.create).toHaveBeenCalledWith({ baseURL: undefined });
	});

	it('does not request a Metro version from a packaged app or without a Metro host', async () => {
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
		await expect(getAppVersion()).resolves.toEqual({ status: 0, data: null });
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
		jest.replaceProperty(Constants, 'expoConfig', null);
		await expect(getAppVersion()).resolves.toEqual({ status: 0, data: null });
		expect(axios.create).not.toHaveBeenCalled();
		expect(adapter).not.toHaveBeenCalled();
	});

	it('rejects malformed JSON instead of accepting a stale or invalid version response', async () => {
		adapter.mockImplementation(async (config) => response(config, 'bad-json'));
		await expect(getAppVersion()).rejects.toMatchObject({ code: 'ERR_BAD_RESPONSE' });
	});
});

it('keeps POST body fields and returns the original status/data envelope', async () => {
	const data = { id: 7, is_active: false };
	adapter.mockImplementation(async (config) => response(config, data, 201));
	await expect(
		postApi('/account/users/', instance, { email: 'test@example.invalid', is_active: false }),
	).resolves.toEqual({ status: 201, data });
	const request = adapter.mock.calls[0][0];
	expect(request).toMatchObject({ url: '/account/users/', method: 'post' });
	expect(JSON.parse(request.data)).toEqual({ email: 'test@example.invalid', is_active: false });
});

it('accepts an empty POST response and an omitted request body', async () => {
	adapter.mockImplementation(async (config) => response(config, '', 204));
	await expect(postApi('/account/logout/', instance)).resolves.toEqual({ status: 204, data: '' });
	expect(adapter.mock.calls[0][0].data).toBeUndefined();
});

it('forwards GET filters and caller cancellation, headers and timeout without mutating the config', async () => {
	const controller = new AbortController();
	const params = { company_id: 4, page: 2, is_active: false, search: 'Test' };
	const config = { signal: controller.signal, headers: { 'X-Request-Source': 'test' }, timeout: 1200 };
	const data = { results: [{ id: 7 }] };
	adapter.mockImplementation(async (request) => response(request, data));
	await expect(getApi('/account/users/', instance, params, config)).resolves.toEqual({ status: 200, data });
	expect(adapter.mock.calls[0][0]).toMatchObject({
		url: '/account/users/',
		method: 'get',
		params,
		signal: controller.signal,
		timeout: 1200,
		headers: expect.objectContaining({ 'X-Request-Source': 'test' }),
	});
	expect(config).not.toHaveProperty('params');
});

it('keeps requests without query parameters valid and preserves the response data reference', async () => {
	const data = { maintenance: true };
	adapter.mockImplementation(async (config) => response(config, data));
	const result = await getApi<typeof data>('/ws/maintenance/', instance);
	expect(result.data).toBe(data);
	expect(adapter.mock.calls[0][0].params).toBeUndefined();
});

it.each([getApi, postApi])('propagates Axios validation errors unchanged from %s', async (request) => {
	let error: AxiosError | undefined;
	adapter.mockImplementation(async (config) => {
		error = new AxiosError(
			'Invalid data',
			'ERR_BAD_REQUEST',
			config,
			undefined,
			response(config, { details: { email: ['Already used'] } }, 400),
		);
		throw error;
	});
	const result = request('/account/users/', instance);
	await expect(result).rejects.toBeInstanceOf(AxiosError);
	await expect(result).rejects.toBe(error);
	expect(error?.response?.data).toEqual({ details: { email: ['Already used'] } });
});

it('does not start a GET after its caller has already cancelled', async () => {
	const controller = new AbortController();
	controller.abort();
	await expect(getApi('/account/profil/', instance, undefined, { signal: controller.signal })).rejects.toMatchObject({
		code: 'ERR_CANCELED',
	});
	expect(adapter).not.toHaveBeenCalled();
});

describe('API utility functions', () => {
	describe('postApi', () => {
		it('should post using the provided Axios instance and return status and data', async () => {
			const mockInstance = {
				post: jest.fn().mockResolvedValue({
					status: 201,
					data: { success: true },
				}),
			} as unknown as AxiosInstance;

			const result = await postApi('/submit', mockInstance, { name: 'Al' });

			expect(mockInstance.post).toHaveBeenCalledWith('/submit', { name: 'Al' });
			expect(result).toEqual({ status: 201, data: { success: true } });
		});
	});

	describe('getApi', () => {
		it('should get using the provided Axios instance and return status and data', async () => {
			const mockInstance = {
				get: jest.fn().mockResolvedValue({
					status: 200,
					data: { maintenance: true },
				}),
			} as unknown as AxiosInstance;

			const result = await getApi('/ws/maintenance/', mockInstance);

			expect(mockInstance.get).toHaveBeenCalledWith('/ws/maintenance/', { params: undefined });
			expect(result).toEqual({ status: 200, data: { maintenance: true } });
		});
	});
});
