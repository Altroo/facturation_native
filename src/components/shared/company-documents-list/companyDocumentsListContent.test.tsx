import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
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
	numero_avoir: 'AVO7/26',
	numero_bon_livraison: 'BL7/26',
	date_bon_livraison: '2026-10-24',
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
beforeEach(() => {
	jest.clearAllMocks();
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 180, 44, 44));
});

it.each(['devis', 'facture-pro-forma', 'facture-client', 'facture-avoir', 'bon-de-livraison'] as const)(
	'shares cards while preserving the %s destination',
	async (documentType) => {
		await render(<CompanyDocumentsListContent {...props()} documentType={documentType} />);
		const number =
			documentType === 'devis'
				? 'DEV7/26'
				: documentType === 'facture-avoir'
					? 'AVO7/26'
					: documentType === 'bon-de-livraison'
						? 'BL7/26'
						: 'PRO7/26';
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

it('shows the customer order reference and opens the tenant-scoped client without opening the document', async () => {
	const data = props();
	data.query.currentData!.pages[0]!.results = [{ ...row, client: 3, numero_demande_prix_client: 'REQ-ATLAS' }];
	await render(<CompanyDocumentsListContent {...data} />);
	expect(screen.getByText('REQ-ATLAS')).toBeOnTheScreen();
	const stopPropagation = jest.fn();
	await fireEvent.press(screen.getByRole('link', { name: 'Atlas Client' }), { stopPropagation });
	expect(stopPropagation).toHaveBeenCalledTimes(1);
	expect(router.push).toHaveBeenCalledTimes(1);
	expect(router.push).toHaveBeenCalledWith({ pathname: '/clients/[id]', params: { id: '3', company_id: '5' } });
});

it('disables conversion of a pro-forma that already has a client invoice', async () => {
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 180, 44, 44));
	const data = props();
	data.query.currentData!.pages[0]!.results = [{ ...row, converted_facture_client: 12 }];
	const convertToInvoice = jest.fn();
	await render(
		<CompanyDocumentsListContent {...data} documentType="facture-pro-forma" convertToInvoice={convertToInvoice} />,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.common.moreActions }));
	expect(screen.getByRole('menuitem', { name: t.facturesProforma.alreadyConverted })).toBeDisabled();
	await fireEvent.press(screen.getByRole('menuitem', { name: t.facturesProforma.alreadyConverted }));
	expect(convertToInvoice).not.toHaveBeenCalled();
});

const cardAction = async (name: string) => {
	await fireEvent.press(screen.getByRole('button', { name: t.common.moreActions }));
	const menu = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name }));
	await act(() => menu.props.onDismiss());
};
it('prints delivery notes with language choices only and passes the normal format to the API helper', async () => {
	const data = props();
	await render(<CompanyDocumentsListContent {...data} documentType="bon-de-livraison" />);
	await cardAction(t.common.print);
	expect(screen.queryByText(t.pdf.format)).toBeNull();
	const onDismiss = screen.getByTestId('document-pdf-modal').props.onDismiss;
	await fireEvent.press(screen.getByRole('radio', { name: t.pdf.english }));
	expect(data.openPdf).not.toHaveBeenCalled();
	await act(() => onDismiss());
	await waitFor(() => expect(data.openPdf).toHaveBeenCalledWith(7, 'normal', 'en'));
});
it('keeps uninvoiced delivery lists free of bulk deletion, printing and conversion actions', async () => {
	await render(
		<CompanyDocumentsListContent
			{...props()}
			documentType="bon-de-livraison"
			bulkDeleteEnabled={false}
			printingEnabled={false}
		/>,
	);
	expect(screen.queryByRole('checkbox')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.moreActions }));
	expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
		t.common.edit,
		t.common.delete,
	]);
});
it.each(['devis', 'bon-de-livraison'] as const)(
	'offers the invoiced status filter only for delivery notes: %s',
	async (documentType) => {
		await render(<CompanyDocumentsListContent {...props()} documentType={documentType} />);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
		await fireEvent.press(screen.getByRole('radio', { name: t.documentList.colStatut }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
		expect(!!screen.queryByRole('radio', { name: 'Facturé' })).toBe(documentType === 'bon-de-livraison');
	},
);
it('confirms invoice conversion and opens the new delivery note with its company', async () => {
	const data = props();
	const convertToDelivery = jest.fn(() => ({ unwrap: async () => ({ id: 31 }) }));
	await render(
		<CompanyDocumentsListContent {...data} documentType="facture-client" convertToDelivery={convertToDelivery} />,
	);
	await cardAction(t.facturesClient.labelBonLivraison);
	expect(screen.getByText(t.facturesClient.convertToBLTitle)).toBeOnTheScreen();
	expect(convertToDelivery).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.convert }));
	await waitFor(() => expect(convertToDelivery).toHaveBeenCalledWith({ id: 7 }));
	expect(router.push).toHaveBeenCalledWith({
		pathname: '/bon-de-livraison/form',
		params: { id: '31', company_id: '5' },
	});
});
it('reports rejected delivery conversion while preserving the invoice list', async () => {
	const convertToDelivery = jest.fn(() => ({
		unwrap: async () =>
			Promise.reject({
				status: 400,
				data: { status_code: 400, message: 'Requête invalide', details: { detail: ['Conversion refusée'] } },
			}),
	}));
	await render(
		<CompanyDocumentsListContent {...props()} documentType="facture-client" convertToDelivery={convertToDelivery} />,
	);
	await cardAction(t.facturesClient.labelBonLivraison);
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.convert }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith('Conversion refusée'));
	expect(router.push).not.toHaveBeenCalled();
	expect(screen.getByText('PRO7/26')).toBeOnTheScreen();
});
