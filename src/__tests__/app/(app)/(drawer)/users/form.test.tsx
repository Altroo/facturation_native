import { createQueryMock } from '@/__tests__/setupQuery';
import { configureStore } from '@reduxjs/toolkit';
import _initReducer, { setAuthenticated } from '@/store/slices/_initSlice';
import accountReducer, { setProfil, setGroupes } from '@/store/slices/accountSlice';
import companiesReducer, { setUserCompanies } from '@/store/slices/companiesSlice';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { router } from 'expo-router';
import UsersFormPage from '@/app/(app)/(drawer)/users/form';
import {
	useGetUserQuery,
	useAddUserMutation,
	useEditUserMutation,
	useCheckEmailMutation,
} from '@/store/services/account';
import { useGetCompaniesListQuery } from '@/store/services/company';
import { translations } from '@/translations';
import { colors } from '@/utils/themes';
import { AutocompleteDropdownContextProvider, toggleAutocomplete } from '@/__tests__/setupAutocomplete';
import type { UserWithCompaniesResponseType } from '@/types/usersTypes';

jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'test-access' }));
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let mockParams: { id?: string | string[] } = {};
jest.mock('expo-router', () => ({ useLocalSearchParams: () => mockParams, router: { dismissTo: jest.fn() } }));
jest.mock('@/store/services/account', () => ({
	useGetUserQuery: jest.fn(function useGetUserQuery() {
		return mockUserQuery.useResult();
	}),
	useAddUserMutation: jest.fn(),
	useEditUserMutation: jest.fn(),
	useCheckEmailMutation: jest.fn(),
}));
jest.mock('@/store/services/company', () => ({
	useGetCompaniesListQuery: jest.fn(function useGetCompaniesListQuery() {
		return mockCompaniesQuery.useResult();
	}),
}));
jest.mock('@/components/nativeElements/customSquareImageUploading/customSquareImageUploading', () => () => null);
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
const mockCompaniesQuery = createQueryMock<ReturnType<typeof useGetCompaniesListQuery>>({} as never);
const user: UserWithCompaniesResponseType = {
	id: 7,
	first_name: 'Example',
	last_name: 'User',
	email: 'example@example.invalid',
	gender: 'Homme',
	avatar: 'https://example.invalid/original.jpg',
	avatar_cropped: 'https://example.invalid/crop.jpg',
	is_staff: false,
	is_active: true,
	default_password_set: false,
	date_joined: null,
	date_updated: null,
	last_login: null,
	companies: [
		{
			membership_id: 3,
			company_id: 4,
			raison_sociale: 'Company Four',
			role: 'Commercial',
			can_validate_factures: false,
			can_change_document_status: true,
		},
	],
};
const addUser = jest.fn();
const editUser = jest.fn();
const checkEmail = jest.fn();
const setup = async (edit = false, companies: { id: number; raison_sociale: string }[] = []) => {
	mockParams = edit ? { id: String(user.id) } : {};
	const store = configureStore({
		reducer: { _init: _initReducer, account: accountReducer, companies: companiesReducer },
	});
	store.dispatch(setGroupes({ group_titles: ['Caissier', 'Commercial', 'Lecture'] }));
	store.dispatch(setProfil({ ...user, id: 1, is_staff: true }));
	store.dispatch(
		setUserCompanies([{ id: 4, raison_sociale: 'Company Four', role: 'Caissier', uses_foreign_currency: false }]),
	);
	store.dispatch(setAuthenticated());
	await mockUserQuery.setResult({ currentData: edit ? user : undefined, refetch: jest.fn() } as never);
	await mockCompaniesQuery.setResult({ data: companies, refetch: jest.fn() } as never);
	jest.mocked(useAddUserMutation).mockReturnValue([addUser, {}] as never);
	jest.mocked(useEditUserMutation).mockReturnValue([editUser, {}] as never);
	jest.mocked(useCheckEmailMutation).mockReturnValue([checkEmail, {}] as never);
	await render(
		<Provider store={store}>
			<UsersFormPage />
		</Provider>,
		{ wrapper: AutocompleteDropdownContextProvider },
	);
	return store;
};
beforeEach(() => {
	mockParams = {};
	jest.clearAllMocks();
	checkEmail.mockReturnValue({ unwrap: () => Promise.resolve() });
	addUser.mockReturnValue({ unwrap: () => Promise.resolve() });
	editUser.mockReturnValue({ unwrap: () => Promise.resolve({ first_name: 'Updated' }) });
});

