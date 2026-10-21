import { toggleAutocomplete } from '@/components/formikElements/customAutoCompleteSelect/setupAutocomplete';
import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { CompaniesQueryParams } from '@/types/companyTypes';
import { Provider } from 'react-redux';
import { router } from 'expo-router';
import CompaniesListPage from '@/app/(app)/(drawer)/companies/index';

import {
	useGetCompaniesInfiniteListInfiniteQuery,
	useSuspendCompanyMutation,
	useBulkSuspendCompaniesMutation,
	useLazyGetCompaniesListQuery,
	companyApi,
} from '@/store/services/company';

import { translations } from '@/translations';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { formatDate } from '@/utils/helpers';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn(), push: jest.fn() } }));
const mockSuccess = jest.fn();
const mockError = jest.fn();
let mockLanguage: 'fr' | 'en' = 'fr';
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations[mockLanguage],
		language: mockLanguage,
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));

jest.mock('@/store/services/company', () => ({
	useGetCompaniesInfiniteListInfiniteQuery: jest.fn(),
	useSuspendCompanyMutation: jest.fn(),
	useBulkSuspendCompaniesMutation: jest.fn(),
	useLazyGetCompaniesListQuery: jest.fn(),
	companyApi: { endpoints: { getUserCompanies: { initiate: jest.fn() } } },
}));
const suspend = jest.fn();
const bulkSuspend = jest.fn();
const fetchAllCompanyIds = jest.fn();
const abortAllIds = jest.fn();
const unsubscribeAllIds = jest.fn();
const companyPage = (ids: number[], next: string | null = null) => ({
	count: 2,
	next,
	previous: null,
	results: ids.map((id) => ({ id })),
});
const selectionResponse = (value: unknown) => ({
	unwrap: () => Promise.resolve(value),
	abort: abortAllIds,
	unsubscribe: unsubscribeAllIds,
});
const refetch = jest.fn();
const fetchNextPage = jest.fn();
type QueryState = { pageCount: number; status: 'ready' | 'loading' | 'error' };
const useCompaniesQuery = (args: CompaniesQueryParams) => {
	const [states, setStates] = useState<Record<string, QueryState>>({});
	const key = JSON.stringify(args);
	const state = states[key] ?? { pageCount: 1, status: 'ready' };
	const filtered = !!args.search || !!args.raison_sociale__icontains;
	const firstPage = {
		count: filtered ? 1 : 2,
		next: filtered ? null : 'page2',
		results: [{ id: 4, raison_sociale: args.search || 'Company Four', ICE: '123456789012345' }],
	};
	const nextPage = {
		count: 2,
		next: null,
		results: [{ id: 8, raison_sociale: 'Company Eight', ICE: '987654321098765' }],
	};
	return {
		currentData: { pages: state.pageCount > 1 && !filtered ? [firstPage, nextPage] : [firstPage] },
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
const setup = async (role = 'Caissier') => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	const dispatch = jest.spyOn(store, 'dispatch');
	store.dispatch(
		setProfil({
			id: 7,
			first_name: 'Test',
			last_name: 'Creator',
			email: 'creator@example.invalid',
			gender: 'Homme',
			avatar: null,
			avatar_cropped: null,
			is_staff: true,
			is_active: true,
			default_password_set: false,
			date_joined: null,
			date_updated: null,
			last_login: null,
		}),
	);
	store.dispatch(setUserCompanies([{ id: 4, raison_sociale: 'Company Four', role, uses_foreign_currency: false }]));
	store.dispatch(setAuthenticated());

	const rendered = await render(
		<Provider store={store}>
			<CompaniesListPage />
		</Provider>,
	);

	return { store, dispatch, ...rendered };
};
beforeEach(() => {
	mockLanguage = 'fr';
	jest.clearAllMocks();
	fetchNextPage.mockReset().mockResolvedValue(undefined);
	jest.mocked(useGetCompaniesInfiniteListInfiniteQuery).mockImplementation(useCompaniesQuery as never);
	suspend.mockReturnValue({ unwrap: () => Promise.resolve() });
	jest.mocked(useSuspendCompanyMutation).mockReturnValue([suspend, {}] as never);
	bulkSuspend.mockReturnValue({ unwrap: () => Promise.resolve({ suspended: 2 }) });
	fetchAllCompanyIds.mockReset().mockReturnValue(selectionResponse(companyPage([4, 8])));
	jest.mocked(useBulkSuspendCompaniesMutation).mockReturnValue([bulkSuspend, {}] as never);
	jest.mocked(useLazyGetCompaniesListQuery).mockReturnValue([fetchAllCompanyIds, { isFetching: false }] as never);
});

it('renders every original company column in its card and translates employee counts', async () => {
	mockLanguage = 'en';
	const t = translations.en;
	jest.mocked(useGetCompaniesInfiniteListInfiniteQuery).mockReturnValue({
		currentData: {
			pages: [
				{
					count: 1,
					next: null,
					results: [
						{
							id: 4,
							raison_sociale: 'Company Four',
							ICE: '123456789012345',
							nom_responsable: 'Company Manager',
							email: 'company@example.invalid',
							telephone: '+212600000001',
							nbr_employe: '1 à 5',
							date_created: '2026-01-10',
							logo: 'https://example.invalid/logo.png',
							logo_cropped: 'https://example.invalid/logo-cropped.png',
						},
					],
				},
			],
		},
		refetch,
		isFetching: false,
	} as never);
	await setup();
	for (const value of [
		'Company Four',
		'Company Manager',
		'company@example.invalid',
		'+212600000001',
		`${t.companies.colICE}: 123456789012345`,
		`${t.rawData.employeeRanges['1to5']} ${t.companies.colEmployes}`,
		formatDate('2026-01-10'),
	]) {
		expect(screen.getByText(value)).toBeOnTheScreen();
	}
	expect(screen.container.queryAll((node) => node.type === 'Image')[0]!.props.source).toEqual({
		uri: 'https://example.invalid/logo-cropped.png',
	});
	await fireEvent.press(screen.getByRole('button', { name: 'Company Four' }));
	expect(
		screen.container
			.queryAll((node) => node.type === 'Image')
			.some(({ props }) => props.source.uri === 'https://example.invalid/logo.png'),
	).toBe(true);
});
it('passes company IDs to view/edit routes and opens the existing create route', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.view }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/companies/[id]', params: { id: '4' } });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.edit }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/companies/form', params: { id: '4' } });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.newCompany }));
	expect(router.push).toHaveBeenLastCalledWith('/companies/form');
});
it('appends companies in ten-item requests and starts a new result set when searching', async () => {
	await setup();
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '' },
		{ skip: false, refetchOnMountOrArgChange: true },
	);
	await reachEnd();
	expect(await screen.findByText('Company Eight')).toBeOnTheScreen();
	expect(screen.getByText('Company Four')).toBeOnTheScreen();
	expect(screen.getByText(translations.fr.dataGrid.endOfList)).toBeOnTheScreen();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);

	await fireEvent.press(screen.getByLabelText(translations.fr.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'Company Search');
	await fireEvent(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'submitEditing');
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: 'Company Search' },
		{ skip: false, refetchOnMountOrArgChange: true },
	);
	expect(screen.queryByText('Company Eight')).toBeNull();
	expect(screen.queryByText('Company Four')).toBeNull();
	expect(screen.getByText('Company Search')).toBeOnTheScreen();
});
it('keeps loaded companies visible and prevents duplicate requests while appending', async () => {
	let finish!: () => void;
	fetchNextPage.mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	);
	await setup();
	await reachEnd();
	expect(screen.getByText(translations.fr.dataGrid.loadingMore)).toBeOnTheScreen();
	expect(screen.getByText('Company Four')).toBeOnTheScreen();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	expect(await screen.findByText('Company Eight')).toBeOnTheScreen();
	expect(screen.getByText('Company Four')).toBeOnTheScreen();
	expect(screen.queryByText(translations.fr.dataGrid.loadingMore)).toBeNull();
});
it('shows append errors beside the existing cards and retries without dropping those cards', async () => {
	fetchNextPage.mockRejectedValueOnce(new Error('Unavailable'));
	await setup();
	await reachEnd();
	expect(await screen.findByText(translations.fr.dataGrid.loadMoreError)).toBeOnTheScreen();
	expect(screen.getByText('Company Four')).toBeOnTheScreen();
	await reachEnd();
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
	expect(await screen.findByText('Company Eight')).toBeOnTheScreen();
	expect(screen.getByText('Company Four')).toBeOnTheScreen();
	expect(fetchNextPage).toHaveBeenCalledTimes(2);
	expect(screen.queryByText(translations.fr.dataGrid.loadMoreError)).toBeNull();
});
it('supports both pull-to-refresh and the explicit refresh action', async () => {
	await setup();
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(refetch).toHaveBeenCalledTimes(1);
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(refetch).toHaveBeenCalledTimes(2);
});
it('allows staff company creation regardless of membership role', async () => {
	await setup('Lecture');
	expect(screen.getByRole('button', { name: translations.fr.companies.newCompany })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.common.view })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: translations.fr.common.edit })).toBeOnTheScreen();
});

