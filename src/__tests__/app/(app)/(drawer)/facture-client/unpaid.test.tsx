import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FactureClientListPage from '@/app/(app)/(drawer)/facture-client/unpaid';
import {
	useGetFactureClientInfiniteListInfiniteQuery,
	useGetFactureClientUnpaidInfiniteListInfiniteQuery,
} from '@/store/services/factureClient';
import { translations } from '@/translations';
import { createQueryMock } from '@/__tests__/setupQuery';
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
	useConvertFactureClientToBonDeLivraisonMutation: () => [mockConvert, {}],
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
const mockConvert = jest.fn();
const mockFetchAll = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockAbort = jest.fn();
const mockUnsubscribe = jest.fn();
let mockRole: string;
const t = translations.fr;
beforeEach(async () => {
	jest.clearAllMocks();
	mockConvert.mockReturnValue({ unwrap: () => Promise.resolve({ id: 31 }) });
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

describe('FactureClientUnpaidListPage', () => {
	it('uses only the unpaid endpoint without subscribing to the full invoice list', async () => {
		await render(<FactureClientListPage />);
		expect(useGetFactureClientUnpaidInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ company_id: 5 }),
			expect.objectContaining({ skip: false }),
		);
		expect(useGetFactureClientInfiniteListInfiniteQuery).not.toHaveBeenCalled();
		expect(screen.getByText('INV7/26')).toBeOnTheScreen();
		expect(screen.getByText('7 000,00 MAD')).toBeOnTheScreen();
		expect(screen.queryByRole('checkbox')).toBeNull();
	});

	it('keeps unpaid-list actions aligned with the web without exposing bulk deletion or printing', async () => {
		await render(<FactureClientListPage />);
		await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
		expect(screen.queryByRole('menuitem', { name: t.common.print })).toBeNull();
		expect(screen.getByRole('menuitem', { name: t.facturesClient.labelBonLivraison })).toBeEnabled();
		expect(screen.getByRole('menuitem', { name: t.common.edit })).toBeOnTheScreen();
	});

	it('owns unpaid search, scrolling, refresh and the reset when changing company', async () => {
		await render(<FactureClientListPage />);
		await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
		await fireEvent.press(screen.getByLabelText(t.common.search));
		await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Atlas');
		await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
		expect(useGetFactureClientUnpaidInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ company_id: 5, search: 'Atlas' }),
			expect.objectContaining({ skip: false }),
		);
		await fireEvent(screen.getByTestId('facture-client-grid'), 'endReached');
		expect(fetchNextPage).toHaveBeenCalledTimes(1);
		await fireEvent(screen.getByTestId('facture-client-grid'), 'refresh');
		expect(refetch).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByText('Switch company'));
		expect(useGetFactureClientUnpaidInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ company_id: 11, search: '' }),
			expect.objectContaining({ skip: false }),
		);
		expect(screen.getByRole('radio', { name: 'MAD', checked: true })).toBeOnTheScreen();
		expect(useGetFactureClientInfiniteListInfiniteQuery).not.toHaveBeenCalled();
	});
});
