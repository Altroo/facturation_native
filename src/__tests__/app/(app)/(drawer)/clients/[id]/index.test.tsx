import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { format } from 'date-fns';
import { router } from 'expo-router';
import ClientsViewPage from '@/app/(app)/(drawer)/clients/[id]/index';
import { useGetClientQuery, useGetClientHistoryQuery, useDeleteClientMutation } from '@/store/services/client';
import { openClientStatementPdf } from '@/utils/apiHelpers';
import { createQueryMock } from '@/store/setupQuery';
import { translations } from '@/translations';
import type { ClientClass } from '@/models/classes';
import type { ClientHistoryResponseType } from '@/types/clientTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@react-native-community/datetimepicker', () => 'DatePicker');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockParams,
	router: { push: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockToken }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/apiHelpers', () => ({ openClientStatementPdf: jest.fn() }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => mockCompanies,
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations[mockLanguage],
		language: mockLanguage,
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/client', () => ({
	useGetClientQuery: jest.fn(() => mockClientQuery.useResult()),
	useGetClientHistoryQuery: jest.fn(() => mockHistoryQuery.useResult()),
	useDeleteClientMutation: jest.fn(),
}));
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { View, Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Sheet(props: { visible: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
		return props.visible ? (
			<View>
				<Text>{props.title}</Text>
				{props.children}
				<Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={props.onClose}>
					<Text>Fermer</Text>
				</Pressable>
			</View>
		) : null;
	};
});

let mockParams: { id?: string | string[]; company_id?: string | string[] };
let mockToken: string | undefined;
let mockCompanies: Array<{ id: number; role: string }>;
let mockLanguage: 'fr' | 'en' = 'fr';
const mockSuccess = jest.fn();
const mockError = jest.fn();
const remove = jest.fn();
const refetchClient = jest.fn();
const refetchHistory = jest.fn();
const mockClientQuery = createQueryMock<ReturnType<typeof useGetClientQuery>>({} as never);
const mockHistoryQuery = createQueryMock<ReturnType<typeof useGetClientHistoryQuery>>({} as never);
const t = translations.fr;
const client: ClientClass = {
	id: 7,
	company: 5,
	company_name: 'Atlas',
	code_client: 'CLT007',
	client_type: 'PM',
	raison_sociale: 'Client Atlas',
	nom: null,
	prenom: null,
	adresse: 'Rue de Casablanca',
	ville: 2,
	ville_name: 'Casablanca',
	tel: '0612345678',
	email: 'client@example.invalid',
	delai_de_paiement: 0,
	remarque: 'Livrer le matin',
	numero_du_compte: 'COMPTE-123',
	ICE: '123456789012345',
	registre_de_commerce: 'RC-123',
	identifiant_fiscal: 'IF-123',
	taxe_professionnelle: 'TP-123',
	CNSS: 'CNSS-123',
	fax: null,
	date_created: '2026-01-01T12:00:00Z',
	date_updated: null,
	archived: false,
};
const history: ClientHistoryResponseType = {
	devis: [
		{
			id: 1,
			numero_devis: 'DEV-001',
			date_devis: '2026-01-01',
			statut: 'Valide',
			total_ttc_apres_remise: '1000.50',
			devise: 'MAD',
		},
	],
	factures: [
		{
			id: 10,
			numero_facture: 'FAC-010',
			date_facture: '2026-01-02',
			date_echeance: '2026-02-02',
			statut: 'Valide',
			statut_paiement: 'Partiel',
			total_ttc_apres_remise: '1 000,50',
			devise: 'MAD',
		},
		{
			id: 11,
			numero_facture: 'FAC-011',
			date_facture: '2026-01-03',
			date_echeance: null,
			statut: 'Valide',
			statut_paiement: null,
			total_ttc_apres_remise: '200',
			devise: 'EUR',
		},
	],
	avoirs: [
		{
			id: 20,
			numero_avoir: 'AV-020',
			facture_origine_numero: 'FAC-010',
			date_avoir: '2026-01-02',
			statut: 'Valide',
			total_ttc_apres_remise: '100',
			devise: 'MAD',
		},
	],
	reglements: [
		{
			id: 30,
			libelle: 'Virement janvier',
			facture_client_numero: 'FAC-010',
			date_reglement: '2026-01-04',
			date_echeance: null,
			statut: 'Valide',
			mode_reglement_name: 'Virement',
			montant: '300.50',
			devise: 'MAD',
		},
	],
};
const setClient = async (record: Partial<ClientClass> | undefined = client, extra = {}) =>
	mockClientQuery.setResult({
		currentData: record,
		isLoading: !record,
		isFetching: false,
		refetch: refetchClient,
		...extra,
	} as never);
