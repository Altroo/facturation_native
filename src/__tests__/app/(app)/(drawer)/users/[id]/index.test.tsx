import { createQueryMock } from '@/__tests__/setupQuery';
import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { router, useLocalSearchParams } from 'expo-router';
import UsersView from '@/app/(app)/(drawer)/users/[id]/index';
import { useGetUserQuery, useDeleteUserMutation } from '@/store/services/account';
import { translations } from '@/translations';
import type { UserWithCompaniesResponseType } from '@/types/usersTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({
	useLocalSearchParams: jest.fn(() => ({ id: '7' })),
	router: { dismissTo: jest.fn(), push: jest.fn() },
}));
jest.mock('@/store/services/account', () => ({
	useGetUserQuery: jest.fn(function useGetUserQuery() {
		return mockUserQuery.useResult();
	}),
	useDeleteUserMutation: jest.fn(),
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
const mockUserQuery = createQueryMock<ReturnType<typeof useGetUserQuery>>({} as never);
const user: UserWithCompaniesResponseType = {
	id: 7,
	first_name: 'Example',
	last_name: 'User',
	email: 'example@example.invalid',
	gender: 'Femme',
	avatar: null,
	avatar_cropped: null,
	is_staff: false,
	is_active: true,
	default_password_set: false,
	date_joined: '2026-01-01',
	date_updated: null,
	last_login: null,
	companies: [
		{
			membership_id: 3,
			company_id: 4,
			raison_sociale: 'Company Four',
			role: 'Commercial',
			can_validate_factures: true,
			can_change_document_status: false,
		},
	],
};
const remove = jest.fn();
const setup = async (role = 'Caissier', record = user) => {
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(setProfil({ ...user, id: 1, is_staff: true }));
	store.dispatch(setUserCompanies([{ id: 4, raison_sociale: 'Company Four', role, uses_foreign_currency: false }]));
	store.dispatch(setAuthenticated());
	await mockUserQuery.setResult({ currentData: record, refetch: jest.fn() } as never);
	jest.mocked(useDeleteUserMutation).mockReturnValue([remove, { isLoading: false }] as never);
	const view = await render(
		<Provider store={store}>
			<UsersView />
		</Provider>,
	);

	return { view, store };
};
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
});

describe('UsersViewPage', () => {
	it.each(['2026-10-15T10:09:17Z', '15/10/2026', 'Date inconnue', null, ''])(
		'renders user dates safely inside Text: %s',
		async (value) => {
			await setup('Caissier', { ...user, date_joined: value });
		},
	);

	it('separates two memberships with their own names, logos, roles and permissions without showing IDs', async () => {
		await setup('Caissier', {
			...user,
			companies: [
				{
					...user.companies[0],
					logo: 'https://example.invalid/logo.png',
					logo_cropped: 'https://example.invalid/crop.png',
				},
				{
					...user.companies[0],
					membership_id: 4,
					company_id: 9,
					raison_sociale: 'Second Company',
					role: 'Lecture',
					can_validate_factures: false,
					can_change_document_status: true,
				},
			],
		});
		const panels = screen.getAllByTestId('managed-by-details');
		expect(panels).toHaveLength(2);
		const first = within(panels[0]);
		const second = within(panels[1]);
		expect(first.getByRole('header', { name: 'Company Four' })).toBeOnTheScreen();
		expect(first.getByRole('button', { name: 'Company Four' })).not.toBeDisabled();
		const logo = screen.container.queryAll(
			(node) => node.type === 'Image' && node.props.accessibilityLabel === 'Company Four',
		)[0];
		expect(logo).toHaveProp('source', {
			uri: 'https://example.invalid/crop.png',
		});
		expect(first.getByText('Commercial')).toBeOnTheScreen();
		expect(first.queryByText('Second Company')).toBeNull();
		expect(second.getByRole('header', { name: 'Second Company' })).toBeOnTheScreen();
		expect(second.getByText('Lecture')).toBeOnTheScreen();
		expect(second.queryByRole('image')).toBeNull();
		expect(second.getByText(translations.fr.managedByTable.invoiceValidation)).toBeOnTheScreen();
		expect(second.getByText(translations.fr.managedByTable.documentStatusChange)).toBeOnTheScreen();
		expect(screen.queryByText(/^ID:/)).toBeNull();
	});

	it('shows company permissions and requires the confirmation modal before deleting', async () => {
		remove.mockReturnValue({ unwrap: () => Promise.resolve() });
		await setup();
		expect(screen.getByText('Company Four')).toBeOnTheScreen();
		expect(screen.queryByText(/^ID:/)).toBeNull();
		expect(screen.getByText(translations.fr.managedByTable.invoiceValidation)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		expect(remove).not.toHaveBeenCalled();
		expect(screen.getByText(translations.fr.users.deleteModalTitle)).toBeOnTheScreen();
		await fireEvent.press(
			within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.delete }),
		);
		await waitFor(() => expect(remove).toHaveBeenCalledWith({ id: 7 }));
		expect(mockSuccess).toHaveBeenCalledWith(translations.fr.users.deleteSuccess);
		expect(router.dismissTo).toHaveBeenCalledWith('/users');
	});

	it('keeps the complete header email selectable without forcing it onto one line', async () => {
		await setup('Caissier', { ...user, email: 'purchase-lecture@example.invalid' });
		const email = screen.getAllByText('purchase-lecture@example.invalid')[0];
		expect(email).toHaveProp('selectable', true);
		expect(email).not.toHaveProp('numberOfLines');
		expect(screen.queryByText(/^ID:/)).toBeNull();
	});

	it('closes the modal and reports a failed delete without navigating', async () => {
		remove.mockReturnValue({ unwrap: () => Promise.reject(new Error('Server failed')) });
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		await fireEvent.press(
			within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.delete }),
		);
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.users.deleteError));
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(mockError).toHaveBeenCalledWith(translations.fr.users.deleteError);
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('allows all staff to view, edit and delete regardless of company role', async () => {
		await setup('Lecture');
		expect(screen.getByText('Company Four')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: translations.fr.common.edit })).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: translations.fr.common.delete })).toBeOnTheScreen();
	});

	it('closes the previous user confirmation when the route changes to another user', async () => {
		const { view, store } = await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		expect(screen.getByTestId('action-modal')).toBeOnTheScreen();
		jest.mocked(useLocalSearchParams).mockReturnValue({ id: '8' });
		await mockUserQuery.setResult({ currentData: { ...user, id: 8 }, refetch: jest.fn() } as never);
		await view.rerender(
			<Provider store={store}>
				<UsersView />
			</Provider>,
		);
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(remove).not.toHaveBeenCalled();
		expect(useGetUserQuery).toHaveBeenLastCalledWith({ id: 8 }, expect.any(Object));
	});

	it('rejects a malformed route parameter before requesting or deleting a user', async () => {
		jest.mocked(useLocalSearchParams).mockReturnValue({ id: '../7' });
		await setup();
		expect(screen.getByText(translations.fr.notFound.message)).toBeOnTheScreen();
		expect(useGetUserQuery).not.toHaveBeenCalled();
		expect(remove).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.back }));
		expect(router.dismissTo).toHaveBeenCalledWith('/users');
	});

	it('reports the backend protected-user explanation and closes the modal', async () => {
		remove.mockReturnValue({
			unwrap: () =>
				Promise.reject({
					status: 409,
					data: { details: { protected: ['User is referenced by existing documents'] } },
				}),
		});
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		await fireEvent.press(
			within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.delete }),
		);
		await waitFor(() => expect(mockError).toHaveBeenCalledWith('User is referenced by existing documents'));
		expect(mockError).toHaveBeenCalledWith('User is referenced by existing documents');
		expect(screen.queryByTestId('action-modal')).toBeNull();
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('submits only once while a detail destructive request is unresolved, then permits retry after failure', async () => {
		let reject!: (error: Error) => void;
		remove.mockReturnValueOnce({
			unwrap: () =>
				new Promise((_, rejectRequest) => {
					reject = rejectRequest;
				}),
		});
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		const button = within(screen.getByTestId('action-modal')).getByRole('button', {
			name: translations.fr.common.delete,
		});
		await fireEvent.press(button);
		await fireEvent.press(button);
		expect(remove).toHaveBeenCalledTimes(1);
		await act(async () => reject(new Error('Server failed')));
		expect(mockError).toHaveBeenCalledWith(translations.fr.users.deleteError);
		expect(screen.queryByTestId('action-modal')).toBeNull();
		remove.mockReturnValueOnce({ unwrap: () => Promise.resolve() });
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.delete }));
		await fireEvent.press(
			within(screen.getByTestId('action-modal')).getByRole('button', { name: translations.fr.common.delete }),
		);
		await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
		expect(remove).toHaveBeenCalledTimes(2);
	});

	it.each(['loading', 'error'])('keeps edit actions hidden while the original detail state is %s', async (state) => {
		const { store } = await setup();
		await mockUserQuery.setResult({
			currentData: undefined,
			isLoading: state === 'loading',
			error: state === 'error' ? { status_code: 404, message: 'Missing', details: {} } : undefined,
			refetch: jest.fn(),
		} as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersView />
			</Provider>,
		);
		expect(screen.queryByRole('button', { name: translations.fr.common.edit })).toBeNull();
		expect(screen.getByRole(state === 'loading' ? 'progressbar' : 'alert')).toBeOnTheScreen();
	});

	it('keeps edit navigation and relies on the header for Back', async () => {
		await setup();
		expect(screen.queryByRole('button', { name: translations.fr.users.backToList })).toBeNull();
		const actions = within(screen.getByTestId('details-page-actions'));
		expect(actions.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
			translations.fr.common.delete,
			translations.fr.common.edit,
		]);
		expect(within(screen.getByTestId('details-page')).queryByTestId('details-page-actions')).toBeNull();
		expect(within(screen.getByTestId('page-action-bar')).getByTestId('details-page-actions')).toBeOnTheScreen();
		await fireEvent.press(actions.getByRole('button', { name: translations.fr.common.edit }));
		expect(router.push).toHaveBeenCalledWith({ pathname: '/users/form', params: { id: '7' } });
	});
});
