import * as SecureStore from 'expo-secure-store';
import { persistentStorage } from '@/local/auth/persistentStorage';

jest.mock('expo-secure-store', () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));
const values = new Map<string, string>();
beforeEach(() => {
	jest.resetAllMocks();
	values.clear();
	jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => values.get(key) ?? null);
	jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
		values.set(key, value);
	});
	jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
		values.delete(key);
	});
});

it('stores unrelated keys independently and removes only the requested key', async () => {
	await persistentStorage.setItem('color-mode', 'dark');
	await persistentStorage.setItem('selected-filter', '{"active":false}');
	await expect(persistentStorage.getItem('color-mode')).resolves.toBe('dark');
	await expect(persistentStorage.getItem('selected-filter')).resolves.toBe('{"active":false}');
	await persistentStorage.removeItem('color-mode');
	await expect(persistentStorage.getItem('color-mode')).resolves.toBeNull();
	await expect(persistentStorage.getItem('selected-filter')).resolves.toBe('{"active":false}');
	expect(SecureStore.setItemAsync).toHaveBeenNthCalledWith(1, 'color-mode', 'dark');
	expect(SecureStore.setItemAsync).toHaveBeenNthCalledWith(2, 'selected-filter', '{"active":false}');
	expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('color-mode');
});

it('treats values as opaque strings, including empty strings and malformed JSON', async () => {
	await expect(persistentStorage.getItem('missing')).resolves.toBeNull();
	await persistentStorage.setItem('empty-value', '');
	await persistentStorage.setItem('raw-value', 'not-json');
	await expect(persistentStorage.getItem('empty-value')).resolves.toBe('');
	await expect(persistentStorage.getItem('raw-value')).resolves.toBe('not-json');
});

it('propagates read, write and removal failures to the caller', async () => {
	const error = new Error('Device storage unavailable');
	jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(error);
	jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(error);
	jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(error);
	await expect(persistentStorage.getItem('example')).rejects.toBe(error);
	await expect(persistentStorage.setItem('example', 'value')).rejects.toBe(error);
	await expect(persistentStorage.removeItem('example')).rejects.toBe(error);
});