describe('UsersFormPage', () => {
	it('uses green for the active account control and keeps the submit action in the fixed bar', async () => {
		await setup();
		expect(screen.getByRole('switch', { name: translations.fr.users.isActiveLabel })).toHaveProp(
			'onTintColor',
			colors.success,
		);
		expect(screen.getByRole('switch', { name: translations.fr.users.isAdminLabel })).toHaveProp(
			'onTintColor',
			colors.brand,
		);
		expect(
			within(screen.getByTestId('page-action-bar')).getByRole('button', { name: translations.fr.common.save }),
		).toBeOnTheScreen();
	});

	it.each(['', ['7'], '../7', '0'])('blocks malformed edit id %s without requesting a user', async (id) => {
		const store = await setup(true);
		mockParams = { id };
		jest.mocked(useGetUserQuery).mockClear();
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		expect(useGetUserQuery).not.toHaveBeenCalled();
		expect(screen.queryByLabelText(translations.fr.users.fieldNom)).toBeNull();
		expect(screen.getByRole('alert')).toHaveTextContent(translations.fr.notFound.message);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.back }));
		expect(router.dismissTo).toHaveBeenCalledWith('/users');
		expect(editUser).not.toHaveBeenCalled();
	});

	it('keeps self editing in profile settings instead of the users form', async () => {
		const store = await setup(true);
		mockParams = { id: '1' };
		jest.mocked(useGetUserQuery).mockClear();
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		expect(useGetUserQuery).not.toHaveBeenCalled();
		expect(screen.queryByLabelText(translations.fr.users.fieldNom)).toBeNull();
		expect(editUser).not.toHaveBeenCalled();
	});

	it('accepts an empty successful create response, shows user-added feedback, and returns to the list', async () => {
		await setup();
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'New');
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldPrenom), 'User');
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldEmail), 'new@example.invalid');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.users.fieldSexe }));
		await fireEvent.press(screen.getByRole('radio', { name: 'Homme' }));
		await fireEvent.press(
			within(screen.getByTestId('page-action-bar')).getByRole('button', { name: translations.fr.common.save }),
		);
		await waitFor(() => expect(addUser).toHaveBeenCalled());
		expect(checkEmail).toHaveBeenCalledWith({ email: 'new@example.invalid' });
		expect(addUser.mock.calls[0][0].data).toMatchObject({
			first_name: 'New',
			last_name: 'User',
			gender: 'Homme',
			is_staff: true,
			is_active: true,
			companies: [],
		});
		expect(addUser.mock.calls[0][0].data).not.toHaveProperty('globalError');
		expect(mockSuccess).toHaveBeenCalledWith(translations.fr.users.addSuccess);
		expect(router.dismissTo).toHaveBeenCalledWith('/users');
	});

	it('uses the original validation toast and keeps invalid values on the form without calling the API', async () => {
		await setup(true);
		await act(async () => await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), ''));
		await waitFor(() => expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', ''));
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(translations.fr.common.correctErrors));
		expect(editUser).not.toHaveBeenCalled();
		expect(addUser).not.toHaveBeenCalled();
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('preserves existing images, memberships and flags on edit, keeps email disabled, and stays on the form after success', async () => {
		await setup(true);
		expect(screen.getByLabelText(translations.fr.users.fieldEmail)).toHaveProp('editable', false);
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'Updated');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalled());
		expect(editUser.mock.calls[0][0]).toMatchObject({
			id: 7,
			data: {
				avatar: user.avatar,
				avatar_cropped: user.avatar_cropped,
				companies: user.companies,
				is_staff: false,
				is_active: true,
			},
		});
		expect(editUser.mock.calls[0][0].data).not.toHaveProperty('globalError');
		expect(user.companies[0].role).toBe('Commercial');
		expect(mockSuccess).toHaveBeenCalledWith(translations.fr.users.updateSuccess);
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('shows backend field errors without navigating away or losing edited text', async () => {
		editUser.mockReturnValue({
			unwrap: () => Promise.reject({ status: 400, data: { details: { first_name: ['Server validation'] } } }),
		});
		await setup(true);
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'Updated');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await screen.findByText('Server validation');
		expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Updated');
		expect(mockError).toHaveBeenCalledWith(translations.fr.users.updateError);
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it('keeps the user form visible and disabled while its save button is busy', async () => {
		let finish!: () => void;
		editUser.mockReturnValue({
			unwrap: () =>
				new Promise<void>((resolve) => {
					finish = resolve;
				}),
		});
		await setup(true);
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'Updated');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalledTimes(1));
		expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Updated');
		expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('editable', false);
		expect(screen.getByRole('button', { name: translations.fr.common.save })).toHaveProp('accessibilityState', {
			busy: true,
			disabled: true,
		});
		await act(async () => finish());
		await waitFor(() => expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('editable', true));
		expect(mockSuccess).toHaveBeenCalledWith(translations.fr.users.updateSuccess);
	});

	it('replaces untouched cached values and memberships when the same user is refreshed', async () => {
		const store = await setup(true);
		const fresh = {
			...user,
			first_name: 'Fresh name',
			companies: [{ ...user.companies[0], membership_id: 12, role: 'Lecture', can_validate_factures: true }],
		};
		await mockUserQuery.setResult({ currentData: fresh, refetch: jest.fn() } as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		await waitFor(() =>
			expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Fresh name'),
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalled());
		expect(editUser.mock.calls[0][0].data).toMatchObject({ first_name: 'Fresh name', companies: fresh.companies });
	});

	it('reinitializes values and memberships after a same-user refresh, matching the original form', async () => {
		const store = await setup(true);
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'Unsaved name');
		await waitFor(() =>
			expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Unsaved name'),
		);
		await mockUserQuery.setResult({
			currentData: { ...user, first_name: 'Server name', companies: [] },
			refetch: jest.fn(),
		} as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		await waitFor(() =>
			expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Server name'),
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalled());
		expect(editUser.mock.calls[0][0].data).toMatchObject({ first_name: 'Server name', companies: [] });
	});

	it('shows labeled membership and account-flag errors after a rejected save', async () => {
		editUser.mockReturnValue({
			unwrap: () =>
				Promise.reject({
					status: 400,
					data: { details: { companies: ['Membership is invalid'], is_staff: ['Admin permission is locked'] } },
				}),
		});
		await setup(true);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		const summary =
			translations.fr.users.companiesSection +
			' : Membership is invalid\n' +
			translations.fr.users.isAdminLabel +
			' : Admin permission is locked';
		expect((await screen.findAllByText(summary)).length).toBeGreaterThan(0);
		expect(mockSuccess).not.toHaveBeenCalled();
		expect(router.dismissTo).not.toHaveBeenCalled();
	});

	it.each([0, 503])('uses original form/error rendering after a background refresh fails with %s', async (status) => {
		const store = await setup(true);
		await fireEvent.changeText(screen.getByLabelText(translations.fr.users.fieldNom), 'Unsaved name');
		await waitFor(() =>
			expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Unsaved name'),
		);
		await mockUserQuery.setResult({
			currentData: user,
			error: { status_code: status, message: 'Refresh unavailable', details: {} },
			refetch: jest.fn(),
		} as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		if (status === 503) {
			expect(screen.getByRole('alert')).toBeOnTheScreen();
			expect(screen.queryByRole('button', { name: translations.fr.common.save })).toBeNull();
			return;
		}
		expect(screen.getByLabelText(translations.fr.users.fieldNom)).toHaveProp('value', 'Unsaved name');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalled());
		expect(editUser.mock.calls[0][0].data).toMatchObject({ first_name: 'Unsaved name', companies: user.companies });
	});

	it.each([401, 403, 404])('blocks cached user editing after an authoritative %s response', async (status) => {
		const store = await setup(true);
		await mockUserQuery.setResult({
			currentData: user,
			error: { status_code: status, message: 'Unavailable', details: {} },
			refetch: jest.fn(),
		} as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		expect(screen.queryByLabelText(translations.fr.users.fieldNom)).toBeNull();
		expect(screen.getByRole('alert')).toBeOnTheScreen();
		expect(editUser).not.toHaveBeenCalled();
	});

	it('adds companies by ID, excludes duplicates and clears both add selectors after an addition', async () => {
		await setup(true, [
			{ id: 4, raison_sociale: 'Company Four' },
			{ id: 5, raison_sociale: 'Same Name' },
			{ id: 6, raison_sociale: 'Same Name' },
		]);
		await toggleAutocomplete(translations.fr.shared.selectCompany);
		expect(screen.queryByRole('radio', { name: 'Company Four' })).toBeNull();
		await fireEvent.press(screen.getAllByRole('radio', { name: 'Same Name' })[1]);
		await fireEvent.press(screen.getAllByRole('button', { name: translations.fr.managedByTable.role }).at(-1)!);
		await fireEvent.press(screen.getByRole('radio', { name: 'Lecture' }));
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.add }));
		await waitFor(() => expect(screen.getByRole('button', { name: translations.fr.common.add })).toBeDisabled());
		await toggleAutocomplete(translations.fr.shared.selectCompany);
		expect(screen.getAllByRole('radio', { name: 'Same Name' })).toHaveLength(1);
		await toggleAutocomplete(translations.fr.shared.selectCompany);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.save }));
		await waitFor(() => expect(editUser).toHaveBeenCalled());
		expect(editUser.mock.calls[0][0].data.companies).toEqual([
			user.companies[0],
			{
				membership_id: 0,
				company_id: 6,
				raison_sociale: 'Same Name',
				role: 'Lecture',
				can_validate_factures: false,
				can_change_document_status: false,
			},
		]);
	});

	it('renders personal fields and compact sections without repeating the navbar title', async () => {
		await setup();
		expect(screen.queryByRole('header', { name: translations.fr.users.addTitle })).toBeNull();
		for (const label of [
			translations.fr.users.fieldEmail,
			translations.fr.users.fieldNom,
			translations.fr.users.fieldPrenom,
			translations.fr.users.fieldSexe,
		])
			expect(screen.getByLabelText(label)).toBeOnTheScreen();
		for (const section of [
			translations.fr.users.photoSection,
			translations.fr.users.personalSection,
			translations.fr.users.companiesSection,
		])
			expect(screen.getAllByText(section).length).toBeGreaterThan(0);
		expect(
			within(screen.getByTestId('page-action-bar')).getByRole('button', { name: translations.fr.common.save }),
		).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: translations.fr.users.backToList })).toBeNull();
	});

	it('shows the original relationship loading state until company choices are available', async () => {
		const store = await setup();
		await mockCompaniesQuery.setResult({ isLoading: true, refetch: jest.fn() } as never);
		await screen.rerender(
			<Provider store={store}>
				<UsersFormPage />
			</Provider>,
		);
		expect(screen.getByRole('progressbar')).toBeOnTheScreen();
		expect(screen.queryByLabelText(translations.fr.users.fieldNom)).toBeNull();
	});
});
