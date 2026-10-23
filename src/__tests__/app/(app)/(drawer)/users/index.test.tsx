import { toggleAutocomplete } from '@/components/nativeElements/customAutoCompleteSelect/setupAutocomplete';
import { configureStore } from '@reduxjs/toolkit';
import notification from '@/store/slices/notificationSlice';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor, within, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { Provider } from 'react-redux';
import { router } from 'expo-router';
import UsersListPage from '@/app/(app)/(drawer)/users/index';
import {
	useGetUsersInfiniteListInfiniteQuery,
	useDeleteUserMutation,
	useBulkDeleteUsersMutation,
} from '@/store/services/account';

import { translations } from '@/translations';
import { formatDate } from '@/utils/helpers';
import type { UsersQueryParams } from '@/types/usersTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/store/services/account', () => ({
	useGetUsersInfiniteListInfiniteQuery: jest.fn(),
	useDeleteUserMutation: jest.fn(),
	useBulkDeleteUsersMutation: jest.fn(),
}));
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		language: 'fr',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
const t = translations.fr;
const remove = jest.fn();
const bulkRemove = jest.fn();
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const profile = {
	id: 1,
	first_name: 'Current',
	last_name: 'Admin',
	email: 'admin@example.invalid',
	gender: 'Homme',
	avatar: null,
	avatar_cropped: null,
	is_staff: true,
	is_active: true,
	default_password_set: false,
	date_joined: null,
	date_updated: null,
	last_login: null,
};
let resetLoadedPages = false;
type QueryState = { pageCount: number; status: 'ready' | 'loading' | 'error' };
const useUsersQuery = (args: UsersQueryParams) => {
	const [states, setStates] = useState<Record<string, QueryState>>({});
	const key = JSON.stringify(args);
	const state = states[key] ?? { pageCount: 1, status: 'ready' };
	const filtered = !!args.search || !!args.first_name__icontains;
	const firstPage = {
		count: filtered ? 1 : 4,
		next: filtered ? null : 'page2',
		results: filtered
			? [{ id: 8, first_name: 'Sara', last_name: 'Test' }]
			: [
					profile,
					{
						id: 7,
						first_name: 'Amine',
						last_name: 'Test',
						email: 'amine@example.invalid',
						gender: 'Homme',
						is_staff: true,
						is_active: true,
						date_joined: '2025-03-10T12:30:00Z',
						last_login: '2025-04-11T13:45:00Z',
						avatar: 'https://example.invalid/amine.jpg',
						avatar_cropped: 'https://example.invalid/amine-cropped.jpg',
					},
					{ id: 8, first_name: 'Sara', last_name: 'Test', gender: 'Femme', is_staff: false, is_active: false },
				],
	};
	const nextPage = { count: 4, next: null, results: [{ id: 9, first_name: 'Last', last_name: 'User' }] };
	return {
		currentData: { pages: state.pageCount > 1 && !filtered && !resetLoadedPages ? [firstPage, nextPage] : [firstPage] },
		refetch,
		hasNextPage: !filtered && state.pageCount === 1,
		isFetching: state.status === 'loading',
		isFetchingNextPage: state.status === 'loading',
		isFetchNextPageError: state.status === 'error',
		error: state.status === 'error' ? { status: 503 } : undefined,
		fetchNextPage: async () => {
			setStates((current) => ({ ...current, [key]: { ...state, status: 'loading' } }));
			try {
				await fetchNextPage();
				setStates((current) => ({ ...current, [key]: { pageCount: state.pageCount + 1, status: 'ready' } }));
			} catch {
				setStates((current) => ({ ...current, [key]: { ...state, status: 'error' } }));
			}
		},
	};
};
const reachEnd = async () =>
	await fireEvent(
		screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!,
		'endReached',
		{ distanceFromEnd: 0 },
	);
const setup = async (role = 'Caissier', staff = true) => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer, notification },
	});
	store.dispatch(setProfil({ ...profile, is_staff: staff }));
	store.dispatch(setUserCompanies([{ id: 4, raison_sociale: 'Company Four', role, uses_foreign_currency: false }]));
	store.dispatch(setAuthenticated());
	await render(
		<Provider store={store}>
			<UsersListPage />
		</Provider>,
	);

	return store;
};
const confirm = async (label: string) =>
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: label }));