const setHistory = async (record: ClientHistoryResponseType | undefined = history, extra = {}) =>
	mockHistoryQuery.setResult({
		currentData: record,
		isLoading: !record,
		isFetching: false,
		isUninitialized: false,
		refetch: refetchHistory,
		...extra,
	} as never);
const openDelete = async () => fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
const confirmDelete = async () =>
	fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
const setDate = async (label: string, date: string) => {
	await fireEvent.press(screen.getByRole('button', { name: label }));
	await fireEvent(screen.getByTestId('date-picker-' + label), 'valueChange', {}, new Date(date + 'T12:00:00'));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
};

beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { id: '7', company_id: '5' };
	mockToken = 'test-token';
	mockCompanies = [{ id: 5, role: 'Caissier' }];
	mockLanguage = 'fr';
	remove.mockReset().mockReturnValue({ unwrap: () => Promise.resolve() });
	jest.mocked(useDeleteClientMutation).mockReturnValue([remove, { isLoading: false }] as never);
	jest.mocked(openClientStatementPdf).mockResolvedValue(true);
	await setClient();
	await setHistory();
});

it('renders all PM fields, keeps zero payment days and uses existing field styles without a client avatar', async () => {
	await render(<ClientsViewPage />);
	for (const value of [
		client.code_client,
		client.raison_sociale,
		client.email,
		client.tel,
		client.ICE,
		client.numero_du_compte,
		client.registre_de_commerce,
		client.identifiant_fiscal,
		client.taxe_professionnelle,
		client.CNSS,
		client.remarque,
		client.ville_name,
	])
		expect(screen.getByText(value!)).toBeOnTheScreen();
	expect(screen.getByText('0')).toBeOnTheScreen();
	expect(screen.getByText(t.clients.identitySection)).toBeOnTheScreen();
	expect(screen.getAllByText(t.common.noData).length).toBeGreaterThan(0);
	expect(screen.queryAllByRole('image')).toHaveLength(0);
	expect(useGetClientQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: false }));
	expect(useGetClientHistoryQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: false }));
});

it.each(['PP', 'CD'])('uses the web identity fields for %s clients', async (client_type) => {
	await setClient({
		...client,
		client_type,
		nom: 'Alaoui',
		prenom: 'Sara',
		raison_sociale: client_type === 'CD' ? 'Client divers' : null,
	});
	await render(<ClientsViewPage />);
	if (client_type === 'PP') {
		expect(screen.getByText('Alaoui')).toBeOnTheScreen();
		expect(screen.getByText('Sara')).toBeOnTheScreen();
		expect(screen.getByText(client.adresse!)).toBeOnTheScreen();
	} else {
		expect(screen.getByText(t.clients.typeClientDivers)).toBeOnTheScreen();
		expect(screen.getByText('Client divers')).toBeOnTheScreen();
		expect(screen.queryByText('Alaoui')).toBeNull();
	}
});

it.each([
	{ id: 'invalid', company_id: '5' },
	{ id: '0', company_id: '5' },
	{ id: '7' },
	{ id: '7', company_id: ['5', '6'] },
])('rejects invalid route params before calling the services: %j', async (params) => {
	mockParams = params;
	await render(<ClientsViewPage />);
	expect(screen.getByText(t.notFound.message)).toBeOnTheScreen();
	expect(useGetClientQuery).not.toHaveBeenCalled();
});

