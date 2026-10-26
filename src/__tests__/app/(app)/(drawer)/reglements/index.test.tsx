import type { ReactNode } from 'react';
import type { FlatListProps } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ReglementsListPage from '@/app/(app)/(drawer)/reglements/index';
import { useGetReglementsInfiniteListInfiniteQuery } from '@/store/services/reglement';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@shopify/flash-list', () => {
	const { FlatList } = jest.requireActual<typeof import('react-native')>('react-native');
	return { FlashList: (props: FlatListProps<unknown>) => <FlatList {...props} testID="payment-list" /> };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: (selector: unknown) =>
		selector === jest.requireActual('@/store/selectors').getUserCompaniesState
			? [{ id: 5, role: mockRole, can_change_document_status: mockCanChange }]
			: 0,
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { useState } = jest.requireActual<typeof import('react')>('react');
	const { Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Wrapper(props: {
		children: (company: { company_id: number; role: string; tabs: ReactNode }) => ReactNode;
	}) {
		const [id, setId] = useState(5);
		return props.children({
			company_id: id,
			role: mockRole,
			tabs: (
				<Pressable onPress={() => setId(11)}>
					<Text>Switch company</Text>
				</Pressable>
			),
		});
	};
});
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Sheet(props: { visible: boolean; title: string; children: ReactNode }) {
		return props.visible ? (
			<View>
				<Text>{props.title}</Text>
				{props.children}
			</View>
		) : null;
	};
});
jest.mock('@/store/services/reglement', () => ({
	useGetReglementsInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
	useLazyGetReglementsListQuery: () => [mockFetchAll],
	useDeleteReglementMutation: () => [mockDelete, {}],
	useBulkDeleteReglementsMutation: () => [mockBulk, {}],
	usePatchReglementStatutMutation: () => [mockCancel, {}],
}));
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { uses_foreign_currency: true } }),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({ currentData: [{ id: 3, raison_sociale: 'Atlas Client' }] }),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
}));

const row = (id: number) => ({
	id,
	company: 5,
	facture_client: 7,
	facture_client_numero: 'FAC7/26',
	client: 3,
	client_name: 'Atlas Client',
	mode_reglement_name: 'Virement',
	libelle: `REF${id}`,
	montant: 1500,
	devise: 'MAD',
	date_reglement: '2026-10-24',
	statut: id === 7 ? 'Valide' : 'Annulé',
});
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const initialQuery = {
	currentData: {
		pages: [
			{
				count: 3,
				next: 'page2',
				previous: null,
				results: [row(7), row(8)],
				stats_by_currency: {
					MAD: { chiffre_affaire_total: '2500000', total_reglements: '2300000', total_impayes: '200000' },
					EUR: { chiffre_affaire_total: '2000', total_reglements: '1500', total_impayes: '500' },
				},
			},
		],
		pageParams: [1],
	},
	isFetching: false,
	isLoading: false,
	hasNextPage: true,
	fetchNextPage,
	refetch,
};
const mockQuery = createQueryMock(initialQuery);
const mockFetchAll = jest.fn();
const mockDelete = jest.fn();
const mockBulk = jest.fn();
const mockCancel = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAbort = jest.fn();
const mockUnsubscribe = jest.fn();
let mockRole: string;
let mockToken: string | undefined;
let mockCanChange: boolean;
const t = translations.fr;
const args = () => jest.mocked(useGetReglementsInfiniteListInfiniteQuery).mock.calls.at(-1)![0];
const action = async (name: string) => {
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name }));
	await act(() => modal.props.onDismiss());
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
	mockCanChange = true;
	mockToken = 'access';
	await mockQuery.setResult(initialQuery);
	for (const mutation of [mockDelete, mockBulk, mockCancel])
		mutation.mockReturnValue({ unwrap: () => Promise.resolve() });
	mockFetchAll.mockReturnValue({
		unwrap: () => Promise.resolve({ results: [{ id: 7 }, { id: 8 }, { id: 9 }] }),
		abort: mockAbort,
		unsubscribe: mockUnsubscribe,
	});
	jest
		.requireActual<{ default: { measureInWindow: jest.Mock } }>('@react-native/jest-preset/jest/MockNativeMethods')
		.default.measureInWindow.mockImplementation((callback) => callback(200, 200, 44, 44));
});

