import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import AppUpdate from './appUpdate';
import { useAppSelector } from '@/utils/hooks';
import { checkAppUpdate, reloadApp } from '@/utils/helpers';
import { fr } from '@/translations/fr';
import { APP_VERSION } from '@/utils/appVersion';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

const mockOnError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useAppSelector: jest.fn(),
	useLanguage: () => ({ t: jest.requireActual('@/translations/fr').fr }),
	useToast: () => ({ onError: mockOnError }),
}));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));
jest.mock('@/utils/helpers', () => ({
	...jest.requireActual<typeof import('@/utils/helpers')>('@/utils/helpers'),
	checkAppUpdate: jest.fn(),
	reloadApp: jest.fn(),
}));
const [major, minor, patch] = APP_VERSION.split('.').map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;
const newerVersion = `${major}.${minor}.${patch + 2}`;
const state = { localVersion: APP_VERSION, serverVersion: nextVersion, maintenance: false };
const originalDev = __DEV__;
const originalPlatform = Platform.OS;
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useAppSelector).mockReturnValue(state);
	jest.mocked(checkAppUpdate).mockResolvedValue(true);
	jest.mocked(reloadApp).mockResolvedValue(undefined);
});
afterEach(() => {
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: originalDev });
	Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
});
it.each([null, APP_VERSION, '0.0.0', 'invalid'])('hides the prompt for version %s', async (serverVersion) => {
	jest.mocked(useAppSelector).mockReturnValue({ ...state, serverVersion });
	await render(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
});
it('does not compete with maintenance or offer Metro updates in a packaged mobile app', async () => {
	jest.mocked(useAppSelector).mockReturnValue({ ...state, maintenance: true });
	const view = await render(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	jest.mocked(useAppSelector).mockReturnValue(state);
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
	await view.rerender(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
});
it('defers this version but shows a newer announcement', async () => {
	const view = await render(<AppUpdate />);
	await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.later }));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(reloadApp).not.toHaveBeenCalled();
	jest.mocked(useAppSelector).mockReturnValue({ ...state, serverVersion: newerVersion });
	await view.rerender(<AppUpdate />);
	expect(screen.getByTestId('action-modal')).toBeOnTheScreen();
});
it('reloads only after confirmation and successful local API verification', async () => {
	await render(<AppUpdate />);
	expect(checkAppUpdate).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.update }));
	await waitFor(() => expect(reloadApp).toHaveBeenCalledTimes(1));
	expect(checkAppUpdate).toHaveBeenCalledWith(nextVersion);
});
it('shows an error toast and allows retry when the bundle is unavailable or reload fails', async () => {
	jest.mocked(checkAppUpdate).mockResolvedValueOnce(false);
	await render(<AppUpdate />);
	await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.update }));
	await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(fr.appUpdate.error));
	expect(reloadApp).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: fr.appUpdate.update })).toBeEnabled();
	jest.mocked(reloadApp).mockRejectedValueOnce(new Error('Reload failed'));
	await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.update }));
	await waitFor(() => expect(mockOnError).toHaveBeenCalledTimes(2));
});
it.each([{ maintenance: true }, { serverVersion: newerVersion }])(
	'does not reload if the announcement changes during the request: %s',
	async (change) => {
		let resolve!: (available: boolean) => void;
		jest.mocked(checkAppUpdate).mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		const view = await render(<AppUpdate />);
		await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.update }));
		expect(screen.getByRole('button', { name: fr.appUpdate.updating })).toBeDisabled();
		await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
		expect(screen.getByTestId('action-modal')).toBeOnTheScreen();
		jest.mocked(useAppSelector).mockReturnValue({ ...state, ...change });
		await view.rerender(<AppUpdate />);
		await act(async () => resolve(true));
		expect(reloadApp).not.toHaveBeenCalled();
		expect(mockOnError).toHaveBeenCalledWith(fr.appUpdate.error);
	},
);
it('does not reload after the component unmounts during the request', async () => {
	let resolve!: (available: boolean) => void;
	jest.mocked(checkAppUpdate).mockReturnValue(
		new Promise((r) => {
			resolve = r;
		}),
	);
	const view = await render(<AppUpdate />);
	await fireEvent.press(screen.getByRole('button', { name: fr.appUpdate.update }));
	await view.unmount();
	await act(async () => resolve(true));
	expect(reloadApp).not.toHaveBeenCalled();
});
