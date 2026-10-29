import {
	configureStore,
	combineReducers,
	type ThunkDispatch,
	type Middleware,
	type UnknownAction,
	type Reducer,
} from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import _initReducer from '@/store/slices/_initSlice';
import accountReducer from '@/store/slices/accountSlice';

type RtkApiLike = {
	reducerPath: string;
	reducer: Reducer;
	middleware: Middleware;
};

// Isolated store for API tests. The application uses makeStore in store/store.ts.
export const setupApiStore = (api: RtkApiLike, extraMiddleware: Middleware[] = []) => {
	const sagaMiddleware = createSagaMiddleware();

	const reducer = combineReducers({
		_init: _initReducer,
		account: accountReducer,
		[api.reducerPath]: api.reducer,
	});

	const store = configureStore({
		reducer,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				serializableCheck: false,
				thunk: true,
			}).concat(sagaMiddleware, api.middleware, ...extraMiddleware),
		devTools: false,
	});

	type RootState = ReturnType<typeof store.getState>;
	type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
	return { api, store, dispatch: store.dispatch as AppDispatch };
};
