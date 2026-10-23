import type { DevisQueryParams } from '@/types/devisTypes';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import DevisListPage from '@/app/(app)/(drawer)/devis/index';
import { useGetDevisInfiniteListInfiniteQuery } from '@/store/services/devi';
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
jest.mock('@/store/services/devi', () => ({
	useGetDevisInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
	useLazyGetDevisListQuery: () => [mockFetchAll],
	useDeleteDeviMutation: () => [mockRemove, {}],
	useBulkDeleteDevisMutation: () => [mockBulk, {}],
	useConvertDeviToFactureProFormaMutation: () => [mockConvert, {}],
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
	numero_devis: `DEV${id}/26`,
	client_name: 'Atlas Client',
	statut: 'Envoyé',
	date_devis: '2026-10-22',
	total_ttc_apres_remise: 1200,
	devise: 'MAD',
	lignes_count: 2,
});
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const initialQuery = {
	currentData: {
		pages: [{ count: 3, next: 'page2' as string | null, previous: null, results: [row(7), row(8)] }],
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
const mockConvert = jest.fn();
const mockFetchAll = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAbort = jest.fn();
const mockUnsubscribe = jest.fn();
let mockRole: string;
const t = translations.fr;
const lastArgs = () => jest.mocked(useGetDevisInfiniteListInfiniteQuery).mock.calls.at(-1)![0] as DevisQueryParams;
const cardAction = async (name: string) => {
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name }));
	await act(() => modal.props.onDismiss());
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockRole = 'Caissier';
	mockConvert.mockReturnValue({ unwrap: () => Promise.resolve({ id: 21 }) });
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
it('uses company-scoped cards and navigates with the selected company', async () => {
	await render(<DevisListPage />);
	expect(lastArgs()).toMatchObject({ company_id: 5 });
	expect(screen.getByText('DEV7/26')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.view} DEV7/26` }));
	expect(router.push).toHaveBeenCalledWith({ pathname: '/devis/[id]', params: { id: '7', company_id: '5' } });
});
it('sends submitted search to both the server list and select-all request', async () => {
	await render(<DevisListPage />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Atlas');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(lastArgs()).toMatchObject({ search: 'Atlas' });
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	expect(mockFetchAll).toHaveBeenCalledWith(
		expect.objectContaining({ company_id: 5, search: 'Atlas', with_pagination: false }),
		false,
	);
});
it('keeps payment choices inside the filter sheet and sends their IDs to Django', async () => {
	await render(<DevisListPage />);
	expect(screen.queryByText('Virement')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.devis.filterModePaiement }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Virement' }));
	await fireEvent.press(screen.getByText(t.dataGrid.searchApply));
	expect(lastArgs()).toMatchObject({ mode_paiement_ids: '2' });
});
it('bulk-deletes all matching records after confirmation, not only loaded cards', async () => {
	await render(<DevisListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByRole('button', { name: t.documentList.bulkDeleteBtn(3) }));
	expect(mockBulk).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(mockBulk).toHaveBeenCalledWith({ ids: [7, 8, 9] }));
});
it('allows Commercial pro-forma conversion but no deletion or invoice conversion', async () => {
	mockRole = 'Commercial';
	await render(<DevisListPage />);
	expect(screen.queryByRole('checkbox')).toBeNull();
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.queryByRole('menuitem', { name: t.common.delete })).toBeNull();
	expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
		t.common.print,
		t.devis.labelFactureProforma,
		t.devis.labelFactureClient,
		t.common.edit,
	]);
	for (const label of [t.devis.labelFactureClient]) {
		const action = screen.getByRole('menuitem', { name: label });
		expect(action).toBeDisabled();
		await fireEvent.press(action);
	}
	expect(screen.getByRole('menuitem', { name: t.devis.labelFactureProforma })).toBeEnabled();
	expect(router.push).not.toHaveBeenCalled();
});
it('Lecture can view without printing or editing', async () => {
	mockRole = 'Lecture';
	await render(<DevisListPage />);
	expect(screen.queryByRole('button', { name: t.common.moreActions })).toBeNull();
	expect(screen.queryByRole('checkbox')).toBeNull();
});
it('opens the common PDF choices from the card menu', async () => {
	await render(<DevisListPage />);
	await cardAction(t.common.print);
	expect(screen.getByRole('button', { name: t.pdf.generatePdf })).toBeOnTheScreen();
});

it('maps date ranges to Django date_after/before inside an OR group', async () => {
	await render(<DevisListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByRole('radio', { name: t.devis.colDateDevis }));
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
	expect(JSON.stringify(groups)).not.toContain('date_devis_after');
});
it('cancels select-all when switching company and ignores its late response', async () => {
	let resolve!: (rows: Array<{ id: number }>) => void;
	const result = new Promise<Array<{ id: number }>>((done) => {
		resolve = done;
	});
	mockFetchAll.mockReturnValue({ unwrap: () => result, abort: mockAbort, unsubscribe: mockUnsubscribe });
	await render(<DevisListPage />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(3) }));
	await fireEvent.press(screen.getByText('Switch company'));
	expect(mockAbort).toHaveBeenCalledTimes(1);
	await act(() => resolve([{ id: 7 }, { id: 8 }, { id: 9 }]));
	expect(lastArgs()).toMatchObject({ company_id: 11 });
	expect(screen.queryByRole('button', { name: t.documentList.bulkDeleteBtn(3) })).toBeNull();
});

it('converts only after confirmation and opens the new pro-forma in the same company', async () => {
	await render(<DevisListPage />);
	await cardAction(t.devis.labelFactureProforma);
	expect(mockConvert).not.toHaveBeenCalled();
	expect(screen.getByText(t.devis.convertToProformaBody)).toBeOnTheScreen();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.convert }));
	await waitFor(() => expect(mockConvert).toHaveBeenCalledWith({ id: 7 }));
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/facture-pro-forma/form',
		params: { id: '21', company_id: '5' },
	});
});
it('leaves draft conversion disabled, as on the web', async () => {
	await mockQuery.setResult({
		...initialQuery,
		currentData: {
			pages: [{ count: 1, next: null, previous: null, results: [{ ...row(7), statut: 'Brouillon' }] }],
			pageParams: [1],
		},
	});
	await render(<DevisListPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.moreActions }));
	expect(screen.getByRole('menuitem', { name: t.devis.labelFactureProforma })).toBeDisabled();
	expect(mockConvert).not.toHaveBeenCalled();
});
it('reports a failed conversion without navigating', async () => {
	mockConvert.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { detail: 'Conversion refused' } }),
	});
	await render(<DevisListPage />);
	await cardAction(t.devis.labelFactureProforma);
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.convert }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(router.push).not.toHaveBeenCalled();
});