it.each(['guest', 'different-company'])('skips API calls when the visitor is %s', async (visitor) => {
	if (visitor === 'guest') mockToken = undefined;
	else mockCompanies = [{ id: 99, role: 'Caissier' }];
	await render(<ClientsViewPage />);
	expect(screen.getByText(t.noPermission.description)).toBeOnTheScreen();
	expect(useGetClientQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: true }));
	expect(useGetClientHistoryQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: true }));
	expect(screen.queryByText(client.raison_sociale!)).toBeNull();
});

it('hides data and skips history when a valid client belongs to another company', async () => {
	await setClient({ ...client, company: 99 });
	await render(<ClientsViewPage />);
	expect(screen.getByText(t.noPermission.description)).toBeOnTheScreen();
	expect(screen.queryByText(client.raison_sociale!)).toBeNull();
	expect(useGetClientHistoryQuery).toHaveBeenCalledWith({ id: 7 }, expect.objectContaining({ skip: true }));
});

it('shows loading and a retryable client error without displaying stale data', async () => {
	await mockClientQuery.setResult({ currentData: undefined, isLoading: true, isFetching: true } as never);
	await render(<ClientsViewPage />);
	expect(screen.getByTestId('api-loader')).toBeOnTheScreen();
	await setClient(undefined, {
		currentData: undefined,
		data: client,
		error: { status: 500, data: { message: 'Client indisponible' } },
	});
	expect(screen.queryByText(client.raison_sociale!)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(refetchClient).toHaveBeenCalledTimes(1);
});

it.each(['Lecture', 'Comptable', 'Commercial'])('matches web action permissions for %s', async (role) => {
	mockCompanies = [{ id: 5, role }];
	await render(<ClientsViewPage />);
	expect(!!screen.queryByRole('button', { name: t.common.edit })).toBe(role === 'Commercial');
	expect(!!screen.queryByRole('button', { name: t.common.delete })).toBe(role === 'Commercial');
	expect(!!screen.queryByRole('button', { name: t.clients.statementPrint })).toBe(role !== 'Lecture');
	expect(screen.getByText(client.raison_sociale!)).toBeOnTheScreen();
});

it('preserves company_id when navigating to the existing edit route', async () => {
	await render(<ClientsViewPage />);
	const actions = within(screen.getByTestId('details-page-actions'));
	expect(actions.getAllByRole('button').map((button) => button.props.accessibilityLabel)).toEqual([
		t.common.delete,
		t.common.edit,
	]);
	expect(within(screen.getByTestId('details-page')).queryByTestId('details-page-actions')).toBeNull();
	expect(within(screen.getByTestId('page-action-bar')).getByTestId('details-page-actions')).toBeOnTheScreen();
	await fireEvent.press(actions.getByRole('button', { name: t.common.edit }));
	expect(router.push).toHaveBeenCalledWith({ pathname: '/clients/form', params: { id: '7', company_id: '5' } });
});

it('cancels deletion without a request, then deletes once after confirmation and returns to the list', async () => {
	await render(<ClientsViewPage />);
	await openDelete();
	expect(remove).not.toHaveBeenCalled();
	await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.cancel }));
	expect(remove).not.toHaveBeenCalled();
	await openDelete();
	await confirmDelete();
	expect(remove).toHaveBeenCalledTimes(1);
	expect(remove).toHaveBeenCalledWith({ id: 7 });
	expect(mockSuccess).toHaveBeenCalledWith(t.clients.deleteSuccess);
	expect(router.dismissTo).toHaveBeenCalledWith('/clients');
});

it('prevents duplicate deletes while the first request is pending and shows server failures in a toast', async () => {
	let reject!: (error: unknown) => void;
	remove.mockReturnValue({
		unwrap: () =>
			new Promise((_resolve, rejectRequest) => {
				reject = rejectRequest;
			}),
	});
	await render(<ClientsViewPage />);
	await openDelete();
	await confirmDelete();
	await confirmDelete();
	expect(remove).toHaveBeenCalledTimes(1);
	await act(async () => reject({ status: 403, data: { message: 'Suppression interdite' } }));
	await waitFor(() => expect(mockError).toHaveBeenCalled());
	expect(mockSuccess).not.toHaveBeenCalled();
	expect(router.dismissTo).not.toHaveBeenCalled();
});

