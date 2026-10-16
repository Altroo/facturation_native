import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as Types from '@/store/actions';
import type { ApiErrorResponseType, NativeSessionState, InitStateInterface, InitStateToken } from '@/types/_initTypes';

export const emptyInitStateToken = {
	access: null,
	refresh: null,
	user: {
		pk: null,
		email: null,
		first_name: null,
		last_name: null,
	},
	access_expiration: null,
	refresh_expiration: null,
};

export const initialState: NativeSessionState = {
	initStateToken: emptyInitStateToken,
	status: 'booting',
	error: null,
};

const _initSlice = createSlice({
	name: '_init',
	initialState: initialState,
	reducers: {
		setInitState: (state, action: PayloadAction<InitStateInterface<InitStateToken>>) => {
			state.initStateToken = action.payload.initStateToken;
		},
		setAuthenticated: (state) => {
			state.status = 'authenticated';
			state.error = null;
		},
		initToken: () => {
			return { ...initialState, status: 'guest' as const };
		},
		setLoginError: (state, action: PayloadAction<ApiErrorResponseType>) => {
			state.initStateToken = emptyInitStateToken;
			state.status = 'guest';
			state.error = action.payload;
		},
		setSessionUnavailable: (state, action: PayloadAction<ApiErrorResponseType>) => {
			state.initStateToken = emptyInitStateToken;
			state.status = 'unavailable';
			state.error = action.payload;
		},
		setLogoutWarning: (state, action: PayloadAction<ApiErrorResponseType>) => {
			state.error = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(Types.INIT_APP, (state) => {
			state.initStateToken = emptyInitStateToken;
			state.status = 'booting';
			state.error = null;
		});
		builder.addCase(Types.ACCOUNT_LOGIN, (state) => {
			state.initStateToken = emptyInitStateToken;
			state.status = 'signingIn';
			state.error = null;
		});
		builder.addCase(Types.ACCOUNT_LOGOUT, (state) => {
			state.initStateToken = emptyInitStateToken;
			state.status = 'signingOut';
		});
	},
});

export const { setInitState, setAuthenticated, initToken, setLoginError, setSessionUnavailable, setLogoutWarning } =
	_initSlice.actions;

export default _initSlice.reducer;
