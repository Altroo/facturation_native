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
beforeEach(() => jest.clearAllMocks());
it('stores and reads tokens through SecureStore', async () => {
	await sessionStorage.write(tokens);
	expect(SecureStore.setItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY, JSON.stringify(tokens));
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(tokens));
	await expect(sessionStorage.read()).resolves.toEqual(tokens);
});
it.each([null, 'not-json'])('returns no session for absent or corrupt storage: %s', async (raw) => {
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(raw);
	await expect(sessionStorage.read()).resolves.toBeNull();
});
it('deletes persisted tokens on logout', async () => {
	await sessionStorage.write(null);
	expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
	expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
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
