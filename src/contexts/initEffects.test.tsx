import { act, cleanup, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { InitEffects } from './initEffects';
import { useAppDispatch, useAppSelector } from '@/utils/hooks';
import { useInitAccessToken } from './InitContext';
import { initAppAction, initAppSessionTokensAction, refreshAppTokenStatesAction } from '@/store/actions/_initActions';
import { initMaintenanceAction, startWSAction, stopWSAction } from '@/store/actions/wsActions';
import { accountSetGroupesAction, accountSetProfilAction } from '@/store/actions/accountActions';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { auth } from '@/auth';
import { initToken } from '@/store/slices/_initSlice';
import { useSession } from '@/providers/sessionProvider';
import { getInitState } from '@/store/selectors';
import { notificationApi } from '@/store/services/notification';

jest.mock('@/providers/sessionProvider', () => ({ useSession: jest.fn() }));

jest.mock('@/utils/hooks', () => ({ useAppDispatch: jest.fn(), useAppSelector: jest.fn() }));
jest.mock('./InitContext', () => ({ useInitAccessToken: jest.fn() }));
const mockProfileQuery = jest.fn();
const mockGroupsQuery = jest.fn();
const mockCompaniesQuery = jest.fn();
jest.mock('@/store/services/account', () => ({
	useGetProfilQuery: (...args: unknown[]) => mockProfileQuery(...args),
	useGetGroupsQuery: (...args: unknown[]) => mockGroupsQuery(...args),
}));
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: (...args: unknown[]) => mockCompaniesQuery(...args),
}));
const dispatch = jest.fn();
const tokens = {
	access: 'current-access',
	refresh: 'current-refresh',
	access_expiration: '2030-01-01T00:00:00Z',
	refresh_expiration: '2031-01-01T00:00:00Z',
};
let mockStatus = 'guest';
const profile = {
	currentData: {
		id: 1,
		email: 'test@example.invalid',
		first_name: 'Test',
		last_name: 'User',
		gender: 'Homme',
		avatar: null,
		avatar_cropped: null,
		is_staff: false,
		is_active: true,
		default_password_set: false,
		date_joined: '2026-01-01',
		date_updated: null,
		last_login: null,
	},
	refetch: jest.fn(),
};
const groups = { currentData: { group_titles: ['Commercial'] }, refetch: jest.fn() };
const companies = {
	currentData: [{ id: 3, raison_sociale: 'Example', role: 'Commercial', uses_foreign_currency: false }],
	refetch: jest.fn(),
};
const listeners = new Set<(state: AppStateStatus) => void>();
const originalState = AppState.currentState;
const changeState = async (value: AppStateStatus) => {
	Object.defineProperty(AppState, 'currentState', { configurable: true, value });
	await act(() => [...listeners].forEach((listener) => listener(value)));
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.useFakeTimers();
	listeners.clear();
	Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
	jest.mocked(useAppDispatch).mockReturnValue(dispatch);
	mockStatus = 'guest';
	jest.mocked(useSession).mockReturnValue(null);
	jest
		.mocked(useAppSelector)
		.mockImplementation((selector) => (selector === getInitState ? { status: mockStatus } : profile.currentData));
	jest.mocked(useInitAccessToken).mockReturnValue(undefined);
	mockProfileQuery.mockReturnValue(profile);
	mockGroupsQuery.mockReturnValue(groups);
	mockCompaniesQuery.mockReturnValue(companies);
	jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
		listeners.add(listener);
		return {
			remove: () => {
				listeners.delete(listener);
			},
		};
	});
});
afterEach(async () => {
	await cleanup();
	jest.restoreAllMocks();
	jest.useRealTimers();
	Object.defineProperty(AppState, 'currentState', { configurable: true, value: originalState });
});
const authenticate = () => {
	mockStatus = 'authenticated';
	jest.mocked(useSession).mockReturnValue(tokens);
	jest.mocked(useInitAccessToken).mockReturnValue('current-access');
};
it('initializes once, skips private queries for guests, and does not dispatch cached private data', async () => {
	const view = await render(<InitEffects />);
	await view.rerender(<InitEffects />);
	expect(dispatch.mock.calls.filter(([action]) => action.type === initAppAction().type)).toHaveLength(1);
	for (const query of [mockProfileQuery, mockGroupsQuery, mockCompaniesQuery])
		expect(query).toHaveBeenCalledWith(undefined, expect.objectContaining({ skip: true }));
	expect(dispatch).not.toHaveBeenCalledWith(
		expect.objectContaining({ type: accountSetProfilAction(profile.currentData).type }),
	);
	expect(dispatch).toHaveBeenCalledWith(initMaintenanceAction());
	expect(dispatch).not.toHaveBeenCalledWith(startWSAction());
});
it('syncs session tokens without waiting for the initially empty Redux context, including refresh-only rotation', async () => {
	authenticate();
	jest.mocked(useInitAccessToken).mockReturnValue(undefined);
	const view = await render(<InitEffects />);
	expect(dispatch).toHaveBeenCalledWith(initAppSessionTokensAction(tokens));
	dispatch.mockClear();
	const rotated = { ...tokens, refresh: 'rotated-refresh' };
	jest.mocked(useSession).mockReturnValue(rotated);
	await view.rerender(<InitEffects />);
	expect(dispatch).toHaveBeenCalledWith(initAppSessionTokensAction(rotated));
	expect(dispatch).not.toHaveBeenCalledWith(refreshAppTokenStatesAction(rotated));
	dispatch.mockClear();
	jest.mocked(useSession).mockReturnValue(null);
	await view.rerender(<InitEffects />);
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(dispatch).not.toHaveBeenCalledWith(initAppSessionTokensAction(rotated));
	expect(dispatch).not.toHaveBeenCalledWith(refreshAppTokenStatesAction(rotated));
});
it('syncs an edited profile even when the session token has not changed', async () => {
	authenticate();
	const view = await render(<InitEffects />);
	dispatch.mockClear();
	const updatedProfile = { ...profile.currentData, first_name: 'Updated' };
	jest
		.mocked(useAppSelector)
		.mockImplementation((selector) => (selector === getInitState ? { status: mockStatus } : updatedProfile));
	await view.rerender(<InitEffects />);
	expect(dispatch).toHaveBeenCalledWith(initAppSessionTokensAction(tokens));
});
it('synchronizes the original account, group and company actions, then refreshes each query once on foreground', async () => {
	authenticate();
	await render(<InitEffects />);
	expect(dispatch).toHaveBeenCalledWith(accountSetProfilAction(profile.currentData));
	expect(dispatch).toHaveBeenCalledWith(accountSetGroupesAction(groups.currentData));
	expect(dispatch).toHaveBeenCalledWith(companiesSetUserCompaniesAction(companies.currentData));
	expect(dispatch).toHaveBeenCalledWith(startWSAction());
	dispatch.mockClear();
	await changeState('background');
	expect(profile.refetch).not.toHaveBeenCalled();
	expect(dispatch).not.toHaveBeenCalledWith(notificationApi.util.invalidateTags(['Notification']));
	await changeState('active');
	for (const query of [profile, groups, companies]) expect(query.refetch).toHaveBeenCalledTimes(1);
	expect(dispatch.mock.calls.filter(([action]) => action.type === notificationApi.util.invalidateTags.type)).toEqual([
		[notificationApi.util.invalidateTags(['Notification'])],
	]);
});
it('retains the last account state when a refresh has no current data', async () => {
	authenticate();
	mockProfileQuery.mockReturnValue({
		...profile,
		data: profile.currentData,
		currentData: undefined,
		error: { status: 503 },
	});
	mockCompaniesQuery.mockReturnValue({ ...companies, data: companies.currentData, currentData: undefined });
	mockGroupsQuery.mockReturnValue({ ...groups, currentData: undefined });
	await render(<InitEffects />);
	expect(
		dispatch.mock.calls.filter(([action]) => action.type === accountSetProfilAction(profile.currentData).type),
	).toHaveLength(0);
});
it('polls public maintenance only while active and removes all polling/listeners on unmount', async () => {
	const view = await render(<InitEffects />);
	dispatch.mockClear();
	await act(() => jest.advanceTimersByTime(30000));
	expect(dispatch).toHaveBeenCalledWith(initMaintenanceAction());
	await changeState('background');
	dispatch.mockClear();
	await act(() => jest.advanceTimersByTime(60000));
	expect(dispatch).not.toHaveBeenCalled();
	await changeState('active');
	expect(dispatch).toHaveBeenCalledWith(initMaintenanceAction());
	await view.unmount();
	expect(listeners.size).toBe(0);
	expect(jest.getTimerCount()).toBe(0);
	expect(dispatch).toHaveBeenLastCalledWith(stopWSAction());
});
it('stops authenticated sockets and private refreshes after logout', async () => {
	authenticate();
	const view = await render(<InitEffects />);
	dispatch.mockClear();
	mockStatus = 'guest';
	jest.mocked(useSession).mockReturnValue(null);
	jest
		.mocked(useAppSelector)
		.mockImplementation((selector) => (selector === getInitState ? { status: mockStatus } : profile.currentData));
	jest.mocked(useInitAccessToken).mockReturnValue(undefined);
	await view.rerender(<InitEffects />);
	await changeState('active');
	expect(dispatch).toHaveBeenCalledWith(stopWSAction());
	expect(dispatch).not.toHaveBeenCalledWith(startWSAction());
	expect(profile.refetch).not.toHaveBeenCalled();
	expect(dispatch).not.toHaveBeenCalledWith(notificationApi.util.invalidateTags(['Notification']));
});
it('subscribes each mounted app to expiry and only removes its own listener on unmount', async () => {
	const subscribers = new Set<() => void>();
	jest.spyOn(auth, 'subscribeExpired').mockImplementation((listener) => {
		subscribers.add(listener);
		return () => {
			subscribers.delete(listener);
		};
	});
	const firstDispatch = jest.fn();
	const secondDispatch = jest.fn();
	jest.mocked(useAppDispatch).mockReturnValue(firstDispatch);
	const first = await render(<InitEffects />);
	jest.mocked(useAppDispatch).mockReturnValue(secondDispatch);
	const second = await render(<InitEffects />);
	firstDispatch.mockClear();
	secondDispatch.mockClear();
	await act(() => subscribers.forEach((listener) => listener()));
	expect(firstDispatch).toHaveBeenCalledWith(initToken());
	expect(secondDispatch).toHaveBeenCalledWith(initToken());
	expect(subscribers.size).toBe(2);
	await first.unmount();
	firstDispatch.mockClear();
	secondDispatch.mockClear();
	await act(() => subscribers.forEach((listener) => listener()));
	expect(firstDispatch).not.toHaveBeenCalled();
	expect(secondDispatch).toHaveBeenCalledTimes(1);
	expect(secondDispatch).toHaveBeenCalledWith(initToken());
	await second.unmount();
	expect(subscribers.size).toBe(0);
});
it('keeps one expiry subscription with the latest logout status and removes it on unmount', async () => {
	let expireSession!: () => void;
	const unsubscribe = jest.fn();
	const subscribe = jest.spyOn(auth, 'subscribeExpired').mockImplementation((listener) => {
		expireSession = listener;
		return unsubscribe;
	});
	authenticate();
	const view = await render(<InitEffects />);
	mockStatus = 'signingOut';
	jest.mocked(useSession).mockReturnValue(null);
	jest.mocked(useInitAccessToken).mockReturnValue(undefined);
	dispatch.mockClear();
	await view.rerender(<InitEffects />);
	await act(() => expireSession());
	expect(dispatch).not.toHaveBeenCalledWith(initToken());
	expect(subscribe).toHaveBeenCalledTimes(1);
	// Once logout finishes, the same listener reads the current status.
	mockStatus = 'guest';
	await view.rerender(<InitEffects />);
	dispatch.mockClear();
	await act(() => expireSession());
	expect(dispatch).toHaveBeenCalledTimes(1);
	expect(dispatch).toHaveBeenCalledWith(initToken());
	expect(subscribe).toHaveBeenCalledTimes(1);
	await view.unmount();
	expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it.each(['booting', 'signingIn', 'authenticated', 'unavailable'])(
	'continues clearing an expired session while %s',
	async (status) => {
		let expireSession!: () => void;
		jest.spyOn(auth, 'subscribeExpired').mockImplementation((listener) => {
			expireSession = listener;
			return jest.fn();
		});
		mockStatus = status;
		jest.mocked(useSession).mockReturnValue(tokens);
		await render(<InitEffects />);
		dispatch.mockClear();
		await act(() => expireSession());
		expect(dispatch).toHaveBeenCalledWith(initToken());
	},
);