it('requires company suspension confirmation and allows cancellation', async () => {
	await setup();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
	expect(suspend).not.toHaveBeenCalled();
	expect(
		within(screen.getByTestId('action-modal')).getByText(translations.fr.companies.suspendModalBody),
	).toBeOnTheScreen();
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.cancel }),
	);
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(suspend).not.toHaveBeenCalled();
});
it('suspends the chosen company and removes its accessible membership before refreshing', async () => {
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.suspendSuccess));
	expect(suspend).toHaveBeenCalledWith({ id: 4 });
	expect(dispatch).toHaveBeenCalledWith(companiesSetUserCompaniesAction([]));
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(screen.queryByTestId('action-modal')).toBeNull();
});
it('closes the modal on suspension failure and does not remove memberships', async () => {
	suspend.mockReturnValue({ unwrap: () => Promise.reject(new Error('Unavailable')) });
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.suspendError));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(mockError).toHaveBeenCalledWith(translations.fr.companies.suspendError);
	expect(dispatch).not.toHaveBeenCalledWith(companiesSetUserCompaniesAction([]));
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
});
it('finishes suspension without starting a separate membership request', async () => {
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.suspendBtn }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.suspendSuccess));
	expect(dispatch).toHaveBeenCalledWith(companiesSetUserCompaniesAction([]));
	expect(mockError).not.toHaveBeenCalled();
});
it('targets an appended company for suspension and preserves the earlier membership', async () => {
	const { dispatch } = await setup();
	await reachEnd();
	expect(await screen.findByText('Company Eight')).toBeOnTheScreen();
	await fireEvent.press(screen.getAllByRole('button', { name: translations.fr.companies.suspendBtn })[1]);
	expect(
		within(screen.getByTestId('action-modal')).getByText(translations.fr.companies.suspendModalBody),
	).toBeOnTheScreen();
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
	expect(suspend).toHaveBeenCalledWith({ id: 8 });
	expect(dispatch).toHaveBeenCalledWith(
		companiesSetUserCompaniesAction([
			{ id: 4, raison_sociale: 'Company Four', role: 'Caissier', uses_foreign_currency: false },
		]),
	);
	expect(refetch).not.toHaveBeenCalled();
});
it('offers search, filters and server sorting without pagination or column controls', async () => {
	await setup();
	const selectAll = within(screen.getByTestId('list-toolbar')).getByRole('checkbox');
	expect(selectAll).toBeOnTheScreen();
	const list = screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')[0]!;
	expect(within(list).queryByRole('checkbox', { name: selectAll.props.accessibilityLabel })).toBeNull();
	expect(screen.getByLabelText(translations.fr.common.search)).toBeOnTheScreen();
	expect(screen.getByLabelText(translations.fr.dataGrid.toolbarFilters)).toBeOnTheScreen();
	expect(screen.getByLabelText(translations.fr.dataGrid.toolbarSort)).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: 'Page précédente' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Page suivante' })).toBeNull();
	expect(screen.queryByRole('button', { name: 'Lignes par page' })).toBeNull();
	expect(screen.queryByLabelText('Colonnes')).toBeNull();
});

