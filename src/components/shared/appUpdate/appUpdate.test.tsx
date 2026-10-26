import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import AppUpdate from './appUpdate';
import { useAppSelector } from '@/utils/hooks';
import { reloadApp } from '@/utils/helpers';
import { checkAppUpdate } from '@/utils/apiHelpers';
import { fr } from '@/translations/fr';
import { APP_VERSION } from '@/utils/rawData';
import { useGetChangelogQuery } from '@/store/services/changelog';
import type { ChangelogEntry } from '@/types/changelogTypes';
import { getAccessToken, getAppVersions } from '@/store/selectors';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/store/services/changelog', () => ({ useGetChangelogQuery: jest.fn() }));

const mockOnError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useAppSelector: jest.fn(),
	useLanguage: () => ({ t: jest.requireActual('@/translations/fr').fr }),
	useToast: () => ({ onError: mockOnError }),
}));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));
jest.mock('@/utils/helpers', () => ({
	...jest.requireActual<typeof import('@/utils/helpers')>('@/utils/helpers'),
	reloadApp: jest.fn(),
}));
jest.mock('@/utils/apiHelpers', () => ({
	...jest.requireActual<typeof import('@/utils/apiHelpers')>('@/utils/apiHelpers'),
	checkAppUpdate: jest.fn(),
}));
const [major, minor, patch] = APP_VERSION.split('.').map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;
const newerVersion = `${major}.${minor}.${patch + 2}`;
const state = { localVersion: APP_VERSION, serverVersion: nextVersion, maintenance: false };
const originalDev = __DEV__;
const originalPlatform = Platform.OS;
const refetch = jest.fn();
const release = (version: string, platform: ChangelogEntry['platform'] = 'mobile'): ChangelogEntry => ({
	id: 1,
	date: '2026-10-26',
	version,
	platform,
	title_fr: 'Mise à jour',
	title_en: 'Update',
	changes_fr: ['Amélioration'],
	changes_en: ['Improvement'],
});
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useAppSelector).mockReturnValue(state);
	jest.mocked(checkAppUpdate).mockResolvedValue(true);
	jest.mocked(reloadApp).mockResolvedValue(undefined);
	jest
		.mocked(useGetChangelogQuery)
		.mockReturnValue({ data: [], isUninitialized: false, refetch } as ReturnType<typeof useGetChangelogQuery>);
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
it('does not compete with maintenance', async () => {
	jest.mocked(useAppSelector).mockReturnValue({ ...state, maintenance: true });
	await render(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
});

it.each(['ios', 'android'] as const)(
	'shows an installation notice for newer mobile releases on packaged %s',
	async (platform) => {
		Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
		Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
		jest
			.mocked(useGetChangelogQuery)
			.mockReturnValue({ data: [release(nextVersion)], refetch } as ReturnType<typeof useGetChangelogQuery>);
		await render(<AppUpdate />);
		expect(screen.getByText(fr.appUpdate.nativeBody)).toBeOnTheScreen();
		expect(screen.getByText(`${fr.appUpdate.version} ${nextVersion}`)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: fr.appUpdate.update })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: fr.common.close }));
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(checkAppUpdate).not.toHaveBeenCalled();
		expect(reloadApp).not.toHaveBeenCalled();
	},
);

it('ignores web-only releases and shows shared releases using the highest mobile version', async () => {
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	jest
		.mocked(useGetChangelogQuery)
		.mockReturnValue({ data: [release(newerVersion, 'web')], refetch } as ReturnType<typeof useGetChangelogQuery>);
	const view = await render(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	jest
		.mocked(useGetChangelogQuery)
		.mockReturnValue({
			data: [release(newerVersion, 'both'), release(nextVersion), release('invalid')],
			refetch,
		} as ReturnType<typeof useGetChangelogQuery>);
	await view.rerender(<AppUpdate />);
	expect(screen.getByText(`${fr.appUpdate.version} ${newerVersion}`)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: fr.common.close }));
	jest
		.mocked(useGetChangelogQuery)
		.mockReturnValue({ data: [release(`${major}.${minor}.${patch + 3}`, 'both')], refetch } as ReturnType<
			typeof useGetChangelogQuery
		>);
	await view.rerender(<AppUpdate />);
	expect(screen.getByTestId('action-modal')).toBeOnTheScreen();
});

it('does not announce an installed or older mobile version even if the web announcement is newer', async () => {
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	jest
		.mocked(useGetChangelogQuery)
		.mockReturnValue({ data: [release(APP_VERSION), release('0.0.0')], refetch } as ReturnType<
			typeof useGetChangelogQuery
		>);
	await render(<AppUpdate />);
	expect(screen.queryByTestId('action-modal')).toBeNull();
});

it('refreshes native releases on foreground and server announcements, then releases its listener', async () => {
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	const listeners = new Set<(state: AppStateStatus) => void>();
	const remove = jest.fn();
	const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
		listeners.add(listener);
		return {
			remove: () => {
				listeners.delete(listener);
				remove();
			},
		};
	});
	try {
		const view = await render(<AppUpdate />);
		await act(async () => {
			for (const listener of listeners) listener('background');
		});
		expect(refetch).not.toHaveBeenCalled();
		await act(async () => {
			for (const listener of listeners) listener('active');
		});
		expect(refetch).toHaveBeenCalledTimes(1);
		jest.mocked(useAppSelector).mockReturnValue({ ...state, serverVersion: newerVersion });
		await view.rerender(<AppUpdate />);
		expect(refetch).toHaveBeenCalledTimes(2);
		await view.unmount();
		expect(remove).toHaveBeenCalled();
		expect(listeners.size).toBe(0);
	} finally {
		subscription.mockRestore();
	}
});

it('waits for authentication before requesting installed mobile releases', async () => {
	Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
	jest
		.mocked(useAppSelector)
		.mockImplementation((selector) =>
			selector === getAppVersions ? state : selector === getAccessToken ? null : undefined,
		);
	await render(<AppUpdate />);
	expect(useGetChangelogQuery).toHaveBeenCalledWith(undefined, { skip: true, refetchOnMountOrArgChange: true });
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
