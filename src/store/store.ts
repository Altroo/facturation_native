import createSagaMiddleware, { type SagaMiddleware, type Task } from 'redux-saga';
import { combineReducers, configureStore, type Action, type Store, type ThunkDispatch } from '@reduxjs/toolkit';
import _initReducer from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';
import companiesReducer from '@/store/slices/companiesSlice';
import wsReducer from '@/store/slices/wsSlice';
import { accountApi, profilApi, groupApi, usersApi } from '@/store/services/account';
import { companyApi } from '@/store/services/company';
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
			getDefaultMiddleware({
				serializableCheck: {
					// RTK Query uses some non-serializable values in its internal actions
					ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
					// Ignore RTK Query cache metadata paths
					ignoredPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload.timestamp'],
				},
				thunk: true,
			})
				.prepend(sagaMw)
				.concat(
					accountApi.middleware,
					profilApi.middleware,
					groupApi.middleware,
					companyApi.middleware,
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
