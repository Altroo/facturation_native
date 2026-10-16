import { jest } from '@jest/globals';
import type { Middleware } from '@reduxjs/toolkit';
import { makeStore, type SagaStore, type RootState, type AppDispatch } from './store';
import { rootSaga } from '@/store/sagas';

// --- Mocks for reducers and RTK Query services ---
jest.mock('@/store/slices/_initSlice', () => ({
	__esModule: true,
	default: (state = { init: true }) => state,
}));
jest.mock('@/store/slices/accountSlice', () => ({
	__esModule: true,
	default: (state = { account: true }) => state,
}));
jest.mock('@/store/slices/companiesSlice', () => ({
	__esModule: true,
	default: (state = { companies: true }) => state,
}));
jest.mock('@/store/slices/notificationSlice', () => ({
	__esModule: true,
	default: (state = { unreadCount: 0 }) => state,
}));
jest.mock('@/store/slices/wsSlice', () => ({
	__esModule: true,
	default: (state = { maintenance: false, version: null }) => state,
}));

const makeApiMock = (name: string) => {
	const dummyMiddleware: Middleware = () => (next) => (action) => next(action);
	return {
		reducerPath: name,
		reducer: (state = {}) => state,
		middleware: dummyMiddleware,
	};
};

jest.mock('@/store/services/account', () => ({
	__esModule: true,
	accountApi: makeApiMock('accountApi'),
	profilApi: makeApiMock('profilApi'),
	groupApi: makeApiMock('groupApi'),
	usersApi: makeApiMock('usersApi'),
}));
jest.mock('@/store/services/company', () => ({
	__esModule: true,
	companyApi: makeApiMock('companyApi'),
}));

// --- Mock rootSaga only (use a lightweight generator) ---
jest.mock('@/store/sagas', () => ({
	__esModule: true,
	rootSaga: function* rootSaga() {
		// no-op for store wiring tests
	},
}));

// --- Create a fresh store per test so mocks apply ---
let store: SagaStore;

beforeEach(() => {
	store = makeStore();
});

afterEach(() => {
	store.sagaTask?.cancel();
});

describe('Redux Saga Store', () => {
	it('creates store with expected reducers', () => {
		const state: RootState = store.getState();
		expect(state).toHaveProperty('_init');
		expect(state).toHaveProperty('account');
		expect(state).toHaveProperty('companies');
		expect(state).toHaveProperty('notification');
		expect(state).toHaveProperty('ws');
		expect(state).toHaveProperty('accountApi');
		expect(state).toHaveProperty('profilApi');
		expect(state).toHaveProperty('groupApi');
		expect(state).toHaveProperty('usersApi');
		expect(state).toHaveProperty('companyApi');
	});

	it('attaches sagaTask after running rootSaga', () => {
		expect(store.sagaTask).toBeUndefined();
		store.runSaga(rootSaga);
		expect(store.sagaTask).toBeDefined();
		expect(typeof store.sagaTask?.isRunning).toBe('function');
	});

	it('dispatch works with thunk actions', async () => {
		const thunkAction = (): ((dispatch: AppDispatch) => Promise<void>) => {
			return async (dispatch) => {
				dispatch({ type: 'TEST_ACTION' });
			};
		};

		const dispatch: AppDispatch = store.dispatch;
		await dispatch(thunkAction());
		const result = dispatch({ type: 'CHECK' });
		expect(result).toEqual({ type: 'CHECK' });
	});

	it('dispatches plain actions correctly', () => {
		const action = { type: 'PLAIN_ACTION' };
		const result = store.dispatch(action);
		expect(result).toEqual(action);
	});
});
