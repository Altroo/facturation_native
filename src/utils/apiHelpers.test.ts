import axios, {
	create,
	AxiosError,
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { checkAppUpdate, getApi, getAppVersion, openClientStatementPdf, openPdf, postApi } from '@/utils/apiHelpers';
import { auth } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
jest.mock('expo-file-system', () => ({
	Paths: { cache: 'file:///cache' },
	File: jest
		.fn()
		.mockImplementation(() => ({ write: mockWritePdf, canPreview: mockCanPreviewPdf, preview: mockPreviewPdf })),
}));
const mockWritePdf = jest.fn();
const mockCanPreviewPdf = jest.fn();
const mockPreviewPdf = jest.fn();

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

describe('openPdf', () => {
	const pdf = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
	beforeEach(() => {
		jest.replaceProperty(Platform, 'OS', 'ios');
		auth.instance.defaults.adapter = adapter;
		mockWritePdf.mockReset().mockResolvedValue(undefined);
		mockCanPreviewPdf.mockReset().mockResolvedValue(true);
		mockPreviewPdf.mockReset().mockResolvedValue(undefined);
		adapter.mockImplementation(async (config) => response(config, pdf.buffer));
	});
	afterEach(() => jest.restoreAllMocks());

	it.each(['fr', 'en', 'nl'] as const)(
		'opens a %s client statement using configured backend endpoints and filters',
		async (language) => {
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_ROOT_API_URL', 'https://api.example.invalid/api');
			jest.replaceProperty(process.env, 'EXPO_PUBLIC_CLIENT_ROOT', '/custom-clients');
			await expect(
				openClientStatementPdf(7, 5, language, {
					date_from: '2026-01-02',
					date_to: '2026-01-31',
					type: 'invoice',
				}),
			).resolves.toBe(true);
			expect(adapter.mock.calls[0][0]).toMatchObject({
				url: `https://api.example.invalid/api/custom-clients/pdf/${language}/7/?company_id=5&date_from=2026-01-02&date_to=2026-01-31&type=invoice`,
				responseType: 'arraybuffer',
			});
			expect(mockPreviewPdf).toHaveBeenCalledWith({ mimeType: 'application/pdf' });
		},
	);

	it('defaults client statements to French and omits empty date filters', async () => {
		await expect(openClientStatementPdf(7, 5)).resolves.toBe(true);
		const url = new URL(adapter.mock.calls[0][0].url!);
		expect(url.pathname).toBe('/api/client/pdf/fr/7/');
		expect([...url.searchParams.entries()]).toEqual([['company_id', '5']]);
	});

	it.each(['ios', 'android'] as const)(
		'downloads through the authenticated Axios instance and previews the PDF on %s',
		async (platform) => {
			jest.replaceProperty(Platform, 'OS', platform);
			await expect(openPdf('https://example.invalid/client/pdf/fr/7/?company_id=5')).resolves.toBe(true);
			expect(adapter.mock.calls[0][0]).toMatchObject({
				method: 'get',
				responseType: 'arraybuffer',
				url: 'https://example.invalid/client/pdf/fr/7/?company_id=5',
			});
			expect(mockWritePdf).toHaveBeenCalledWith(pdf);
			expect(mockCanPreviewPdf).toHaveBeenCalledWith({ mimeType: 'application/pdf' });
			expect(mockPreviewPdf).toHaveBeenCalledWith({ mimeType: 'application/pdf' });
		},
	);

	it('rejects a non-PDF response without writing it or opening a viewer', async () => {
		adapter.mockImplementation(async (config) => response(config, new Uint8Array([123, 125]).buffer));
		await expect(openPdf('/client/pdf/fr/7/')).resolves.toBe(false);
		expect(mockWritePdf).not.toHaveBeenCalled();
		expect(mockPreviewPdf).not.toHaveBeenCalled();
	});

	it('returns a recoverable result when no PDF viewer is available', async () => {
		mockCanPreviewPdf.mockResolvedValue(false);
		await expect(openPdf('/client/pdf/fr/7/')).resolves.toBe(false);
		expect(mockPreviewPdf).not.toHaveBeenCalled();
	});

	it.each(['download', 'write', 'preview'])('handles a %s failure without an unhandled rejection', async (stage) => {
		if (stage === 'download') adapter.mockRejectedValue(new AxiosError('Offline', 'ERR_NETWORK'));
		if (stage === 'write') mockWritePdf.mockRejectedValue(new Error('Disk unavailable'));
		if (stage === 'preview') mockPreviewPdf.mockRejectedValue(new Error('Viewer unavailable'));
		await expect(openPdf('/client/pdf/fr/7/')).resolves.toBe(false);
	});
});

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

	it.each(['1.9.0', '1.10.0'])(
		'permits a reload only when the local server can supply the announced version %s',
		async (target) => {
			adapter.mockImplementation(async (config) => response(config, '{"version":"1.10.0"}'));
			await expect(checkAppUpdate(target)).resolves.toBe(true);
			expect(adapter).toHaveBeenCalledTimes(1);
		},
	);

	it.each([{ version: '1.0.0' }, { version: 'invalid' }, {}, null])(
		'refuses a reload when the requested version is unavailable: %s',
		async (data) => {
			adapter.mockImplementation(async (config) => response(config, data));
			await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
		},
	);

	it('handles offline, HTTP and malformed JSON failures without throwing', async () => {
		adapter.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
		adapter.mockImplementationOnce(async (config) => response(config, null, 503));
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
		adapter.mockImplementationOnce(async (config) => response(config, 'bad-json'));
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	});

	it('handles an Axios timeout without permitting a reload', async () => {
		adapter.mockRejectedValueOnce(new AxiosError('timeout of 10000ms exceeded', 'ECONNABORTED'));
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	});

	it('does not request invalid targets or offer Metro updates to packaged native apps', async () => {
		await expect(checkAppUpdate('invalid')).resolves.toBe(false);
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
		expect(adapter).not.toHaveBeenCalled();
	});

	it('checks the current browser origin in production web previews', async () => {
		jest.replaceProperty(Platform, 'OS', 'web');
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
		adapter.mockImplementation(async (config) => response(config, { version: '2.0.0' }));
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(true);
		expect(axios.create).toHaveBeenCalledWith({ baseURL: undefined });
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
