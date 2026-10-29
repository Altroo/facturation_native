import { StrictMode, useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { useStore } from 'react-redux';
import type { Task } from 'redux-saga';
import StoreProvider from './storeProvider';
import type { SagaStore } from '@/store/store';
import { setAuthenticated } from '@/store/slices/_initSlice';
import { accountSetGroupesAction } from '@/store/actions/accountActions';
import { groupApi } from '@/store/services/account';

beforeEach(() => jest.useFakeTimers());
afterEach(async () => {
	await cleanup();
	jest.clearAllTimers();
	jest.useRealTimers();
});

describe('StoreProvider', () => {
	it('keeps committed Sagas working after StrictMode replays lifecycle effects', async () => {
		let current: SagaStore | undefined;
		const tasks: Task[] = [];
		const Child = () => {
			const store = useStore.withTypes<SagaStore>()();
			useEffect(() => {
				current = store;
				if (store.sagaTask) tasks.push(store.sagaTask);
				store.dispatch(accountSetGroupesAction({ group_titles: ['Commercial'] }));
			}, [store]);
			return null;
		};
		const view = await render(
			<StrictMode>
				<StoreProvider>
					<Child />
				</StoreProvider>
			</StrictMode>,
		);
		expect(current?.getState().account.groupes).toEqual(['Commercial']);
		expect(tasks).toHaveLength(2);
		expect(tasks[0].isCancelled()).toBe(true);
		expect(tasks[1].isRunning()).toBe(true);
		await view.unmount();
		expect(tasks.every((task) => !task.isRunning())).toBe(true);
	});

	it('stops the old Sagas and creates a fresh store without cached private data on remount', async () => {
		const stores: SagaStore[] = [];
		const Child = () => {
			const store = useStore.withTypes<SagaStore>()();
			useEffect(() => {
				stores.push(store);
			}, [store]);
			return null;
		};
		const view = await render(
			<StoreProvider>
				<Child />
			</StoreProvider>,
		);
		const store = stores[0];
		await act(async () => {
			store.dispatch(setAuthenticated());
			store.dispatch(accountSetGroupesAction({ group_titles: ['Commercial'] }));
			await store.dispatch(groupApi.util.upsertQueryData('getGroups', undefined, { group_titles: ['Commercial'] }));
		});
		expect(groupApi.endpoints.getGroups.select()(store.getState()).data).toEqual({ group_titles: ['Commercial'] });
		expect(store.getState().account.groupes).toEqual(['Commercial']);
		await view.unmount();
		expect(store.sagaTask?.isRunning()).toBe(false);
		const nextView = await render(
			<StoreProvider>
				<Child />
			</StoreProvider>,
		);
		const nextStore = stores[1];
		expect(nextStore).not.toBe(store);
		expect(nextStore.sagaTask?.isRunning()).toBe(true);
		expect(nextStore.getState()._init.status).toBe('booting');
		expect(nextStore.getState().account.groupes).toEqual([]);
		expect(groupApi.endpoints.getGroups.select()(nextStore.getState()).isUninitialized).toBe(true);
		await nextView.unmount();
		expect(nextStore.sagaTask?.isRunning()).toBe(false);
	});
});