it('sorts statement entries and keeps each currency total separate', async () => {
	await render(<ClientsViewPage />);
	const mad = within(screen.getByTestId('statement-total-MAD'));
	expect(mad.getByText(/1\s000,50 MAD/)).toBeOnTheScreen();
	expect(mad.getByText('400,50 MAD')).toBeOnTheScreen();
	expect(mad.getByText('600,00 MAD')).toBeOnTheScreen();
	expect(mad.getByText(/1\s000,50 MAD/).props.className).toContain('text-red-600 dark:text-red-300');
	expect(mad.getByText('400,50 MAD').props.className).toContain('text-emerald-600 dark:text-emerald-300');
	expect(mad.getByText('600,00 MAD').props.className).toContain('text-ink dark:text-slate-100');
	expect(within(screen.getByTestId('history-0-1')).getByText(/1\s000,50 MAD/).props.className).toContain(
		'text-ink dark:text-slate-100',
	);
	expect(within(screen.getByTestId('statement-total-EUR')).getAllByText('200,00 EUR')).toHaveLength(2);
	expect(screen.getAllByTestId(/^(invoice|credit-note|payment)-/).map((node) => node.props.testID)).toEqual([
		'invoice-10',
		'credit-note-20',
		'invoice-11',
		'payment-30',
	]);
});

it.each([
	{ label: t.clients.statementDateFrom, removedEntry: 'invoice-10' },
	{ label: t.clients.statementDateTo, removedEntry: 'payment-30' },
])('applies the $label statement filter only after confirming the picker', async ({ label, removedEntry }) => {
	await render(<ClientsViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: label }));
	await fireEvent(screen.getByTestId('date-picker-' + label), 'valueChange', {}, new Date(2026, 0, 3, 12));
	expect(screen.getByTestId(removedEntry)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(screen.queryByTestId(removedEntry)).toBeNull();
});

