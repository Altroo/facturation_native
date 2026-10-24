import { setWSMaintenance } from '../slices/wsSlice';
import { runSaga, stdChannel } from 'redux-saga';
import {
	initAppSaga,
	accountLoginSaga,
	accountLogoutSaga,
	loadAccount,
	initMaintenanceSaga,
	initAppSessionTokensSaga,
	refreshAppTokenStatesSaga,
	watchInit,
} from '@/store/sagas/_initSaga';
import {
	initToken,
	setAuthenticated,
	setSessionUnavailable,
	setInitState,
	emptyInitStateToken,
	setLogoutWarning,
} from '@/store/slices/_initSlice';
import { initAppSessionTokensAction, refreshAppTokenStatesAction } from '@/store/actions/_initActions';
import { auth, InvalidSessionError } from '@/auth';
import { getApi } from '@/utils/apiHelpers';
import { accountLoginAction, accountSetProfilAction } from '@/store/actions/accountActions';
import * as Types from '@/store/actions';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { persistentStorage } from '@/local/auth/persistentStorage';
import { normalizeApiError } from '@/utils/helpers';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		auth: {
			restore: jest.fn(),
			signIn: jest.fn(),
			signOut: jest.fn(),
			getSession: jest.fn(),
			instance: create(),
			epoch: 1,
		},
	};
});
jest.mock('@/utils/apiHelpers', () => ({
	...jest.requireActual<typeof import('@/utils/apiHelpers')>('@/utils/apiHelpers'),
	getApi: jest.fn(),
}));
jest.mock('@/local/auth/persistentStorage', () => ({
	persistentStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(auth, 'epoch', { configurable: true, value: 1 });
	jest.mocked(auth.signOut).mockReset().mockResolvedValue({ success: true, data: undefined });
	jest.mocked(auth.signIn).mockReset().mockResolvedValue({ success: true, data: undefined });
	let storedReset: string | null = null;
	jest.mocked(persistentStorage.getItem).mockImplementation(async () => storedReset);
	jest.mocked(persistentStorage.setItem).mockImplementation(async (_key, value) => {
		storedReset = value;
	});
	jest.mocked(persistentStorage.removeItem).mockImplementation(async () => {
		storedReset = null;
	});
	passwordResetStorage.resetCompletion();
});
it('restores a guest without loading private data', async () => {
	jest.mocked(auth.restore).mockResolvedValue({ success: true, data: false });
	const dispatch = jest.fn();
	await runSaga({ dispatch }, initAppSaga).toPromise();
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(dispatch).toHaveBeenCalledTimes(1);
});
it('routes invalid sessions back to login', async () => {
	jest.mocked(auth.restore).mockResolvedValue({ success: false, error: new InvalidSessionError('Expired') });
	const dispatch = jest.fn();
	await runSaga({ dispatch }, initAppSaga).toPromise();
	expect(dispatch).toHaveBeenCalledWith(initToken());
});
it('keeps startup retryable on an API/network failure', async () => {
	jest.mocked(auth.restore).mockResolvedValue({ success: false, error: new Error('Offline') });
	const dispatch = jest.fn();
	await runSaga({ dispatch }, initAppSaga).toPromise();
	expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: setSessionUnavailable.type }));
});
it.each(['abandoned', 'completed'])('clears %s password recovery state on successful logout', async (state) => {
	await passwordResetStorage.write({ email: 'reset@example.invalid', code: '123456' });
	if (state === 'completed') await passwordResetStorage.complete();
	const dispatch = jest.fn();
	await runSaga({ dispatch }, accountLogoutSaga).toPromise();
	expect(auth.signOut).toHaveBeenCalledTimes(1);
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(await passwordResetStorage.read()).toBeNull();
	expect(passwordResetStorage.isComplete()).toBe(false);
	expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: setLogoutWarning.type }));
});
it('clears password recovery and all separate API caches after logout even when revocation fails', async () => {
	await passwordResetStorage.write({ email: 'reset@example.invalid', code: '123456' });
	const error = new Error('Offline');
	jest.mocked(auth.signOut).mockResolvedValue({ success: false, error });
	const dispatch = jest.fn();
	await runSaga({ dispatch }, accountLogoutSaga).toPromise();
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(dispatch).toHaveBeenCalledWith(setLogoutWarning(normalizeApiError(error)));
	expect(await passwordResetStorage.read()).toBeNull();
	expect(passwordResetStorage.isComplete()).toBe(false);
	for (const name of [
		'accountApi',
		'profilApi',
		'usersApi',
		'groupApi',
		'companyApi',
		'clientApi',
		'articleApi',
		'deviApi',
		'factureProFormaApi',
		'factureClientApi',
		'factureAvoirApi',
		'reglementApi',
		'aiAssistantApi',
		'modePaiementApi',
		'marqueApi',
		'categorieApi',
		'uniteApi',
		'emplacementApi',
		'citiesApi',
		'notificationApi',
	]) {
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: name + '/resetApiState' }));
	}
});
it('reports recovery storage failure while completing logout and clearing API caches', async () => {
	await passwordResetStorage.complete();
	const error = new Error('Storage unavailable');
	jest.mocked(persistentStorage.removeItem).mockRejectedValue(error);
	const dispatch = jest.fn();
	await expect(runSaga({ dispatch }, accountLogoutSaga).toPromise()).resolves.toBeUndefined();
	expect(auth.signOut).toHaveBeenCalledTimes(1);
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(dispatch).toHaveBeenCalledWith(setLogoutWarning(normalizeApiError(error)));
	expect(passwordResetStorage.isComplete()).toBe(false);
	for (const name of [
		'accountApi',
		'profilApi',
		'usersApi',
		'groupApi',
		'companyApi',
		'clientApi',
		'articleApi',
		'deviApi',
		'factureProFormaApi',
		'factureClientApi',
		'factureAvoirApi',
		'reglementApi',
		'aiAssistantApi',
		'modePaiementApi',
		'marqueApi',
		'categorieApi',
		'uniteApi',
		'emplacementApi',
		'citiesApi',
		'notificationApi',
	]) {
		expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: name + '/resetApiState' }));
	}
});
it.each(['resolved', 'rejected'] as const)(
	'keeps guest routes closed until delayed recovery cleanup has %s',
	async (outcome) => {
		await passwordResetStorage.complete();
		let resolveCleanup!: () => void;
		let rejectCleanup!: (error: Error) => void;
		const cleanup = new Promise<void>((resolve, reject) => {
			resolveCleanup = resolve;
			rejectCleanup = reject;
		});
		let markCleanupStarted!: () => void;
		const cleanupStarted = new Promise<void>((resolve) => {
			markCleanupStarted = resolve;
		});
		jest.mocked(persistentStorage.removeItem).mockImplementationOnce(() => {
			markCleanupStarted();
			return cleanup;
		});
		const dispatch = jest.fn();
		const task = runSaga({ dispatch }, accountLogoutSaga);
		await cleanupStarted;
		expect(dispatch).not.toHaveBeenCalledWith(initToken());
		expect(passwordResetStorage.isComplete()).toBe(true);
		const error = new Error('Storage unavailable');
		if (outcome === 'resolved') resolveCleanup();
		else rejectCleanup(error);
		await expect(task.toPromise()).resolves.toBeUndefined();
		expect(passwordResetStorage.isComplete()).toBe(false);
		const actions = dispatch.mock.calls.map(([action]) => action);
		const guestIndex = actions.findIndex((action) => action.type === initToken.type);
		expect(guestIndex).toBeGreaterThanOrEqual(0);
		for (const name of [
			'accountApi',
			'profilApi',
			'usersApi',
			'groupApi',
			'companyApi',
			'clientApi',
			'articleApi',
			'deviApi',
			'factureProFormaApi',
			'factureClientApi',
			'factureAvoirApi',
			'reglementApi',
			'aiAssistantApi',
			'modePaiementApi',
			'marqueApi',
			'categorieApi',
			'uniteApi',
			'emplacementApi',
			'citiesApi',
			'notificationApi',
		]) {
			const resetIndex = actions.findIndex((action) => action.type === name + '/resetApiState');
			expect(resetIndex).toBeGreaterThanOrEqual(0);
			expect(resetIndex).toBeLessThan(guestIndex);
		}
		if (outcome === 'rejected') {
			expect(actions.slice(guestIndex + 1)).toContainEqual(setLogoutWarning(normalizeApiError(error)));
		} else {
			expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: setLogoutWarning.type }));
		}
	},
);