it('passes company ordering to the server and resets loaded pages and all-matching selection', async () => {
	await setup();
	const t = translations.fr;
	await reachEnd();
	await screen.findByText('Company Eight');
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
	await fireEvent.press(screen.getByRole('radio', { name: t.companies.colRaisonSociale }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '', ordering: 'raison_sociale' },
		expect.anything(),
	);
	expect(screen.queryByText('Company Eight')).toBeNull();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
	expect(screen.queryByRole('button', { name: t.companies.bulkSuspendBtn(2) })).toBeNull();
});
it('applies and clears server filters and restarts the result set for the changed filter', async () => {
	await setup();
	await reachEnd();
	expect(await screen.findByText('Company Eight')).toBeOnTheScreen();
	await fireEvent.press(screen.getByLabelText(translations.fr.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.common.value), 'Démo');
	await fireEvent.press(screen.getByText(translations.fr.dataGrid.searchApply));
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '', raison_sociale__icontains: 'Démo' },
		expect.anything(),
	);
	expect(screen.queryByText('Company Eight')).toBeNull();
	await fireEvent.press(screen.getByText(translations.fr.common.clearAllFilters));
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		{ pageSize: 10, search: '' },
		expect.anything(),
	);
});
it('does not offer unsupported OR filtering', async () => {
	await setup();
	await fireEvent.press(screen.getByLabelText(translations.fr.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.common.value), 'Example');
	await fireEvent.press(screen.getByLabelText(translations.fr.common.addFilter));
	expect(screen.getByText(translations.fr.filterPanel.and)).toBeOnTheScreen();
	expect(screen.queryByText(translations.fr.filterPanel.or)).toBeNull();
});
it('keeps inline search open after submitting and clears a later draft directly', async () => {
	await setup();
	await fireEvent.press(screen.getByLabelText(translations.fr.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'Company Search');
	await fireEvent(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'submitEditing');
	await waitFor(() =>
		expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ search: 'Company Search' }),
			expect.anything(),
		),
	);
	expect(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder)).toHaveProp('value', 'Company Search');
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'Discard me');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.searchClear }));
	expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ search: '' }),
		expect.anything(),
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
	expect(screen.queryByPlaceholderText(translations.fr.dataGrid.searchPlaceholder)).toBeNull();
});