const pressCardAction = async (label: string, index = 0) => {
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[index]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: label }));
	await act(() => modal.props.onDismiss());
};
beforeEach(() => {
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(200, 200, 44, 44));

	resetLoadedPages = false;
	jest.clearAllMocks();
	fetchNextPage.mockReset().mockResolvedValue(undefined);
	remove.mockReturnValue({ unwrap: () => Promise.resolve() });
	bulkRemove.mockReturnValue({ unwrap: () => Promise.resolve() });
	jest.mocked(useDeleteUserMutation).mockReturnValue([remove, { isLoading: false }] as never);
	jest.mocked(useBulkDeleteUsersMutation).mockReturnValue([bulkRemove, { isLoading: false }] as never);
	jest.mocked(useGetUsersInfiniteListInfiniteQuery).mockImplementation(useUsersQuery as never);
});
it('opens row routes and excludes the current account from row actions and selection', async () => {
	await setup();
	expect(screen.queryByRole('checkbox', { name: t.users.selectUser('Current Admin') })).toBeNull();
	expect(screen.getAllByRole('button', { name: t.common.moreActions })).toHaveLength(2);
	await fireEvent.press(screen.getAllByRole('button', { name: new RegExp('^' + t.common.view + ' ') })[0]);
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/users/[id]', params: { id: '7' } });
	await pressCardAction(t.common.edit);
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/users/form', params: { id: '7' } });
});
it('requires confirmation, allows cancellation, and deletes only the chosen user', async () => {
	await setup();
	await pressCardAction(t.common.delete);
	expect(remove).not.toHaveBeenCalled();
	expect(within(screen.getByTestId('action-modal')).getByText(t.common.irreversible)).toBeOnTheScreen();
	expect(within(screen.getByTestId('action-modal')).getByText('Amine Test')).toBeOnTheScreen();
	await confirm(t.common.cancel);
	expect(remove).not.toHaveBeenCalled();
	expect(screen.queryByTestId('action-modal')).toBeNull();
	await pressCardAction(t.common.delete, 1);
	await confirm(t.common.delete);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.users.deleteSuccess));
	expect(remove).toHaveBeenCalledWith({ id: 8 });
	expect(bulkRemove).not.toHaveBeenCalled();
	expect(screen.queryByTestId('action-modal')).toBeNull();
});
it('supports mixed selection, selects all loaded users, and unselects all', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') }));
	expect(screen.getByRole('checkbox', { name: t.shared.clearSelection }).props.accessibilityState.checked).toBe(
		'mixed',
	);
	expect(screen.queryByRole('button', { name: t.users.clearSelection })).toBeNull();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.clearSelection }));
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') })).not.toBeChecked();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	expect(screen.getByRole('checkbox', { name: t.shared.clearSelection })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Sara Test') })).toBeChecked();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.clearSelection }));
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(2) })).toBeNull();
});
it('appends cards, preserves earlier selection and deletes exactly the loaded selected IDs', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await reachEnd();
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	expect(screen.getByText('Amine Test')).toBeOnTheScreen();
	expect(screen.getByText('Sara Test')).toBeOnTheScreen();
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') })).toBeChecked();
	expect(screen.getByRole('checkbox', { name: t.shared.clearSelection }).props.accessibilityState.checked).toBe(
		'mixed',
	);
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Last User') })).not.toBeChecked();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectUser('Last User') }));
	await fireEvent.press(screen.getByRole('button', { name: t.users.bulkDeleteBtn(3) }));
	expect(bulkRemove).not.toHaveBeenCalled();
	expect(screen.getByRole('header', { name: t.users.bulkDeleteModalTitle(3) })).toBeOnTheScreen();
	expect(screen.getByText(t.common.irreversible)).toBeOnTheScreen();
	await confirm(t.users.bulkDeleteBtn(3));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.users.bulkDeleteSuccess(3)));
	expect(bulkRemove).toHaveBeenCalledWith({ ids: [7, 8, 9] });
	expect(remove).not.toHaveBeenCalled();
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(3) })).toBeNull();
});
it('keeps earlier cards during loading and does not request twice while loading or after the end', async () => {
	let finish!: () => void;
	fetchNextPage.mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	await setup();
	await reachEnd();
	expect(screen.getByText(t.dataGrid.loadingMore)).toBeOnTheScreen();
	expect(screen.getByText('Amine Test')).toBeOnTheScreen();
	expect(screen.getByText('Sara Test')).toBeOnTheScreen();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	expect(screen.getByText(t.dataGrid.endOfList)).toBeOnTheScreen();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
});
it('keeps cards and selection after an append error and retries only on request', async () => {
	fetchNextPage.mockRejectedValueOnce(new Error('Unavailable'));
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') }));
	await reachEnd();
	expect(await screen.findByText(t.dataGrid.loadMoreError)).toBeOnTheScreen();
	expect(screen.getByText('Amine Test')).toBeOnTheScreen();
	expect(screen.getByText('Sara Test')).toBeOnTheScreen();
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') })).toBeChecked();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	expect(fetchNextPage).toHaveBeenCalledTimes(2);
	expect(screen.queryByText(t.dataGrid.loadMoreError)).toBeNull();
});
it('clears selection and accumulated cards on a new search and selects only its results', async () => {
	await setup();
	await reachEnd();
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Sara');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(3) })).toBeNull();
	expect(screen.queryByText('Last User')).toBeNull();
	expect(screen.queryByText('Amine Test')).toBeNull();
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: 'Sara' },
		expect.anything(),
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByRole('button', { name: t.users.bulkDeleteBtn(1) }));
	await confirm(t.users.bulkDeleteBtn(1));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.users.bulkDeleteSuccess(1)));
	expect(bulkRemove).toHaveBeenCalledWith({ ids: [8] });
});
it('clears selection and closes confirmation after a failed bulk delete, as on web', async () => {
	bulkRemove.mockReturnValueOnce({
		unwrap: () =>
			Promise.reject({
				status: 409,
				data: {
					message: 'Suppression impossible',
					details: { protected: ['User is referenced by existing documents'] },
				},
			}),
	});
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByRole('button', { name: t.users.bulkDeleteBtn(2) }));
	await confirm(t.users.bulkDeleteBtn(2));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith('User is referenced by existing documents'));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(2) })).toBeNull();
	expect(mockError).toHaveBeenCalledWith('User is referenced by existing documents');
	expect(mockSuccess).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByRole('button', { name: t.users.bulkDeleteBtn(2) }));
	await confirm(t.users.bulkDeleteBtn(2));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.users.bulkDeleteSuccess(2)));
	expect(bulkRemove).toHaveBeenCalledTimes(2);
});
it('does not submit a second deletion while the first request is unresolved', async () => {
	const user = userEvent.setup();
	let finish!: () => void;
	remove.mockReturnValue({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	});
	await setup();
	await pressCardAction(t.common.delete);
	await user.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await confirm(t.common.delete);
	expect(remove).toHaveBeenCalledTimes(1);
	finish();
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
});
it('keeps original staff actions available regardless of company role', async () => {
	await setup('Lecture');
	expect(screen.getAllByRole('checkbox')).toHaveLength(3);
	expect(screen.getAllByRole('button', { name: t.common.moreActions })).toHaveLength(2);
	expect(screen.getAllByRole('button', { name: new RegExp('^' + t.common.view + ' ') })).toHaveLength(2);
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.getByRole('menuitem', { name: t.common.edit })).toBeOnTheScreen();
	expect(screen.getByRole('menuitem', { name: t.common.delete })).toBeOnTheScreen();
});
it('does not request staff user data for a nonstaff account', async () => {
	await setup('Caissier', false);
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.anything(),
		expect.objectContaining({ skip: true }),
	);
	expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
	expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
});