it.each([
	{ profile: null, companies: [] },
	{ profile: { id: 7 }, companies: null },
])('keeps malformed bootstrap data retryable without authenticating or throwing: %j', async (data) => {
	jest.mocked(auth.restore).mockResolvedValue({ success: true, data: true });
	jest
		.mocked(getApi)
		.mockImplementation(
			async (url) => ({ status: 200, data: url === '/account/profil/' ? data.profile : data.companies }) as never,
		);
	const dispatch = jest.fn();
	await expect(runSaga({ dispatch }, initAppSaga).toPromise()).resolves.toBeUndefined();
	expect(dispatch.mock.calls).toEqual([
		[
			setSessionUnavailable({
				status_code: 0,
				message: 'Erreur réseau',
				details: { error: ['Impossible de se connecter au serveur'] },
			}),
		],
	]);
});

it('does not let a previous account response clear the session that replaced it', async () => {
	jest.mocked(getApi).mockImplementation(async () => {
		Object.defineProperty(auth, 'epoch', { configurable: true, value: 2 });
		return { status: 200, data: [] } as never;
	});
	const dispatch = jest.fn();
	await expect(runSaga({ dispatch }, loadAccount).toPromise()).resolves.toBeUndefined();
	expect(dispatch).not.toHaveBeenCalled();
});

