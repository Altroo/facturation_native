import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import BonDeLivraisonListPage from '@/app/(app)/(drawer)/bon-de-livraison/uninvoiced';
import { useGetBonDeLivraisonUninvoicedInfiniteListInfiniteQuery } from '@/store/services/bonDeLivraison';
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
jest.mock('@/store/services/bonDeLivraison', () => ({
	useGetBonDeLivraisonUninvoicedInfiniteListInfiniteQuery: jest.fn(() => mockQuery.useResult()),
	useLazyGetBonDeLivraisonUninvoicedListQuery: () => [mockFetchAll],
	useDeleteBonDeLivraisonMutation: () => [mockRemove, {}],
	useBulkDeleteBonDeLivraisonMutation: () => [mockBulk, {}],
}));
jest.mock('@/store/services/client', () => ({
	useGetClientsListQuery: () => ({ currentData: [{ id: 3, raison_sociale: 'Atlas Client' }] }),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetModePaiementListQuery: () => ({ currentData: [{ id: 2, nom: 'Virement' }] }),
	useGetLivreParListQuery: () => ({ currentData: [{ id: 6, nom: 'Atlas livraison' }] }),
}));
const row = (id: number) => ({
	id,
	company: 5,
	numero_bon_livraison: `DEV${id}/26`,
	client_name: 'Atlas Client',
	statut: 'Envoyé',
	date_bon_livraison: '2026-10-22',
	total_ttc_apres_remise: 1200,
	devise: 'MAD',
	lignes_count: 2,
});
const refetch = jest.fn();
const fetchNextPage = jest.fn();
const initialQuery = {
	currentData: { pages: [{ count: 3, next: 'page2', previous: null, results: [row(7), row(8)] }], pageParams: [1] },
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
it('loads uninvoiced notes through the dedicated endpoint without bulk deletion or printing', async () => {
	await render(<BonDeLivraisonListPage />);
	expect(useGetBonDeLivraisonUninvoicedInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ company_id: 5 }),
		expect.objectContaining({ skip: false }),
	);
	expect(screen.queryByRole('checkbox')).toBeNull();
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.moreActions })[0]);
	expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
		t.common.edit,
		t.common.delete,
	]);
});
it('sends search to the server and supports pull-to-refresh and infinite loading', async () => {
	await render(<BonDeLivraisonListPage />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'Atlas');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(useGetBonDeLivraisonUninvoicedInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
		expect.objectContaining({ company_id: 5, search: 'Atlas' }),
		expect.anything(),
	);
	await fireEvent(screen.getByTestId('bon-de-livraison-grid'), 'endReached');
	expect(fetchNextPage).toHaveBeenCalledTimes(1);
	await fireEvent(screen.getByTestId('bon-de-livraison-grid'), 'refresh');
	expect(refetch).toHaveBeenCalledTimes(1);
});
