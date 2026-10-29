import { passwordResetStorage } from '@/Storage/passwordResetStorage';

jest.mock('@/local/auth/persistentStorage', () => jest.requireActual('@/local/auth/persistentStorage.web'));

const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
const values = new Map<string, string>();
const storage = {
	getItem: jest.fn((key: string) => values.get(key) ?? null),
	setItem: jest.fn((key: string, value: string) => values.set(key, value)),
	removeItem: jest.fn((key: string) => values.delete(key)),
};
beforeEach(() => {
	values.clear();
	jest.clearAllMocks();
	Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
});
afterAll(() => {
	if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
	else Reflect.deleteProperty(globalThis, 'sessionStorage');
});

describe('Password Reset Storage web', () => {
	it('reads recovery state from browser session storage and removes it on completion', async () => {
		const data = { email: 'recovery@example.invalid', code: '012345' };
		await passwordResetStorage.write(data);
		expect(storage.setItem).toHaveBeenCalledTimes(1);
		await expect(passwordResetStorage.read()).resolves.toEqual(data);
		await passwordResetStorage.write(null);
		await expect(passwordResetStorage.read()).resolves.toBeNull();
	});

	it.each(['bad-json', JSON.stringify({ email: 'recovery@example.invalid', code: '012345', expiresAt: 0 })])(
		'discards corrupt or expired browser state: %s',
		async (raw) => {
			values.set('facturation-password-reset', raw);
			await expect(passwordResetStorage.read()).resolves.toBeNull();
			expect(values.size).toBe(0);
		},
	);

	it('allows server rendering without accessing browser storage', async () => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
		await expect(passwordResetStorage.read()).resolves.toBeNull();
		await expect(passwordResetStorage.write({ email: 'test@example.invalid', code: '' })).rejects.toThrow(
			'Browser session storage is unavailable',
		);
	});
});