it('authenticates only after both original profile and membership payloads are available', async () => {
	const profile = { id: 7 };
	const memberships = [{ id: 4, raison_sociale: 'Example', role: 'Caissier', uses_foreign_currency: false }];
	jest
		.mocked(getApi)
		.mockImplementation(
			async (url) => ({ status: 200, data: url === '/account/profil/' ? profile : memberships }) as never,
		);
	const dispatch = jest.fn();
	await runSaga({ dispatch }, loadAccount).toPromise();
	expect(dispatch.mock.calls).toEqual([
		[accountSetProfilAction(profile as never)],
		[companiesSetUserCompaniesAction(memberships)],
		[setAuthenticated()],
	]);
});

it('aborts both bootstrap requests when initialization is cancelled', async () => {
	jest.mocked(getApi).mockImplementation(() => new Promise(() => {}));
	const dispatch = jest.fn();
	const task = runSaga({ dispatch }, loadAccount);
	expect(jest.mocked(getApi).mock.calls).toHaveLength(2);
	const signals = jest.mocked(getApi).mock.calls.map(([, , , config]) => config?.signal);
	task.cancel();
	await task.toPromise();
	expect(signals.every((signal) => signal?.aborted)).toBe(true);
	expect(dispatch).not.toHaveBeenCalled();
});

it('aborts the other account request when bootstrap fails and keeps the failure retryable', async () => {
	jest.mocked(auth.restore).mockResolvedValue({ success: true, data: true });
	const failure = new Error('Offline');
	jest
		.mocked(getApi)
		.mockImplementation((url) => (url === '/account/profil/' ? Promise.reject(failure) : new Promise(() => {})));
	const dispatch = jest.fn();
	await runSaga({ dispatch }, initAppSaga).toPromise();
	expect(getApi).toHaveBeenCalledTimes(2);
	const signals = jest.mocked(getApi).mock.calls.map(([, , , config]) => config?.signal);
	expect(signals.every((signal) => signal?.aborted)).toBe(true);
	expect(dispatch).toHaveBeenCalledWith(setSessionUnavailable(normalizeApiError(failure)));
	expect(dispatch).not.toHaveBeenCalledWith(setAuthenticated());
});

