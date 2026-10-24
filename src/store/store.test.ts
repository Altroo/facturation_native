import { jest } from '@jest/globals';
import type { Middleware } from '@reduxjs/toolkit';
import { makeStore, type SagaStore, type RootState, type AppDispatch } from './store';
import { rootSaga } from '@/store/sagas';
import { auth } from '@/auth';
import { bonDeLivraisonApi } from '@/store/services/bonDeLivraison';
import { livreParApi } from '@/store/services/parameter';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});

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
		expect(state).toHaveProperty('clientApi');
		expect(state).toHaveProperty('articleApi');
		expect(state).toHaveProperty('deviApi');
		expect(state).toHaveProperty('factureProFormaApi');
		expect(state).toHaveProperty('factureClientApi');
		expect(state).toHaveProperty('factureAvoirApi');
		expect(state).toHaveProperty('bonDeLivraisonApi');
		expect(state).toHaveProperty('reglementApi');
		expect(state).toHaveProperty('aiAssistantApi');
		expect(state).toHaveProperty('modePaiementApi');
		expect(state).toHaveProperty('livreParApi');
		expect(state).toHaveProperty('marqueApi');
		expect(state).toHaveProperty('categorieApi');
		expect(state).toHaveProperty('uniteApi');
		expect(state).toHaveProperty('emplacementApi');
		expect(state).toHaveProperty('citiesApi');
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

it('runs delivery-note and delivery-person requests through the middleware registered in makeStore', async () => {
	jest.useFakeTimers();
	const previousAdapter = auth.instance.defaults.adapter;
	const requests: InternalAxiosRequestConfig[] = [];
	auth.instance.defaults.adapter = async (config): Promise<AxiosResponse> => {
		requests.push(config);
		return {
			config,
			headers: {},
			status: 200,
			statusText: 'OK',
			data:
				config.url === process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_LIST
					? [{ id: 7, numero_bon_livraison: 'BL7/26' }]
					: [{ id: 6, nom: 'Livreur Atlas', company: 5 }],
		};
	};
	try {
		await store.dispatch(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.initiate({ company_id: 5 })).unwrap();
		await store.dispatch(livreParApi.endpoints.getLivreParList.initiate({ company_id: 5 })).unwrap();
		expect(store.getState().bonDeLivraisonApi.config.middlewareRegistered).toBe(true);
		expect(store.getState().livreParApi.config.middlewareRegistered).toBe(true);
		expect(bonDeLivraisonApi.endpoints.getBonDeLivraisonList.select({ company_id: 5 })(store.getState()).data).toEqual([
			{ id: 7, numero_bon_livraison: 'BL7/26' },
		]);
		expect(livreParApi.endpoints.getLivreParList.select({ company_id: 5 })(store.getState()).data).toEqual([
			{ id: 6, nom: 'Livreur Atlas', company: 5 },
		]);
		expect(requests.map((config) => config.params.company_id)).toEqual([5, 5]);
	} finally {
		store.dispatch(bonDeLivraisonApi.util.resetApiState());
		store.dispatch(livreParApi.util.resetApiState());
		await jest.runOnlyPendingTimersAsync();
		jest.useRealTimers();
		auth.instance.defaults.adapter = previousAdapter;
	}
});