it('combines both date bounds in the web preview using the Django date contract', async () => {
	const platform = jest.replaceProperty(Platform, 'OS', 'web');
	try {
		await setup();
		await fireEvent.press(screen.getByLabelText(translations.fr.dataGrid.toolbarFilters));
		await toggleAutocomplete(translations.fr.dataGrid.fieldLabel, -1);
		await fireEvent.press(screen.getAllByText(translations.fr.common.dateCreation).at(-1)!);
		await fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-10-01');
		await fireEvent.press(screen.getByLabelText(translations.fr.common.addFilter));
		await toggleAutocomplete(translations.fr.dataGrid.fieldLabel, -1);
		await fireEvent.press(screen.getAllByText(translations.fr.common.dateCreation).at(-1)!);
		await toggleAutocomplete(translations.fr.dataGrid.operatorLabel, -1);
		await fireEvent.press(screen.getByText(translations.fr.dataGrid.operatorLabels.onOrAfter));
		await fireEvent.changeText(screen.getAllByPlaceholderText('YYYY-MM-DD').at(-1)!, '2026-01-01');
		await fireEvent.press(screen.getByText(translations.fr.dataGrid.searchApply));
		expect(useGetCompaniesInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({
				date_created_after: '2026-01-01',
				date_created_before: '2026-10-01',
			}),
			expect.anything(),
		);
	} finally {
		platform.restore();
	}
});

it('selects matching companies beyond loaded cards and suspends the explicit IDs only after confirmation', async () => {
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	expect(screen.queryByText('Company Eight')).toBeNull();
	expect(fetchAllCompanyIds).toHaveBeenCalledWith({ with_pagination: true, page: 1, pageSize: 10, search: '' }, false);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	expect(bulkSuspend).not.toHaveBeenCalled();
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.cancel }),
	);
	expect(bulkSuspend).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.bulkSuspendSuccess(2)));
	expect(bulkSuspend).toHaveBeenCalledWith({ ids: [4, 8] });
	expect(dispatch).toHaveBeenCalledWith(companiesSetUserCompaniesAction([]));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
});

it('collects only matching IDs from every filtered page, never the unrelated unpaginated result', async () => {
	fetchAllCompanyIds.mockImplementation((args: CompaniesQueryParams) =>
		selectionResponse(
			!args.with_pagination ? [{ id: 99 }] : args.page === 1 ? companyPage([4], '?page=3') : companyPage([8, 4]),
		),
	);
	await setup();
	await fireEvent.press(screen.getByLabelText(translations.fr.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'Company');
	await fireEvent(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'submitEditing');
	await fireEvent.press(screen.getByLabelText(translations.fr.dataGrid.toolbarFilters));
	await fireEvent.changeText(screen.getByPlaceholderText(translations.fr.common.value), 'Démo');
	await fireEvent.press(screen.getByText(translations.fr.dataGrid.searchApply));
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(1) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	expect(fetchAllCompanyIds.mock.calls).toEqual(
		[1, 3].map((page) => [
			{ with_pagination: true, page, pageSize: 10, search: 'Company', raison_sociale__icontains: 'Démo' },
			false,
		]),
	);
	expect(unsubscribeAllIds).toHaveBeenCalledTimes(2);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.companies.suspendBtn }),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
	expect(bulkSuspend).toHaveBeenCalledWith({ ids: [4, 8] });
});

