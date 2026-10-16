import { createApi } from '@reduxjs/toolkit/query/react';
import type { Middleware } from '@reduxjs/toolkit';
import { setupApiStore } from './setupApiStore';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
	jest.runOnlyPendingTimers();
	jest.useRealTimers();
});

it('preserves the original API store wrapper and runs both RTK Query and caller middleware', async () => {
	const seen: string[] = [];
	const extra: Middleware = () => (next) => (action) => {
		if (typeof action === 'object' && action !== null && 'type' in action) seen.push(String(action.type));
		return next(action);
	};
	const api = createApi({
		reducerPath: 'copyExampleApi',
		baseQuery: async (id: number) => ({ data: { id } }),
		endpoints: (builder) => ({ getExample: builder.query<{ id: number }, number>({ query: (id) => id }) }),
	});
	const ref = setupApiStore(api, [extra]);
	const request = ref.dispatch(api.endpoints.getExample.initiate(7));
	try {
		await expect(request.unwrap()).resolves.toEqual({ id: 7 });
		expect(ref.api).toBe(api);
		expect(ref.dispatch).toBe(ref.store.dispatch);
		expect(ref.store.getState()).toHaveProperty(['copyExampleApi', 'queries', 'getExample(7)', 'data'], { id: 7 });
		expect(ref.store.getState()).toHaveProperty('account');
		expect(seen).toContain('copyExampleApi/executeQuery/fulfilled');
	} finally {
		request.unsubscribe();
		ref.store.dispatch(api.util.resetApiState());
	}
});