it('restarts the loaded result set and clears selection when a server filter changes', async () => {
	await setup();
	await reachEnd();
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText(t.common.value), 'Sara');
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '', first_name__icontains: 'Sara' },
		expect.anything(),
	);
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(3) })).toBeNull();
	expect(screen.queryByText('Last User')).toBeNull();
	expect(screen.getByText('Sara Test')).toBeOnTheScreen();
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Sara Test') })).not.toBeChecked();
});
it('keeps search, filters and server sorting without page or column controls', async () => {
	await setup();
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	expect(within(list).queryByRole('checkbox', { name: t.users.selectLoaded })).toBeNull();
	expect(
		within(screen.getByTestId('list-toolbar')).getByRole('checkbox', { name: t.users.selectLoaded }),
	).toBeOnTheScreen();
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '' },
		{ skip: false, refetchOnMountOrArgChange: true },
	);
	expect(screen.getByLabelText(t.common.search)).toBeOnTheScreen();
	expect(screen.getByLabelText(t.dataGrid.toolbarFilters)).toBeOnTheScreen();
	expect(screen.getByLabelText(t.dataGrid.toolbarSort)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: 'Page précédente' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Page suivante' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Lignes par page' })).toBeNull();
	expect(screen.queryByLabelText('Colonnes')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.search }));
	expect(
		within(screen.getByTestId('list-toolbar')).getByRole('checkbox', { name: t.users.selectLoaded }),
	).toBeOnTheScreen();
});