it.each(['search', 'filter'])('ignores all-matching results after a pending %s changes', async (kind) => {
	let finish!: (value: ReturnType<typeof companyPage>) => void;
	fetchAllCompanyIds.mockReturnValueOnce(selectionResponse(companyPage([4], '?page=2'))).mockReturnValue({
		abort: abortAllIds,
		unsubscribe: unsubscribeAllIds,
		unwrap: () =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	});
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await waitFor(() => expect(fetchAllCompanyIds).toHaveBeenCalledTimes(2));
	await fireEvent.press(
		screen.getByLabelText(kind === 'search' ? translations.fr.common.search : translations.fr.dataGrid.toolbarFilters),
	);
	await fireEvent.changeText(
		screen.getByPlaceholderText(
			kind === 'search' ? translations.fr.dataGrid.searchPlaceholder : translations.fr.common.value,
		),
		'New value',
	);
	if (kind === 'search')
		await fireEvent(screen.getByPlaceholderText(translations.fr.dataGrid.searchPlaceholder), 'submitEditing');
	else await fireEvent.press(screen.getByText(translations.fr.dataGrid.searchApply));
	expect(abortAllIds).toHaveBeenCalledTimes(1);
	await act(async () => finish(companyPage([8])));
	expect(fetchAllCompanyIds).toHaveBeenCalledTimes(2);
	expect(mockError).not.toHaveBeenCalled();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
	expect(bulkSuspend).not.toHaveBeenCalled();
});

it('clears selected IDs and closes the bulk modal after rejection, as on web', async () => {
	bulkSuspend.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('Denied')) });
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.bulkSuspendError));
	expect(screen.queryByTestId('action-modal')).toBeNull();
	expect(companyApi.endpoints.getUserCompanies.initiate).not.toHaveBeenCalled();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
	expect(bulkSuspend.mock.calls.map(([payload]) => payload)).toEqual([{ ids: [4, 8] }, { ids: [4, 8] }]);
});

it('reports the actual suspended count and does not optimistically remove skipped companies', async () => {
	bulkSuspend.mockReturnValue({ unwrap: () => Promise.resolve({ suspended: 1 }) });
	const { dispatch } = await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) }));
	await fireEvent.press(
		within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.companies.suspendBtn,
		}),
	);
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(translations.fr.companies.bulkSuspendSuccess(1)));
	expect(dispatch).not.toHaveBeenCalledWith(companiesSetUserCompaniesAction([]));
	expect(dispatch).not.toHaveBeenCalledWith(
		expect.objectContaining({ type: companiesSetUserCompaniesAction([]).type }),
	);
});

it('supports individual card selection and clears selection when refreshing', async () => {
	await setup();
	await fireEvent.press(
		screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': Company Four' }),
	);
	expect(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: translations.fr.common.refresh })).toBeNull();
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeNull();
});

it('uses the shared selection checkbox to select and clear all matching companies', async () => {
	await setup();
	const control = () => screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) });
	expect(control()).not.toBeChecked();
	await fireEvent.press(control());
	await waitFor(() => expect(control()).toBeChecked());
	expect(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeOnTheScreen();
	await fireEvent.press(control());
	expect(control()).not.toBeChecked();
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
	expect(fetchAllCompanyIds).toHaveBeenCalledTimes(1);
});

it('recognizes all manually selected companies without fetching the same IDs again', async () => {
	await setup();
	await reachEnd();
	await screen.findByText('Company Eight');
	for (const name of ['Company Four', 'Company Eight']) {
		await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': ' + name }));
	}
	const control = screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) });
	expect(control).toBeChecked();
	await fireEvent.press(control);
	expect(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) })).not.toBeChecked();
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
	expect(fetchAllCompanyIds).not.toHaveBeenCalled();
});

it('keeps manual selection and reports a failed all-matching request', async () => {
	fetchAllCompanyIds.mockReturnValue({
		unwrap: () => Promise.reject(new Error('Unavailable')),
		abort: abortAllIds,
		unsubscribe: unsubscribeAllIds,
	});
	await setup();
	await fireEvent.press(
		screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': Company Four' }),
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.fetchIdsError));
	expect(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeOnTheScreen();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
});