it('shows payment cards, company currency statistics and scoped navigation', async () => {
	await render(<ReglementsListPage />);
	expect(args()).toMatchObject({ company_id: 5 });
	expect(screen.getByText('2 500 000,00 MAD')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
	expect(screen.getByText('2 000,00 EUR')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: `${t.reglements.detailsTitle}: REF7` }));
	expect(router.push).toHaveBeenCalledWith({ pathname: '/reglements/[id]', params: { id: '7', company_id: '5' } });
	await fireEvent.press(screen.getByRole('button', { name: t.reglements.newReglement }));
	expect(router.push).toHaveBeenLastCalledWith({ pathname: '/reglements/form', params: { company_id: '5' } });
});
it('sends search to the server and selects every matching payment, including unloaded pages', async () => {
	await render(<ReglementsListPage />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'REF');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(args()).toMatchObject({ search: 'REF' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(mockFetchAll).toHaveBeenCalledWith(
		expect.objectContaining({ company_id: 5, search: 'REF', with_pagination: false }),
		false,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.reglements.bulkDeleteBtn(3) }));
	expect(mockBulk).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: [7, 8, 9] }));
	expect(mockUnsubscribe).toHaveBeenCalled();
});
it('puts mode choices in the filter sheet and filters on the displayed mode name', async () => {
	await render(<ReglementsListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.reglements.colModeReglement }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Virement' }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(args()).toMatchObject({ mode_reglement_name__icontains: 'Virement' });
});
it('cancels only after confirmation and sends the cancelled status', async () => {
	await render(<ReglementsListPage />);
	await action(t.reglements.cancelBtn);
	expect(screen.getByText(t.reglements.cancelModalBody)).toBeOnTheScreen();
	expect(mockCancel).not.toHaveBeenCalled();
	const modal = within(screen.getByTestId('action-modal'));
	expect(modal.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
		t.common.cancel,
		t.common.confirm,
	]);
	await fireEvent.press(modal.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(mockCancel).toHaveBeenCalledWith({ id: 7, data: { statut: 'Annulé' } }));
	expect(mockSuccess).toHaveBeenCalledWith(t.reglements.cancelSuccess);
});
it('deletes a single payment and surfaces mutation errors without a success toast', async () => {
	mockDelete.mockReturnValue({ unwrap: () => Promise.reject({ status: 500 }) });
	await render(<ReglementsListPage />);
	await action(t.common.delete);
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(mockDelete).toHaveBeenCalledWith({ id: 7 });
	expect(mockSuccess).not.toHaveBeenCalled();
});
it.each(['Commercial', 'Comptable', 'Lecture'])('respects %s list permissions', async (role) => {
	mockRole = role;
	await render(<ReglementsListPage />);
	expect(screen.queryByRole('checkbox')).toBeNull();
	if (role === 'Lecture') expect(screen.queryByRole('button', { name: t.common.moreActions })).toBeNull();
	else {
		await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
		expect(screen.queryByRole('menuitem', { name: t.common.delete })).toBeNull();
		expect(screen.queryByRole('menuitem', { name: t.common.edit })).toBeNull();
		expect(screen.queryByRole('menuitem', { name: t.reglements.cancelBtn })).toBeNull();
	}
});
it('requires the status flag for edit/cancel and keeps only language choices for receipts', async () => {
	mockCanChange = false;
	await render(<ReglementsListPage />);
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.queryByRole('menuitem', { name: t.common.edit })).toBeNull();
	expect(screen.queryByRole('menuitem', { name: t.reglements.cancelBtn })).toBeNull();
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: t.reglements.printReceipt }));
	await act(() => modal.props.onDismiss());
	expect(screen.getByText(t.pdf.language)).toBeOnTheScreen();
	expect(screen.queryByText(t.pdf.format)).toBeNull();
});
it('loads the next page, supports pull to refresh and resets selection on company changes', async () => {
	await render(<ReglementsListPage />);
	await fireEvent(screen.getByTestId('payment-list'), 'endReached');
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await fireEvent(screen.getByTestId('payment-list'), 'refresh');
	expect(refetch).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByText('Switch company'));
	expect(args()).toMatchObject({ company_id: 11 });
	expect(screen.queryByRole('button', { name: t.reglements.bulkDeleteBtn(3) })).toBeNull();
});
it('does not request payments for an unknown role or missing session', async () => {
	mockRole = 'Logistique';
	mockToken = undefined;
	await render(<ReglementsListPage />);
	expect(useGetReglementsInfiniteListInfiniteQuery).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ skip: true }),
	);
	expect(screen.getByText(t.noPermission.title)).toBeOnTheScreen();
});
