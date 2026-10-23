import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import CompanyDocumentsListContent from './companyDocumentsListContent';
import { translations } from '@/translations';
import type { DocumentData } from '@/types/companyDocumentsTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@shopify/flash-list', () => ({ FlashList: jest.requireActual('react-native').FlatList }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => 0,
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: jest.fn(), onError: mockError }),
}));
jest.mock('@/store/services/client', () => ({ useGetClientsListQuery: () => ({ currentData: [] }) }));
jest.mock('@/store/services/parameter', () => ({ useGetModePaiementListQuery: () => ({ currentData: [] }) }));
type Props = ComponentProps<typeof CompanyDocumentsListContent>;
const t = translations.fr;
const mockError = jest.fn();
const row = {
	id: 7,
	company: 5,
	numero_devis: 'DEV7/26',
	numero_facture: 'PRO7/26',
	client_name: 'Atlas Client',
	statut: 'Envoyé',
	total_ttc_apres_remise: 120,
	devise: 'MAD',
	lignes_count: 2,
} as DocumentData;
const props = (): Props => ({
	company_id: 5,
	role: 'Caissier',
	tabs: <Text>Atlas companies</Text>,
	documentType: 'devis',
	queryArgs: { company_id: 5, search: 'Atlas' },
	searchTerm: 'Atlas',
	setSearchTerm: jest.fn(),
	sortModel: [],
	setSortModel: jest.fn(),
	filterModel: { items: [] },
	setFilterModel: jest.fn(),
	query: {
		currentData: { pages: [{ count: 2, next: 'page2', previous: null, results: [row] }] },
		isLoading: false,
		isFetching: false,
		isFetchingNextPage: false,
		isFetchNextPageError: false,
		hasNextPage: true,
		refetch: jest.fn(),
		fetchNextPage: jest.fn(),
	},
	fetchAllIds: jest.fn(() => ({
		unwrap: async () => [{ id: 7 }, { id: 8 }],
		abort: jest.fn(),
		unsubscribe: jest.fn(),
	})),
	deleteRecord: jest.fn(() => ({ unwrap: async () => undefined })),
	bulkDeleteRecords: jest.fn(() => ({ unwrap: async () => undefined })),
	busy: false,
	openPdf: jest.fn(async () => true),
});
beforeEach(() => jest.clearAllMocks());

it.each(['devis', 'facture-pro-forma'] as const)(
	'shares cards while preserving the %s destination',
	async (documentType) => {
		await render(<CompanyDocumentsListContent {...props()} documentType={documentType} />);
		const number = documentType === 'devis' ? 'DEV7/26' : 'PRO7/26';
		expect(screen.getByText(number)).toBeOnTheScreen();
		expect(screen.getByText('Atlas companies')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: `${t.common.view} ${number}` }));
		expect(router.push).toHaveBeenCalledWith({
			pathname: `/${documentType}/[id]`,
			params: { id: '7', company_id: '5' },
		});
	},
);
it('uses the current server filters to select every matching document, not just loaded cards', async () => {
	const data = props();
	await render(<CompanyDocumentsListContent {...data} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(2) }));
	await waitFor(() =>
		expect(data.fetchAllIds).toHaveBeenCalledWith({ company_id: 5, search: 'Atlas', with_pagination: false }, false),
	);
	expect(screen.getByRole('checkbox', { name: t.shared.clearSelection, checked: true })).toBeOnTheScreen();
});
it('forwards a submitted search so the parent can request filtered server data', async () => {
	const data = props();
	await render(<CompanyDocumentsListContent {...data} />);
	await fireEvent.press(screen.getByLabelText(t.common.search));
	await fireEvent.changeText(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'New customer');
	await fireEvent(screen.getByPlaceholderText(t.dataGrid.searchPlaceholder), 'submitEditing');
	expect(data.setSearchTerm).toHaveBeenCalledWith('New customer');
});
it('loads the next page only when the list is ready', async () => {
	const data = props();
	const view = await render(<CompanyDocumentsListContent {...data} />);
	const list = screen.getByTestId('devis-grid');
	await fireEvent(list, 'endReached');
	expect(data.query.fetchNextPage).toHaveBeenCalledTimes(1);
	await view.rerender(<CompanyDocumentsListContent {...data} query={{ ...data.query, isFetching: true }} />);
	await fireEvent(screen.getByTestId('devis-grid'), 'endReached');
	expect(data.query.fetchNextPage).toHaveBeenCalledTimes(1);
});
it('hides write and selection controls for a read-only role', async () => {
	await render(<CompanyDocumentsListContent {...props()} role="Lecture" />);
	expect(screen.queryByRole('checkbox')).toBeNull();
	expect(screen.queryByRole('button', { name: t.devis.newDevis })).toBeNull();
	expect(screen.getByText('DEV7/26')).toBeOnTheScreen();
});
it('rejects malformed server IDs without selecting rows', async () => {
	const data = props();
	data.fetchAllIds = jest.fn(() => ({ unwrap: async () => [{ id: -1 }], abort: jest.fn(), unsubscribe: jest.fn() }));
	await render(<CompanyDocumentsListContent {...data} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(2) }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.common.genericError));
	expect(data.bulkDeleteRecords).not.toHaveBeenCalled();
});
