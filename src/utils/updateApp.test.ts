import { Platform } from 'react-native';
import { reloadAppAsync } from 'expo';
import { checkAppUpdate, reloadApp } from './updateApp';

jest.mock('expo', () => ({ reloadAppAsync: jest.fn() }));
const mockFetch = jest.fn();
const originalFetch = global.fetch;
const originalDev = __DEV__;
const originalPlatform = Platform.OS;
beforeEach(() => {
	jest.clearAllMocks();
	jest.useFakeTimers();
	global.fetch = mockFetch;
	mockFetch.mockReset();
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
});
afterEach(() => {
	global.fetch = originalFetch;
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: originalDev });
	Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
	jest.useRealTimers();
});

it('checks the local native server version before allowing a reload', async () => {
	mockFetch.mockResolvedValue({ ok: true, json: async () => ({ version: '1.10.0' }) });
	await expect(checkAppUpdate('1.9.0')).resolves.toBe(true);
	expect(mockFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/api\/app-version\?check=\d+$/), {
		cache: 'no-store',
		signal: expect.any(AbortSignal),
	});
	expect(reloadAppAsync).not.toHaveBeenCalled();
	expect(jest.getTimerCount()).toBe(0);
});
it.each([{ version: '1.0.0' }, { version: 'invalid' }, {}, null])(
	'returns a failed check for an unavailable release: %s',
	async (data) => {
		mockFetch.mockResolvedValue({ ok: true, json: async () => data });
		await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	},
);
it('handles offline, HTTP and invalid JSON failures without throwing', async () => {
	mockFetch.mockRejectedValueOnce(new Error('Offline'));
	await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	mockFetch.mockResolvedValueOnce({ ok: false });
	await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	mockFetch.mockResolvedValueOnce({ ok: true, json: async () => JSON.parse('bad-json') });
	await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	expect(jest.getTimerCount()).toBe(0);
});
it('aborts an unresponsive version check after ten seconds', async () => {
	mockFetch.mockImplementation(
		(_url, { signal }: { signal: AbortSignal }) =>
			new Promise((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(new Error('Aborted')));
			}),
	);
	const result = checkAppUpdate('2.0.0');
	jest.advanceTimersByTime(10000);
	await expect(result).resolves.toBe(false);
	expect(jest.getTimerCount()).toBe(0);
});
it('does not fetch invalid targets or pretend a packaged native app can update through Metro', async () => {
	await expect(checkAppUpdate('invalid')).resolves.toBe(false);
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
	await expect(checkAppUpdate('2.0.0')).resolves.toBe(false);
	expect(mockFetch).not.toHaveBeenCalled();
});
it('delegates an explicit reload to Expo', async () => {
	await reloadApp();
	expect(reloadAppAsync).toHaveBeenCalledTimes(1);
});
