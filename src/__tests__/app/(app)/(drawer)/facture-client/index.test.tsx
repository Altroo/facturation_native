import type { DevisQueryParams } from '@/types/devisTypes';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import FactureClientListPage from '@/app/(app)/(drawer)/facture-client/index';
import {
	useGetFactureClientInfiniteListInfiniteQuery,
	useGetFactureClientUnpaidInfiniteListInfiniteQuery,
} from '@/store/services/factureClient';
import { translations } from '@/translations';
import { createQueryMock } from '@/store/setupQuery';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => 0,
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { useState } = jest.requireActual<typeof import('react')>('react');
	const { Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Wrapper(props: {
		children: (company: { company_id: number; role: string; raison_sociale: string; tabs: ReactNode }) => ReactNode;
	}) {
		const [id, setId] = useState(5);
		return props.children({
			company_id: id,
			role: mockRole,
			raison_sociale: 'Atlas',
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
jest.mock('@/store/services/factureClient', () => ({
	useGetFactureClientInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
	useGetFactureClientUnpaidInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
	useLazyGetFactureClientListQuery: () => [mockFetchAll],
	useDeleteFactureClientMutation: () => [mockRemove, {}],
	useBulkDeleteFactureClientMutation: () => [mockBulk, {}],
}));
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { id: 5, uses_foreign_currency: true } }),
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
	numero_facture: `INV${id}/26`,
	nombre_paiements: 2,
	total_paye: 600,
	reste_a_payer: 600,
	statut_paiement: 'Partiellement payée',
	client_name: 'Atlas Client',
	statut: 'Accepté',
	date_facture: '2026-10-22',
	total_ttc_apres_remise: 1200,
	devise: 'MAD',
	lignes_count: 2,
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
					MAD: { chiffre_affaire_total: '12000', total_reglements: '5000', total_impayes: '7000' },
					EUR: { chiffre_affaire_total: '100', total_reglements: '25', total_impayes: '75' },
					USD: { chiffre_affaire_total: '0', total_reglements: '0', total_impayes: '0' },
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
const mockRemove = jest.fn();
const mockBulk = jest.fn();
const mockFetchAll = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAbort = jest.fn();
const mockUnsubscribe = jest.fn();
let mockRole: string;
const t = translations.fr;
const lastArgs = () =>
	jest.mocked(useGetFactureClientInfiniteListInfiniteQuery).mock.calls.at(-1)![0] as DevisQueryParams;
const cardAction = async (name: string) => {
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name }));
	await act(() => modal.props.onDismiss());
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
	await mockQuery.setResult(initialQuery);
	mockRemove.mockReturnValue({ unwrap: () => Promise.resolve() });
	mockBulk.mockReturnValue({ unwrap: () => Promise.resolve() });
	mockFetchAll.mockReturnValue({
		unwrap: () => Promise.resolve([{ id: 7 }, { id: 8 }, { id: 9 }]),
		abort: mockAbort,
		unsubscribe: mockUnsubscribe,
	});
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(200, 200, 44, 44));
});
it('shows server financial totals and routes cards to invoice details', async () => {
	await render(<FactureClientListPage />);
	expect(useGetFactureClientInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ company_id: 5 }),
		expect.objectContaining({ skip: false }),
	);
	expect(useGetFactureClientUnpaidInfiniteListInfiniteQuery).not.toHaveBeenCalled();
	expect(screen.getByText('12 000,00 MAD')).toBeOnTheScreen();
	expect(screen.getByText('5 000,00 MAD')).toBeOnTheScreen();
	expect(screen.getByText('7 000,00 MAD')).toBeOnTheScreen();
	expect(within(screen.getByTestId('facture-client-card-7')).getByText('Partiellement payée')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.view} INV7/26` }));
	expect(router.push).toHaveBeenCalledWith({ pathname: '/facture-client/[id]', params: { id: '7', company_id: '5' } });
});
it('switches displayed statistics by currency without converting or filtering invoice values locally', async () => {
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
	expect(screen.getByText('100,00 EUR')).toBeOnTheScreen();
	expect(screen.getByText('25,00 EUR')).toBeOnTheScreen();
	expect(lastArgs()).not.toHaveProperty('devise');
});
it('resets currency, search and pending selection when switching company', async () => {
	let resolve!: (rows: Array<{ id: number }>) => void;
	const result = new Promise<Array<{ id: number }>>((done) => {
		resolve = done;
	});
	mockFetchAll.mockReturnValue({ unwrap: () => result, abort: mockAbort, unsubscribe: mockUnsubscribe });
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Atlas');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByText('Switch company'));
	expect(mockAbort).toHaveBeenCalledTimes(1);
	await act(() => resolve([{ id: 7 }, { id: 8 }, { id: 9 }]));
	expect(lastArgs()).toMatchObject({ company_id: 11, search: '' });
	expect(screen.getByRole('radio', { name: 'MAD', checked: true })).toBeOnTheScreen();
	expect(screen.getByText('12 000,00 MAD')).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: t.documentList.bulkDeleteBtn(3) })).toBeNull();
});
it('sends search to the server and selects every matching ID from its results envelope', async () => {
	mockFetchAll.mockReturnValue({
		unwrap: async () => ({ results: [{ id: 7 }, { id: 8 }, { id: 9 }], stats_by_currency: {} }),
		abort: mockAbort,
		unsubscribe: mockUnsubscribe,
	});
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Atlas');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(lastArgs()).toMatchObject({ company_id: 5, search: 'Atlas' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await waitFor(() =>
		expect(screen.getByRole('checkbox', { name: t.shared.clearSelection, checked: true })).toBeOnTheScreen(),
	);
	expect(mockFetchAll).toHaveBeenCalledWith(
		expect.objectContaining({ company_id: 5, search: 'Atlas', with_pagination: false }),
		false,
	);
});
it('requires confirmation before deleting selected invoices', async () => {
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(await screen.findByRole('button', { name: t.documentList.bulkDeleteBtn(3) }));
	expect(mockBulk).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: [7, 8, 9] }));
});
it('leaves delivery-note conversion disabled until that mobile module exists', async () => {
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.getByRole('menuitem', { name: t.facturesClient.labelBonLivraison })).toBeDisabled();
});
it('opens the shared PDF format and language choices', async () => {
	await render(<FactureClientListPage />);
	await cardAction(t.common.print);
	expect(screen.getByRole('button', { name: t.pdf.generatePdf })).toBeOnTheScreen();
});
it('prevents printing invoices that are neither drafts nor accepted', async () => {
	await mockQuery.setResult({
		...initialQuery,
		currentData: {
			...initialQuery.currentData,
			pages: [{ ...initialQuery.currentData.pages[0], results: [{ ...row(7), statut: 'Envoyé' }] }],
		},
	});
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.getByRole('menuitem', { name: t.facturesClient.printRequiresValidation })).toBeDisabled();
});
it('loads more on scroll and refreshes by pulling the list', async () => {
	await render(<FactureClientListPage />);
	await fireEvent(screen.getByTestId('facture-client-grid'), 'endReached');
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await fireEvent(screen.getByTestId('facture-client-grid'), 'refresh');
	expect(refetch).toHaveBeenCalledTimes(1);
});
it('maps date ranges to Django date_after/before inside an OR group', async () => {
	await render(<FactureClientListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.facturesClient.colDateFacture }));
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	const date = new Date(2026, 0, 2, 12);
	await fireEvent(screen.getByTestId('date-picker-' + t.dateRange.from), 'valueChange', {}, date);
	await fireEvent.press(screen.getByLabelText(t.dataGrid.done));
	await fireEvent.press(screen.getByLabelText(t.common.addFilter));
	await fireEvent.press(screen.getAllByRole('button', { name: t.dataGrid.fieldLabel })[1]);
	await fireEvent.press(screen.getByRole('radio', { name: t.documentList.colStatut }));
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.value })[0]);
	await fireEvent.press(screen.getByRole('radio', { name: 'Envoyé' }));
	await fireEvent.press(screen.getByRole('button', { name: t.filterPanel.logicOperator }));
	await fireEvent.press(screen.getByRole('radio', { name: t.filterPanel.or }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(lastArgs()).toMatchObject({ filter_logic: 'or' });
	const groups = JSON.parse(String(lastArgs().filter_groups));
	expect(groups).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ date_after: '2026-01-02' }),
			expect.objectContaining({ statut: 'Envoyé' }),
		]),
	);
	expect(JSON.stringify(groups)).not.toContain('date_facture_after');
});
