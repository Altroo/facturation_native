import * as types from './index';
import type { Tokens } from '@/types/accountTypes';

export const initAppAction = () => {
	return {
		type: types.INIT_APP,
	};
};

export const initAppSessionTokensAction = (session: Tokens) => {
	return {
		type: types.INIT_APP_SESSION_TOKENS,
		session,
	};
};

export const refreshAppTokenStatesAction = (session: Tokens) => {
	return {
		type: types.REFRESH_APP_TOKEN_STATES,
		session,
	};
};