it('dispatches the original refresh action after a successful login loads the profile and companies', async () => {
	const session = {
		access: 'login-access',
		refresh: 'login-refresh',
		access_expiration: '2030-01-01',
		refresh_expiration: '2031-01-01',
	};
	const profile = { id: 7 };
	jest.mocked(auth.getSession).mockReturnValue(session);
	jest.mocked(getApi).mockImplementation(
		async (url) =>
			({
				status: 200,
				data: url === '/account/profil/' ? profile : [],
			}) as never,
	);
	const dispatch = jest.fn();
	const action = accountLoginAction({ email: 'test@example.invalid', password: 'example-pass' });
	await runSaga(
		{ dispatch, getState: () => ({ _init: { status: 'authenticated' } }) },
		accountLoginSaga,
		action,
	).toPromise();
	expect(auth.signIn).toHaveBeenCalledWith(action.data);
	expect(dispatch.mock.calls.map(([value]) => value)).toEqual([
		accountSetProfilAction(profile as never),
		companiesSetUserCompaniesAction([]),
		setAuthenticated(),
		refreshAppTokenStatesAction(session),
	]);
});

it('does not dispatch login refresh when account loading leaves the session unavailable', async () => {
	jest.mocked(getApi).mockResolvedValue({ status: 200, data: null } as never);
	const dispatch = jest.fn();
	await runSaga(
		{ dispatch, getState: () => ({ _init: { status: 'unavailable' } }) },
		accountLoginSaga,
		accountLoginAction({ email: 'test@example.invalid', password: 'example-pass' }),
	).toPromise();
	expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: setSessionUnavailable.type }));
	expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: Types.REFRESH_APP_TOKEN_STATES }));
});