it('filters statement dates inclusively and constrains both pickers to the other date', async () => {
	await render(<ClientsViewPage />);
	await setDate(t.clients.statementDateFrom, '2026-01-03');
	expect(screen.queryByTestId('invoice-10')).toBeNull();
	expect(screen.getByTestId('invoice-11')).toBeOnTheScreen();
	await setDate(t.clients.statementDateTo, '2026-01-03');
	expect(screen.getByTestId('invoice-11')).toBeOnTheScreen();
	expect(screen.queryByTestId('payment-30')).toBeNull();
	await setDate(t.clients.statementDateTo, '2026-01-02');
	expect(screen.queryByText(t.clients.statementInvalidDates)).toBeNull();
	expect(screen.getByRole('button', { name: t.clients.statementPrint })).toBeEnabled();
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementDateTo }));
	expect(screen.getByTestId('date-picker-' + t.clients.statementDateTo)).toHaveProp(
		'minimumDate',
		new Date(2026, 0, 3, 12),
	);
	expect(screen.getByTestId('date-picker-' + t.clients.statementDateTo)).toHaveProp('value', new Date(2026, 0, 3, 12));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementDateFrom }));
	expect(screen.getByTestId('date-picker-' + t.clients.statementDateFrom)).toHaveProp(
		'maximumDate',
		new Date(2026, 0, 3, 12),
	);
	await fireEvent(
		screen.getByTestId('date-picker-' + t.clients.statementDateFrom),
		'valueChange',
		{},
		new Date(2026, 0, 4, 12),
	);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(screen.queryByText(t.clients.statementInvalidDates)).toBeNull();
	expect(screen.getByTestId('invoice-11')).toBeOnTheScreen();
	expect(screen.getByTestId('history-0-1')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.reset} (${t.clients.statementDateTo})` }));
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementDateFrom }));
	expect(screen.getByTestId('date-picker-' + t.clients.statementDateFrom)).toHaveProp(
		'maximumDate',
		new Date(format(new Date(), 'yyyy-MM-dd') + 'T12:00:00'),
	);
});

it('filters by document type and sends the same filters and language to the PDF endpoint', async () => {
	await render(<ClientsViewPage />);
	await setDate(t.clients.statementDateFrom, '2026-01-02');
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementType }));
	await fireEvent.press(within(screen.getByTestId('dropdown-options')).getByText(t.clients.historyFactures));
	expect(screen.queryByTestId('credit-note-20')).toBeNull();
	expect(screen.queryByTestId('payment-30')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementPrint }));
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.dutch }));
	expect(openClientStatementPdf).toHaveBeenCalledWith(7, 5, 'nl', {
		date_from: '2026-01-02',
		date_to: format(new Date(), 'yyyy-MM-dd'),
		type: 'invoice',
	});
});

it('uses the company tab control to scroll history choices without changing the selected document type', async () => {
	await render(<ClientsViewPage />);
	await fireEvent.layout(screen.getByTestId('client-history-tabs'), { width: 300, height: 56 });
	await fireEvent(screen.getByLabelText(t.clients.historySection), 'contentSizeChange', 600, 56);
	await fireEvent.layout(screen.getByLabelText(t.clients.historySection), { width: 212, height: 56 });
	expect(screen.getByRole('button', { name: t.common.tabsScrollLeft })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.tabsScrollRight }));
	expect(ScrollView.prototype.scrollTo).toHaveBeenLastCalledWith({ x: expect.closeTo(169.6), animated: true });
	expect(screen.getByRole('tab', { name: t.clients.historyDevis, selected: true })).toBeOnTheScreen();
	expect(screen.getByText('DEV-001')).toBeOnTheScreen();
	expect(screen.getByText(`${t.clients.historyFactures} (2)`)).toBeOnTheScreen();
});

it('switches all four history tabs, retaining status, payment status and payment method', async () => {
	await render(<ClientsViewPage />);
	expect(screen.getByText('DEV-001')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('tab', { name: t.clients.historyFactures }));
	expect(screen.getByText('FAC-010')).toBeOnTheScreen();
	expect(within(screen.getByTestId('history-1-10')).getByText(/1\s000,50 MAD/)).toBeOnTheScreen();
	expect(screen.getByText('Partiel')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('tab', { name: t.clients.historyAvoirs }));
	expect(screen.getByText('AV-020')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('tab', { name: t.clients.historyReglements }));
	expect(screen.getByText('Virement janvier')).toBeOnTheScreen();
	expect(screen.getByText('Virement')).toBeOnTheScreen();
});

it('keeps the profile readable when history fails and retries the history independently', async () => {
	await setHistory(undefined, {
		currentData: undefined,
		error: { status: 500, data: { message: 'Historique indisponible' } },
	});
	await render(<ClientsViewPage />);
	expect(screen.getByText(client.raison_sociale!)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.clients.statementPrint })).toBeDisabled();
	await fireEvent.press(screen.getAllByRole('button', { name: t.common.retry })[0]);
	expect(refetchHistory).toHaveBeenCalledTimes(1);
});

it('disables PDF export for an empty statement, including a date-filtered opening line', async () => {
	await setHistory({ devis: [], factures: [], avoirs: [], reglements: [] });
	await render(<ClientsViewPage />);
	await setDate(t.clients.statementDateFrom, '2026-01-01');
	expect(screen.getByRole('button', { name: t.clients.statementPrint })).toBeDisabled();
	expect(screen.queryByTestId('opening-balance')).toBeNull();
	expect(screen.getAllByText(t.clients.noHistory)).toHaveLength(2);
});

it('shows a toast if PDF preview is unavailable and allows trying again', async () => {
	jest.mocked(openClientStatementPdf).mockResolvedValue(false);
	await render(<ClientsViewPage />);
	await fireEvent.press(screen.getByRole('button', { name: t.clients.statementPrint }));
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.french }));
	expect(mockError).toHaveBeenCalledWith(t.errors.documentOpenError);
	expect(screen.getByRole('button', { name: t.clients.statementPrint })).toBeEnabled();
});

it('translates the complete view to English', async () => {
	mockLanguage = 'en';
	await render(<ClientsViewPage />);
	expect(screen.getByText(translations.en.clients.identitySection)).toBeOnTheScreen();
	expect(screen.getByText(translations.en.clients.accountStatement)).toBeOnTheScreen();
	expect(screen.getByRole('tab', { name: translations.en.clients.historyDevis })).toBeOnTheScreen();
});
