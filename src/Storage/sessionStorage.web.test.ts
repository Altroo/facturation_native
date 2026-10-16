import { sessionStorage as tokenStorage } from '@/Storage/sessionStorage.web';
import { persistentStorage } from '@/local/auth/persistentStorage';

jest.mock('@/local/auth/persistentStorage', () => ({
	persistentStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
const originalSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
const originalLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const browserStorage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
const tokens = {
	access: 'test-access',
	refresh: 'test-refresh',
	access_expiration: '2026-10-15T10:00:00Z',
	refresh_expiration: '2026-10-16T10:00:00Z',
};
beforeEach(async () => {
	await tokenStorage.write(null);
	jest.clearAllMocks();
	Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: browserStorage });
	Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: browserStorage });
});
afterEach(async () => {
	await tokenStorage.write(null);
	expect(browserStorage.getItem).not.toHaveBeenCalled();
	expect(browserStorage.setItem).not.toHaveBeenCalled();
	expect(browserStorage.removeItem).not.toHaveBeenCalled();
	expect(persistentStorage.getItem).not.toHaveBeenCalled();
	expect(persistentStorage.setItem).not.toHaveBeenCalled();
	expect(persistentStorage.removeItem).not.toHaveBeenCalled();
});
afterAll(() => {
	if (originalSession) Object.defineProperty(globalThis, 'sessionStorage', originalSession);
	else Reflect.deleteProperty(globalThis, 'sessionStorage');
	if (originalLocal) Object.defineProperty(globalThis, 'localStorage', originalLocal);
	else Reflect.deleteProperty(globalThis, 'localStorage');
});

it('retains tokens in preview memory and clears them on logout without browser persistence', async () => {
	await expect(tokenStorage.read()).resolves.toBeNull();
	await tokenStorage.write(tokens);
	await expect(tokenStorage.read()).resolves.toEqual(tokens);
	await tokenStorage.write(null);
	await expect(tokenStorage.read()).resolves.toBeNull();
});

it('does not restore tokens in a newly loaded browser module', async () => {
	await tokenStorage.write(tokens);
	let reloaded!: typeof tokenStorage;
	jest.isolateModules(() => {
		reloaded =
			jest.requireActual<typeof import('@/Storage/sessionStorage.web')>('@/Storage/sessionStorage.web').sessionStorage;
	});
	await expect(reloaded.read()).resolves.toBeNull();
});

it('works without browser storage during rendering', async () => {
	Reflect.deleteProperty(globalThis, 'sessionStorage');
	Reflect.deleteProperty(globalThis, 'localStorage');
	await tokenStorage.write(tokens);
	await expect(tokenStorage.read()).resolves.toEqual(tokens);
});