describe('init sagas', () => {
	it('handles the original refresh action through the watcher and rejects stale or logged-out snapshots', async () => {
		const session = {
			access: 'fresh-access',
			refresh: 'fresh-refresh',
			access_expiration: '2030-01-01',
			refresh_expiration: '2031-01-01',
		};
		const oldSession = { ...session, refresh: 'old-refresh' };
		jest.mocked(auth.getSession).mockReturnValue(session);
		const profil = { id: 7, email: 'test@example.invalid', first_name: 'Test', last_name: 'User' };
		let status = 'authenticated';
		const channel = stdChannel();
		const dispatch = jest.fn();
		const task = runSaga(
			{ channel, dispatch, getState: () => ({ _init: { status }, account: { profil } }) },
			watchInit,
		);
		try {
			channel.put(refreshAppTokenStatesAction(oldSession));
			expect(dispatch).not.toHaveBeenCalled();
			channel.put(refreshAppTokenStatesAction(session));
			expect(dispatch).toHaveBeenCalledWith(
				setInitState({
					initStateToken: { ...session, user: { pk: 7, email: profil.email, first_name: 'Test', last_name: 'User' } },
				}),
			);
			dispatch.mockClear();
			status = 'guest';
			channel.put(refreshAppTokenStatesAction(session));
			expect(dispatch).not.toHaveBeenCalled();
		} finally {
			task.cancel();
			await task.toPromise();
		}
	});
	it('maps the current native session and profile to the original Redux token shape', async () => {
		const session = {
			access: 'access',
			refresh: 'refresh',
			access_expiration: '2030-01-01',
			refresh_expiration: '2031-01-01',
		};
		jest.mocked(auth.getSession).mockReturnValue(session);
		const profil = { id: 7, email: 'test@example.invalid', first_name: 'Test', last_name: 'User' };
		const dispatch = jest.fn();
		await runSaga(
			{ dispatch, getState: () => ({ _init: { status: 'authenticated' }, account: { profil } }) },
			initAppSessionTokensSaga,
			initAppSessionTokensAction(session),
		).toPromise();
		expect(dispatch).toHaveBeenCalledWith(
			setInitState({
				initStateToken: { ...session, user: { pk: 7, email: profil.email, first_name: 'Test', last_name: 'User' } },
			}),
		);
	});
	it.each(['guest', 'signingOut', 'booting', 'unavailable'])('ignores a late token effect while %s', async (status) => {
		const session = {
			access: 'access',
			refresh: 'refresh',
			access_expiration: '2030-01-01',
			refresh_expiration: '2031-01-01',
		};
		jest.mocked(auth.getSession).mockReturnValue(session);
		const dispatch = jest.fn();
		await runSaga(
			{ dispatch, getState: () => ({ _init: { status } }) },
			initAppSessionTokensSaga,
			initAppSessionTokensAction(session),
		).toPromise();
		expect(dispatch).not.toHaveBeenCalled();
	});
	it.each([
		{ name: 'initAppSessionTokensSaga', saga: initAppSessionTokensSaga, createAction: initAppSessionTokensAction },
		{ name: 'refreshAppTokenStatesSaga', saga: refreshAppTokenStatesSaga, createAction: refreshAppTokenStatesAction },
	])(
		'$name rejects an older snapshot after rotation and preserves the empty profile contract',
		async ({ saga, createAction }) => {
			const session = {
				access: 'access',
				refresh: 'refresh',
				access_expiration: '2030-01-01',
				refresh_expiration: '2031-01-01',
			};
			const current = { ...session, refresh: 'rotated-refresh' };
			jest.mocked(auth.getSession).mockReturnValue(current);
			const dispatch = jest.fn();
			const getState = () => ({ _init: { status: 'authenticated' }, account: { profil: {} } });
			await runSaga({ dispatch, getState }, saga, createAction(session)).toPromise();
			expect(dispatch).not.toHaveBeenCalled();
			await runSaga({ dispatch, getState }, saga, createAction(current)).toPromise();
			expect(dispatch).toHaveBeenCalledWith(
				setInitState({ initStateToken: { ...current, user: emptyInitStateToken.user } }),
			);
		},
	);
	it.each(['', undefined])('skips public maintenance when its URL is %s', async (url) => {
		const previous = process.env.EXPO_PUBLIC_WS_MAINTENANCE_ROOT;
		if (url === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_WS_MAINTENANCE_ROOT');
		else process.env.EXPO_PUBLIC_WS_MAINTENANCE_ROOT = url;
		try {
			const dispatch = jest.fn();
			await runSaga({ dispatch }, initMaintenanceSaga).toPromise();
			expect(getApi).not.toHaveBeenCalled();
			expect(dispatch).not.toHaveBeenCalled();
		} finally {
			if (previous === undefined) Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_WS_MAINTENANCE_ROOT');
			else process.env.EXPO_PUBLIC_WS_MAINTENANCE_ROOT = previous;
		}
	});
	it('initMaintenanceSaga should dispatch setWSMaintenance with server value', async () => {
		const dispatched: unknown[] = [];
		(getApi as jest.Mock).mockResolvedValue({
			status: 200,
			data: {
				maintenance: true,
			},
		});

		await runSaga(
			{
				dispatch: (action: unknown) => dispatched.push(action),
			},
			initMaintenanceSaga,
		).toPromise();

		expect(dispatched).toEqual([setWSMaintenance(true)]);
	});

	it('initMaintenanceSaga should ignore bootstrap API failures', async () => {
		const dispatched: unknown[] = [];
		(getApi as jest.Mock).mockRejectedValue({
			error: {
				status_code: 429,
				message: 'Trop de requêtes',
				details: { error: ['Requête ralentie.'] },
			},
		});

		await expect(
			runSaga(
				{
					dispatch: (action: unknown) => dispatched.push(action),
				},
				initMaintenanceSaga,
			).toPromise(),
		).resolves.toBeUndefined();

		expect(dispatched).toEqual([]);
	});
});
