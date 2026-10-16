import * as SecureStore from 'expo-secure-store';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';

jest.mock('expo-secure-store', () => ({
	getItemAsync: jest.fn(),
	setItemAsync: jest.fn(),
	deleteItemAsync: jest.fn(),
}));
const data = { email: 'recovery@example.invalid', code: '012345' };
beforeEach(() => {
	jest.clearAllMocks();
	passwordResetStorage.resetCompletion();
	jest.useFakeTimers();
	jest.setSystemTime(new Date('2026-10-14T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());
it('persists recovery state for the original cookie maxAge and restores it after reload', async () => {
	await passwordResetStorage.write(data);
	const [key, raw] = jest.mocked(SecureStore.setItemAsync).mock.calls[0];
	expect(key).toBe('facturation-password-reset');
	expect(JSON.parse(raw)).toEqual({ ...data, expiresAt: Date.now() + 86400 * 1000 });
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(raw);
	await expect(passwordResetStorage.read()).resolves.toEqual(data);
});
it.each([
	'not-json',
	JSON.stringify({ ...data, expiresAt: 0 }),
	JSON.stringify({ ...data, code: 'invalid', expiresAt: Number.MAX_SAFE_INTEGER }),
])('removes unusable stored state: %s', async (raw) => {
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(raw);
	await expect(passwordResetStorage.read()).resolves.toBeNull();
	expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('facturation-password-reset');
});
it('expires recovery state at the exact 24-hour boundary', async () => {
	jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify({ ...data, expiresAt: Date.now() }));
	await expect(passwordResetStorage.read()).resolves.toBeNull();
});
it('clears recovery state on completion', async () => {
	await passwordResetStorage.write(null);
	expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('facturation-password-reset');
	expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});
it('keeps success in memory and discards sensitive recovery data even if device cleanup fails', async () => {
	jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('Storage unavailable'));
	await passwordResetStorage.complete();
	expect(passwordResetStorage.isComplete()).toBe(true);
	await expect(passwordResetStorage.read()).resolves.toBeNull();
	passwordResetStorage.resetCompletion();
	expect(passwordResetStorage.isComplete()).toBe(false);
});
it('starting another recovery removes the earlier completion marker', async () => {
	await passwordResetStorage.complete();
	await passwordResetStorage.write({ email: data.email, code: '' });
	expect(passwordResetStorage.isComplete()).toBe(false);
});
it('reports storage failures instead of claiming the next screen can restore state', async () => {
	const error = new Error('Storage unavailable');
	jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(error);
	await expect(passwordResetStorage.write(data)).rejects.toBe(error);
});

it('returns no recovery state when the storage key is absent', async () => {
	jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null);
	await expect(passwordResetStorage.read()).resolves.toBeNull();
	expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});
it('propagates read and removal failures to the recovery flow', async () => {
	const error = new Error('Storage unavailable');
	jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(error);
	jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(error);
	await expect(passwordResetStorage.read()).rejects.toBe(error);
	await expect(passwordResetStorage.write(null)).rejects.toBe(error);
});
