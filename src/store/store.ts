import createSagaMiddleware, { type SagaMiddleware, type Task } from 'redux-saga';
import { combineReducers, configureStore, type Action, type Store, type ThunkDispatch } from '@reduxjs/toolkit';
import _initReducer from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';
import companiesReducer from '@/store/slices/companiesSlice';
import wsReducer from '@/store/slices/wsSlice';
import { accountApi, profilApi, groupApi, usersApi } from '@/store/services/account';
import { companyApi } from '@/store/services/company';
import { clientApi } from '@/store/services/client';
import { articleApi } from '@/store/services/article';
import { deviApi } from '@/store/services/devi';
import { factureProFormaApi } from '@/store/services/factureProForma';
import { factureClientApi } from '@/store/services/factureClient';
import { reglementApi } from '@/store/services/reglement';
import { aiAssistantApi } from '@/store/services/aiAssistant';
import {
	citiesApi,
	marqueApi,
	categorieApi,
	uniteApi,
	emplacementApi,
	modePaiementApi,
} from '@/store/services/parameter';
import { notificationApi } from '@/store/services/notification';
import notificationReducer from '@/store/slices/notificationSlice';

const rootReducer = combineReducers({
	_init: _initReducer,
	account: accountReducer,
	companies: companiesReducer,
	ws: wsReducer,
	notification: notificationReducer,
	[accountApi.reducerPath]: accountApi.reducer,
	[profilApi.reducerPath]: profilApi.reducer,
	[groupApi.reducerPath]: groupApi.reducer,
	[usersApi.reducerPath]: usersApi.reducer,
	[companyApi.reducerPath]: companyApi.reducer,
	[clientApi.reducerPath]: clientApi.reducer,
	[articleApi.reducerPath]: articleApi.reducer,
	[deviApi.reducerPath]: deviApi.reducer,
	[factureProFormaApi.reducerPath]: factureProFormaApi.reducer,
	[factureClientApi.reducerPath]: factureClientApi.reducer,
	[reglementApi.reducerPath]: reglementApi.reducer,
	[aiAssistantApi.reducerPath]: aiAssistantApi.reducer,
	[modePaiementApi.reducerPath]: modePaiementApi.reducer,
	[marqueApi.reducerPath]: marqueApi.reducer,
	[categorieApi.reducerPath]: categorieApi.reducer,
	[uniteApi.reducerPath]: uniteApi.reducer,
	[emplacementApi.reducerPath]: emplacementApi.reducer,
	[citiesApi.reducerPath]: citiesApi.reducer,
	[notificationApi.reducerPath]: notificationApi.reducer,
});

export interface SagaStore extends Store<RootState> {
	runSaga: SagaMiddleware['run'];
	sagaTask?: Task;
	dispatch: ThunkDispatch<RootState, unknown, Action>;
}

const reducers = (state: ReturnType<typeof rootReducer> | undefined, action: Action) => {
	return rootReducer(state, action);
};

export const makeStore = (): SagaStore => {
	const sagaMw = createSagaMiddleware();
	const s = configureStore({
		reducer: reducers,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware()
				.prepend(sagaMw)
				.concat(
					accountApi.middleware,
					profilApi.middleware,
					groupApi.middleware,
					companyApi.middleware,
					clientApi.middleware,
					articleApi.middleware,
					deviApi.middleware,
					factureProFormaApi.middleware,
					factureClientApi.middleware,
					reglementApi.middleware,
					aiAssistantApi.middleware,
					modePaiementApi.middleware,
					marqueApi.middleware,
					categorieApi.middleware,
					uniteApi.middleware,
					emplacementApi.middleware,
					citiesApi.middleware,
					usersApi.middleware,
					notificationApi.middleware,
				),
		// Login actions contain credentials. Do not expose them to DevTools.
		devTools: false,
	}) as SagaStore;
	s.runSaga = (saga, ...args) => {
		const task = sagaMw.run(saga, ...args);
		s.sagaTask = task;
		return task;
	};
	return s;
};
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = SagaStore['dispatch'];
