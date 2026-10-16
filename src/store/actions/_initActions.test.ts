import * as types from './index';
import { initAppAction, initAppSessionTokensAction, refreshAppTokenStatesAction } from './_initActions';

describe('Redux Actions', () => {
	it('initAppAction should create INIT_APP action', () => {
		const action = initAppAction();
		expect(action).toEqual({
			type: types.INIT_APP,
		});
	});
});

it.each([
	[types.INIT_APP_SESSION_TOKENS, initAppSessionTokensAction],
	[types.REFRESH_APP_TOKEN_STATES, refreshAppTokenStatesAction],
])('preserves the native session snapshot in the original %s action', (type, action) => {
	const session = {
		access: 'access',
		refresh: 'refresh',
		access_expiration: '2030-01-01',
		refresh_expiration: '2031-01-01',
	};
	expect(action(session)).toEqual({ type, session });
	expect(action(session).session).toBe(session);
});
