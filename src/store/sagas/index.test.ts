import { watchWS } from '@/store/sagas/wsSaga';
import type { AllEffect, ForkEffect } from 'redux-saga/effects';
import { eventChannel, runSaga, stdChannel, type Task } from 'redux-saga';
import type { UnknownAction } from '@reduxjs/toolkit';
import { formatSagaError, rootSaga } from '@/store/sagas';
import { initAppAction } from '@/store/actions/_initActions';
import { accountSetGroupesAction } from '@/store/actions/accountActions';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { startWSAction } from '@/store/actions/wsActions';
import { initToken } from '@/store/slices/_initSlice';
import { setGroupes } from '@/store/slices/accountSlice';
import { setUserCompanies } from '@/store/slices/companiesSlice';
import { initWebsocket } from '@/store/services/ws';
import { auth } from '@/auth';
import type { SessionResult } from '@/types/accountTypes';

jest.mock('@/auth', () => ({
	...jest.requireActual<typeof import('@/auth')>('@/auth'),
	auth: { restore: jest.fn() },
}));
jest.mock('@/store/services/ws', () => ({ initWebsocket: jest.fn() }));
const tasks: Task[] = [];
const closeSocket = jest.fn();
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(auth.restore).mockReturnValue(new Promise(() => {}));
	jest.mocked(initWebsocket).mockImplementation(() => eventChannel(() => closeSocket));
});
afterEach(async () => {
	for (const task of tasks.splice(0)) {
		task.cancel();
		await task.toPromise().catch(() => {});
	}
});

it('preserves useful object, Error and circular-error diagnostics', () => {
	const error = new Error('Watcher failed');
	expect(formatSagaError(error)).toBe(error.stack);
	expect(formatSagaError({ error: { status_code: 429, message: 'Trop de requêtes' } })).toBe(
		'{"error":{"status_code":429,"message":"Trop de requêtes"}}',
	);
	const circular: { self?: unknown } = {};
	circular.self = circular;
	expect(formatSagaError(circular)).toBe('[object Object]');
	expect(formatSagaError(null)).toBe('null');
});

it('cancels session restore, closes the socket and stops all isolated watchers with the root task', async () => {
	let resolveRestore!: (restored: SessionResult<boolean>) => void;
	jest.mocked(auth.restore).mockReturnValue(
		new Promise((resolve) => {
			resolveRestore = resolve;
		}),
	);
	const channel = stdChannel();
	const dispatch = jest.fn();
	const task = runSaga({ channel, dispatch }, rootSaga);
	tasks.push(task);
	channel.put(initAppAction());
	channel.put(startWSAction());
	channel.put(accountSetGroupesAction({ group_titles: ['Lecture'] }));
	channel.put(companiesSetUserCompaniesAction([]));
	expect(dispatch).toHaveBeenCalledWith(setGroupes({ group_titles: ['Lecture'] }));
	expect(dispatch).toHaveBeenCalledWith(setUserCompanies([]));
	task.cancel();
	await task.toPromise();
	expect(closeSocket).toHaveBeenCalledTimes(1);
	dispatch.mockClear();
	resolveRestore({ success: true, data: false });
	await Promise.resolve();
	channel.put(initAppAction());
	channel.put(startWSAction());
	channel.put(accountSetGroupesAction({ group_titles: ['Caissier'] }));
	channel.put(companiesSetUserCompaniesAction([]));
	expect(dispatch).not.toHaveBeenCalled();
	expect(auth.restore).toHaveBeenCalledTimes(1);
	expect(initWebsocket).toHaveBeenCalledTimes(1);
	expect(task.isCancelled()).toBe(true);
});

it('isolates a watcher failure while company actions and socket lifecycle continue to work', async () => {
	const error = new Error('Reducer dispatch failed');
	const onError = jest.fn();
	const channel = stdChannel();
	const dispatch = jest.fn((action: UnknownAction) => {
		if (action.type === setGroupes.type) throw error;
	});
	const task = runSaga({ channel, dispatch, onError }, rootSaga);
	tasks.push(task);
	channel.put(startWSAction());
	channel.put(accountSetGroupesAction({ group_titles: ['Lecture'] }));
	expect(onError).toHaveBeenCalledWith(error, expect.objectContaining({ sagaStack: expect.any(String) }));
	expect(closeSocket).not.toHaveBeenCalled();
	expect(task.isRunning()).toBe(true);
	channel.put(companiesSetUserCompaniesAction([]));
	expect(dispatch).toHaveBeenCalledWith(setUserCompanies([]));
	task.cancel();
	await task.toPromise();
	expect(closeSocket).toHaveBeenCalledTimes(1);
});

it('closes the active socket on logout and retains watchers for a later login', async () => {
	const channel = stdChannel();
	const dispatch = jest.fn();
	const task = runSaga({ channel, dispatch }, rootSaga);
	tasks.push(task);
	channel.put(startWSAction());
	channel.put(initToken());
	expect(closeSocket).toHaveBeenCalledTimes(1);
	expect(task.isRunning()).toBe(true);
	channel.put(accountSetGroupesAction({ group_titles: ['Lecture'] }));
	expect(dispatch).toHaveBeenCalledWith(setGroupes({ group_titles: ['Lecture'] }));
	channel.put(startWSAction());
	expect(initWebsocket).toHaveBeenCalledTimes(2);
	task.cancel();
	await task.toPromise();
	expect(closeSocket).toHaveBeenCalledTimes(2);
});

describe('rootSaga', () => {
	it('should spawn watchInit, watchAccount, watchCompanies and watchWS', () => {
		const generator = rootSaga();
		const effect = generator.next().value as AllEffect<ForkEffect>;

		expect(effect).toMatchObject({
			'@@redux-saga/IO': true,
			combinator: true,
			type: 'ALL',
			payload: expect.arrayContaining([
				// Spawned sagas (detached)
				expect.objectContaining({
					type: 'FORK',
					payload: expect.objectContaining({
						detached: true,
					}),
				}),
				expect.objectContaining({
					type: 'FORK',
					payload: expect.objectContaining({
						detached: true,
					}),
				}),
				// Forked watchWS saga
				expect.objectContaining({
					type: 'FORK',
					payload: expect.objectContaining({
						fn: watchWS,
					}),
				}),
			]),
		});
		// 4 sagas currently:
		// watchInit, watchAccount, watchCompanies, watchWS
		expect(effect.payload).toHaveLength(4);
	});

	it('should preserve useful details when formatting object saga errors', () => {
		expect(
			formatSagaError({
				error: {
					status_code: 429,
					message: 'Trop de requêtes',
				},
			}),
		).toBe('{"error":{"status_code":429,"message":"Trop de requêtes"}}');
	});
});
