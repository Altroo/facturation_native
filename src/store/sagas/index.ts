import { all, cancel, spawn, take } from 'redux-saga/effects';
import type { SagaIterator, Task } from 'redux-saga';
import { watchInit } from '@/store/sagas/_initSaga';
import { watchWS } from '@/store/sagas/wsSaga';
import { watchAccount } from '@/store/sagas/accountSaga';
import { watchCompanies } from '@/store/sagas/companiesSaga';

// .test files only
export const formatSagaError = (error: unknown): string => {
	if (error instanceof Error) {
		return error.stack || error.message;
	}

	if (typeof error === 'object' && error !== null) {
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	}

	return String(error);
};

export function* rootSaga(): SagaIterator {
	const sagas = [watchInit, watchAccount, watchCompanies, watchWS];
	const tasks: Task[] = yield all(sagas.map((saga) => spawn(saga)));
	try {
		// Keep ownership of detached watchers until the store root is canceled.
		yield take(() => false);
	} finally {
		yield all(tasks.map((task) => cancel(task)));
	}
}
