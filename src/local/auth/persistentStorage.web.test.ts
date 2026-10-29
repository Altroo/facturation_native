import { persistentStorage } from '@/local/auth/persistentStorage.web';

const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
const values = new Map<string, string>();
const storage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
beforeEach(() => {
	values.clear();
	jest.resetAllMocks();
	storage.getItem.mockImplementation((key: string) => values.get(key) ?? null);
	storage.setItem.mockImplementation((key: string, value: string) => {
		values.set(key, value);
	});
	storage.removeItem.mockImplementation((key: string) => {
		values.delete(key);
	});
	Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
});
afterAll(() => {
	if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
	else Reflect.deleteProperty(globalThis, 'sessionStorage');
});

describe('Persistent Storage web', () => {
	it('stores unrelated browser keys independently and removes only the requested key', async () => {
		await persistentStorage.setItem('color-mode', 'dark');
		await persistentStorage.setItem('selected-filter', '{"active":false}');
		await expect(persistentStorage.getItem('color-mode')).resolves.toBe('dark');
		await expect(persistentStorage.getItem('selected-filter')).resolves.toBe('{"active":false}');
		await persistentStorage.removeItem('color-mode');
		await expect(persistentStorage.getItem('color-mode')).resolves.toBeNull();
		await expect(persistentStorage.getItem('selected-filter')).resolves.toBe('{"active":false}');
		expect(storage.removeItem).toHaveBeenCalledWith('color-mode');
	});

	it('keeps opaque strings unchanged instead of parsing or assigning an expiry', async () => {
		await expect(persistentStorage.getItem('missing')).resolves.toBeNull();
		await persistentStorage.setItem('empty-value', '');
		await persistentStorage.setItem('raw-value', 'not-json');
		await expect(persistentStorage.getItem('empty-value')).resolves.toBe('');
		await expect(persistentStorage.getItem('raw-value')).resolves.toBe('not-json');
	});

	it('supports server rendering reads while refusing unavailable writes and removals', async () => {
		Reflect.deleteProperty(globalThis, 'sessionStorage');
		await expect(persistentStorage.getItem('example')).resolves.toBeNull();
		await expect(persistentStorage.setItem('example', 'value')).rejects.toThrow(
			'Browser session storage is unavailable',
		);
		await expect(persistentStorage.removeItem('example')).rejects.toThrow('Browser session storage is unavailable');
	});

	it('rejects on browser storage access failures instead of reporting a successful save', async () => {
		const error = new Error('Browser storage blocked');
		storage.getItem.mockImplementationOnce(() => {
			throw error;
		});
		storage.setItem.mockImplementationOnce(() => {
			throw error;
		});
		storage.removeItem.mockImplementationOnce(() => {
			throw error;
		});
		await expect(persistentStorage.getItem('example')).rejects.toBe(error);
		await expect(persistentStorage.setItem('example', 'value')).rejects.toBe(error);
		await expect(persistentStorage.removeItem('example')).rejects.toBe(error);
	});
});