it('keeps selection unchanged when a later page fails and releases the operation for a full retry', async () => {
	fetchAllCompanyIds.mockReturnValueOnce(selectionResponse(companyPage([8], '?page=2'))).mockReturnValueOnce({
		unwrap: () => Promise.reject(new Error('Second page unavailable')),
		abort: abortAllIds,
		unsubscribe: unsubscribeAllIds,
	});
	await setup();
	await fireEvent.press(
		screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': Company Four' }),
	);
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.fetchIdsError));
	expect(screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': Company Four' })).toBeChecked();
	expect(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeOnTheScreen();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
	expect(unsubscribeAllIds).toHaveBeenCalledTimes(2);
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await within(screen.getByTestId('list-toolbar')).findByRole('checkbox', { checked: true });
	expect(fetchAllCompanyIds).toHaveBeenCalledTimes(3);
});

it('keeps the whole page collection busy and cancels it when refreshing', async () => {
	let finish!: (value: ReturnType<typeof companyPage>) => void;
	fetchAllCompanyIds.mockReturnValueOnce(selectionResponse(companyPage([4], '?page=2'))).mockReturnValueOnce({
		unwrap: () =>
			new Promise((resolve) => {
				finish = resolve;
			}),
		abort: abortAllIds,
		unsubscribe: unsubscribeAllIds,
	});
	await setup();
	const label = translations.fr.shared.selectAllMatching(2);
	await fireEvent.press(screen.getByRole('checkbox', { name: label }));
	await waitFor(() => expect(fetchAllCompanyIds).toHaveBeenCalledTimes(2));
	expect(screen.getByRole('checkbox', { name: label })).toBeDisabled();
	await fireEvent.press(screen.getByRole('checkbox', { name: label }));
	expect(fetchAllCompanyIds).toHaveBeenCalledTimes(2);
	await fireEvent(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!, 'refresh');
	expect(abortAllIds).toHaveBeenCalledTimes(1);
	expect(refetch).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('checkbox', { name: label })).toBeEnabled();
	await act(async () => finish(companyPage([8])));
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
	expect(mockError).not.toHaveBeenCalled();
	expect(unsubscribeAllIds).toHaveBeenCalledTimes(2);
});

it.each(['?page=1', '?page=0', '?page=2.5', 'not-a-page', 'http://['])(
	'rejects invalid or non-forward next link %s without committing partial selection',
	async (next) => {
		fetchAllCompanyIds.mockReturnValue(selectionResponse(companyPage([8], next)));
		await setup();
		await fireEvent.press(
			screen.getByRole('checkbox', { name: translations.fr.shared.selectCompany + ': Company Four' }),
		);
		await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.fetchIdsError));
		expect(fetchAllCompanyIds).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeOnTheScreen();
		expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
		expect(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) })).toBeEnabled();
	},
);

it('stops a repeated next page rather than looping or claiming all matching IDs were collected', async () => {
	fetchAllCompanyIds
		.mockReturnValueOnce(selectionResponse(companyPage([4], '?page=2')))
		.mockReturnValue(selectionResponse(companyPage([8], '?page=2')));
	await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.fetchIdsError));
	expect(fetchAllCompanyIds).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(2) })).toBeNull();
	expect(within(screen.getByTestId('list-toolbar')).queryByRole('checkbox', { checked: true })).toBeNull();
});

it.each([[{ id: 99 }], { count: 1, results: [{ id: 99 }] }, { count: 1, next: null, results: [{ id: 0 }] }])(
	'rejects a malformed paginated payload %j without selecting its IDs',
	async (data) => {
		fetchAllCompanyIds.mockReturnValue(selectionResponse(data));
		await setup();
		await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.companies.fetchIdsError));
		expect(screen.queryByRole('button', { name: translations.fr.companies.bulkSuspendBtn(1) })).toBeNull();
	},
);

it('aborts the current lazy request on unmount and ignores a late page response', async () => {
	let finish!: (value: ReturnType<typeof companyPage>) => void;
	fetchAllCompanyIds.mockReturnValue({
		unwrap: () =>
			new Promise((resolve) => {
				finish = resolve;
			}),
		abort: abortAllIds,
		unsubscribe: unsubscribeAllIds,
	});
	const { unmount } = await setup();
	await fireEvent.press(screen.getByRole('checkbox', { name: translations.fr.shared.selectAllMatching(2) }));
	await unmount();
	expect(abortAllIds).toHaveBeenCalledTimes(1);
	await act(async () => finish(companyPage([4, 8])));
	expect(unsubscribeAllIds).toHaveBeenCalledTimes(1);
	expect(mockError).not.toHaveBeenCalled();
	expect(bulkSuspend).not.toHaveBeenCalled();
});