it('passes descending sort to the server and resets loaded pages and selection without sorting cards locally', async () => {
	await setup();
	await reachEnd();
	await screen.findByText('Last User');
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
	await fireEvent.press(screen.getByRole('radio', { name: t.users.colNom }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
	await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '', ordering: '-first_name' },
		expect.anything(),
	);
	expect(screen.queryByText('Last User')).toBeNull();
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(3) })).toBeNull();
	expect(
		screen.container
			.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!
			.props.data.map((row: { id: number }) => row.id),
	).toEqual([7, 8]);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortClear }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '' },
		expect.anything(),
	);
});
it('clears selection on refresh and supports pull-to-refresh', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectLoaded }));
	expect(screen.queryByRole('button', { name: t.common.refresh })).toBeNull();
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(refetch).toHaveBeenCalledTimes(1);
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(2) })).toBeNull();
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(refetch).toHaveBeenCalledTimes(2);
});
it('uses stable gender values and preserves false boolean filters', async () => {
	await setup();
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await toggleAutocomplete(t.dataGrid.fieldLabel, -1);
	await fireEvent.press(screen.getByRole('radio', { name: t.users.colSexe }));
	await toggleAutocomplete(t.common.value, -1);
	await fireEvent.press(screen.getByRole('radio', { name: t.users.filterSexeFemme }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ gender: 'F' }),
		expect.anything(),
	);
	await fireEvent.press(screen.getByLabelText(t.dataGrid.toolbarFilters));
	await fireEvent.press(screen.getByLabelText(t.common.addFilter));
	await toggleAutocomplete(t.dataGrid.fieldLabel, -1);
	await fireEvent.press(screen.getByRole('radio', { name: t.users.colActive }));
	await toggleAutocomplete(t.common.value, -1);
	await fireEvent.press(screen.getByRole('radio', { name: t.common.no }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetUsersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ gender: 'F', is_active: 'false' }),
		expect.anything(),
	);
});

it('drops selected IDs and confirmation when a cache replacement unloads their cards', async () => {
	const store = await setup();
	await reachEnd();
	expect(await screen.findByText('Last User')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('checkbox', { name: t.users.selectUser('Last User') }));
	await fireEvent.press(screen.getByRole('button', { name: t.users.bulkDeleteBtn(1) }));
	expect(screen.getByTestId('action-modal')).toBeOnTheScreen();
	resetLoadedPages = true;
	await screen.rerender(
		<Provider store={store}>
			<UsersListPage />
		</Provider>,
	);
	expect(screen.queryByText('Last User')).toBeNull();
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(screen.queryByRole('button', { name: t.users.bulkDeleteBtn(1) })).toBeNull();
	expect(screen.getByRole('checkbox', { name: t.users.selectUser('Amine Test') })).not.toBeChecked();
});

it('displays the original user fields and opens the full avatar from its cropped thumbnail', async () => {
	await setup();
	expect(screen.getByText('amine@example.invalid')).toBeOnTheScreen();
	expect(screen.getByText('Homme')).toBeOnTheScreen();
	expect(screen.getByText('Femme')).toBeOnTheScreen();
	expect(
		within(screen.getByTestId('user-card-7')).getByLabelText(`${t.users.colAdmin}: ${t.common.yes}`),
	).toBeOnTheScreen();
	expect(
		within(screen.getByTestId('user-card-7')).getByText(`${t.users.colActive}: ${t.common.yes}`),
	).toBeOnTheScreen();
	expect(
		within(screen.getByTestId('user-card-8')).getByLabelText(`${t.users.colAdmin}: ${t.common.no}`),
	).toBeOnTheScreen();
	expect(within(screen.getByTestId('user-card-8')).getByText(`${t.users.colActive}: ${t.common.no}`)).toBeOnTheScreen();
	expect(screen.getByText(formatDate('2025-03-10T12:30:00Z'))).toBeOnTheScreen();
	expect(screen.getByText(formatDate('2025-04-11T13:45:00Z'))).toBeOnTheScreen();
	expect(screen.getAllByText('-').length).toBeGreaterThan(0);
	expect(screen.container.queryAll((node) => node.type === 'Image')[0]!.props.source).toEqual({
		uri: 'https://example.invalid/amine-cropped.jpg',
	});
	await fireEvent.press(screen.getByRole('button', { name: 'Amine Test' }));
	expect(
		screen.container
			.queryAll((node) => node.type === 'Image')
			.some(({ props }) => props.source.uri === 'https://example.invalid/amine.jpg'),
	).toBe(true);

	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	expect(screen.queryByRole('button', { name: t.common.close })).toBeNull();
});

it.each([
	[{ status_code: 0, message: 'Network failed', details: {} }, t.errors.networkError],
	[{ status: 403, data: { status_code: 403, message: 'Forbidden' } }, t.noPermission.description],
	[{ status: 503, data: { status_code: 503, message: 'Service unavailable' } }, 'Service unavailable'],
])('surfaces an initial list failure and offers a fresh retry: %s', async (error, message) => {
	jest.mocked(useGetUsersInfiniteListInfiniteQuery).mockReturnValue({
		currentData: undefined,
		error,
		refetch,
		isFetching: false,
		isFetchNextPageError: false,
	} as never);
	await setup();
	expect(screen.getByRole('alert')).toHaveTextContent(message);
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(refetch).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('checkbox', { name: t.users.selectLoaded })).toBeDisabled();
	expect(remove).not.toHaveBeenCalled();
	expect(bulkRemove).not.toHaveBeenCalled();
});
