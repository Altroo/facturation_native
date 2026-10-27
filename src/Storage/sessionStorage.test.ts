import * as SecureStore from 'expo-secure-store';
import { sessionStorage } from '@/Storage/sessionStorage';
import { SESSION_STORAGE_KEY } from '@/utils/rawData';

jest.mock('expo-secure-store', () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));
const tokens = {
	access: 'test-access',
	refresh: 'test-refresh',
	access_expiration: '2026-10-15T10:00:00Z',
	refresh_expiration: '2026-10-16T10:00:00Z',
};
const originalApiUrl = process.env.EXPO_PUBLIC_ROOT_API_URL;
const storageKey = `${SESSION_STORAGE_KEY}.https___api.example.test_api`;
beforeEach(() => {
	jest.resetAllMocks();
	process.env.EXPO_PUBLIC_ROOT_API_URL = 'https://api.example.test/api';
});
afterEach(() => {
	if (originalApiUrl === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_ROOT_API_URL');
	else process.env.EXPO_PUBLIC_ROOT_API_URL = originalApiUrl;
});
it('stores and reads tokens through SecureStore', async () => {
	await sessionStorage.write(tokens);
	expect(SecureStore.setItemAsync).toHaveBeenCalledWith(storageKey, JSON.stringify(tokens));
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(tokens));
	await expect(sessionStorage.read()).resolves.toEqual(tokens);
});
it.each([null, 'not-json'])('returns no session for absent or corrupt storage: %s', async (raw) => {
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(raw);
	await expect(sessionStorage.read()).resolves.toBeNull();
});
it('deletes persisted tokens on logout', async () => {
	await sessionStorage.write(null);
	expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(storageKey);
	expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});
it('keeps local and production sessions separate, including logout', async () => {
	const records = new Map<string, string>();
	jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => records.get(key) ?? null);
	jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
		records.set(key, value);
	});
	jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
		records.delete(key);
	});
	process.env.EXPO_PUBLIC_ROOT_API_URL = 'http://localhost:8000/api';
	await sessionStorage.write(tokens);
	process.env.EXPO_PUBLIC_ROOT_API_URL = 'https://api.example.test/api';
	await expect(sessionStorage.read()).resolves.toBeNull();
	const productionTokens = { ...tokens, access: 'production-access', refresh: 'production-refresh' };
	await sessionStorage.write(productionTokens);
	await expect(sessionStorage.read()).resolves.toEqual(productionTokens);
	await sessionStorage.write(null);
	await expect(sessionStorage.read()).resolves.toBeNull();
	process.env.EXPO_PUBLIC_ROOT_API_URL = 'http://localhost:8000/api';
	await expect(sessionStorage.read()).resolves.toEqual(tokens);
});
it('does not restore legacy tokens whose backend is unknown', async () => {
	jest
		.mocked(SecureStore.getItemAsync)
		.mockImplementation(async (key) => (key === SESSION_STORAGE_KEY ? JSON.stringify(tokens) : null));
	await expect(sessionStorage.read()).resolves.toBeNull();
	expect(SecureStore.getItemAsync).toHaveBeenCalledWith(storageKey);
});
it('propagates storage failures to the session lifecycle', async () => {
	const error = new Error('Device storage unavailable');
	jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(error);
	jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(error);
	await expect(sessionStorage.read()).rejects.toBe(error);
	await expect(sessionStorage.write(tokens)).rejects.toBe(error);
});

it('propagates logout removal failures without claiming tokens were cleared', async () => {
	const error = new Error('Device storage unavailable');
	jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(error);
	await expect(sessionStorage.write(null)).rejects.toBe(error);
});
