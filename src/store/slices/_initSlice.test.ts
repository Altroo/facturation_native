import reducer, {
	initialState,
	emptyInitStateToken,
	initToken,
	setAuthenticated,
	setInitState,
	setLoginError,
	setLogoutWarning,
	setSessionUnavailable,
} from '@/store/slices/_initSlice';
import { initAppAction } from '@/store/actions/_initActions';
import { accountLoginAction, accountLogoutAction } from '@/store/actions/accountActions';
import type { ApiErrorResponseType, NativeSessionState } from '@/types/_initTypes';

const error: ApiErrorResponseType = {
	status_code: 400,
	message: 'Invalid login',
	details: { email: ['Unknown email'] },
};

it('starts in booting with the original empty token state and no error', () => {
	expect(reducer(undefined, { type: '@@INIT' })).toEqual({ ...initialState, status: 'booting', error: null });
});

it('clears an earlier error when startup or login is retried', () => {
	const failed: NativeSessionState = { ...initialState, status: 'unavailable', error };
	expect(reducer(failed, initAppAction())).toEqual({ ...initialState, status: 'booting', error: null });
	expect(reducer(failed, accountLoginAction({ email: 'test@example.invalid', password: 'example' }))).toEqual({
		...initialState,
		status: 'signingIn',
		error: null,
	});
	expect(failed).toEqual({ ...initialState, status: 'unavailable', error });
});

it('stores login field errors for the form and routes back to the guest state', () => {
	const signingIn = reducer(initialState, accountLoginAction({ email: 'test@example.invalid', password: 'example' }));
	expect(reducer(signingIn, setLoginError(error))).toEqual({ ...initialState, status: 'guest', error });
});

it('keeps a network failure distinct from an expired or missing session', () => {
	const offline: ApiErrorResponseType = { status_code: 0, message: 'Offline', details: {} };
	expect(reducer(initialState, setSessionUnavailable(offline))).toEqual({
		...initialState,
		status: 'unavailable',
		error: offline,
	});
	expect(reducer({ ...initialState, status: 'unavailable', error: offline }, initToken())).toEqual({
		...initialState,
		status: 'guest',
		error: null,
	});
});

it('clears the last error after successful authentication', () => {
	expect(reducer({ ...initialState, status: 'guest', error }, setAuthenticated())).toEqual({
		...initialState,
		status: 'authenticated',
		error: null,
	});
});

it('marks logout as pending, then clears authentication and old errors', () => {
	const pending = reducer({ ...initialState, status: 'authenticated', error: null }, accountLogoutAction());
	expect(pending.status).toBe('signingOut');
	expect(reducer(pending, initToken())).toEqual({ ...initialState, status: 'guest', error: null });
});

it('reports a revocation warning after local logout without restoring authentication', () => {
	const guest = reducer({ ...initialState, status: 'authenticated', error: null }, initToken());
	expect(reducer(guest, setLogoutWarning(error))).toEqual({ ...initialState, status: 'guest', error });
});

describe('_init slice', () => {
	it('stores the original initStateToken shape and clears it on each session boundary', () => {
		const tokens = { ...emptyInitStateToken, access: 'access', refresh: 'refresh' };
		const state = reducer({ ...initialState, status: 'authenticated' }, setInitState({ initStateToken: tokens }));
		expect(state.initStateToken).toEqual(tokens);
		for (const action of [
			initAppAction(),
			accountLoginAction({ email: 'test@example.invalid', password: 'example' }),
			accountLogoutAction(),
			initToken(),
			setLoginError(error),
			setSessionUnavailable(error),
		])
			expect(reducer(state, action).initStateToken).toEqual(emptyInitStateToken);
	});
	it('returns the initial state when given undefined state', () => {
		const state = reducer(undefined, { type: '@@INIT' });
		expect(state).toEqual(initialState);
	});

	it('emptyInitStateToken shape matches expected defaults', () => {
		expect(emptyInitStateToken).toEqual({
			access: null,
			refresh: null,
			user: { pk: null, email: null, first_name: null, last_name: null },
			access_expiration: null,
			refresh_expiration: null,
		});
	});
});
