import type { ReactNode } from 'react';
import { createQueryMock } from '@/__tests__/setupQuery';
import type { LogistiqueOrder, LogistiqueStats, LogistiqueSupplier } from '@/types/logistiqueTypes';

export const logisticsOrder: LogistiqueOrder = {
	id: 7,
	company: 5,
	numero_commande: 'LOG-007',
	fournisseur: 'Atlas Supply',
	devise: 'MAD',
	date_prevue: '2026-10-20',
	statut_global: 'En retard',
	statut: 'Production',
	statut_commande_lancement: 'Terminée',
	statut_paiement: 'En attente',
	statut_titre_importation: 'À préparer',
	cout_total: '1250000.50',
	alerts: ['Documents manquants'],
};
export const logisticsSupplier: LogistiqueSupplier = {
	id: 9,
	company: 5,
	nom: 'Atlas Supply',
	email: 'supplier@example.invalid',
	marques: [2],
	marques_names: ['Atlas Brand'],
	total_dossiers: 1,
	derniere_activite: '2026-10-20T10:00:00Z',
};
export const logisticsStats: LogistiqueStats = {
	total_commandes: 3,
	commandes_en_cours: 2,
	retards: 1,
	paiements_en_attente: 1,
	livraisons: 1,
	couts_logistiques: '1250000.50',
	swift_manquant: 1,
	documents_non_recus: 2,
	transit_non_lance: 1,
	fournisseurs: [{ fournisseur: 'Atlas Supply' }],
	kpi_fournisseurs: [{ fournisseur: 'Atlas Supply', total_commandes: 3, cout_total: '1250000.50' }],
	statuts_workflow: [{ statut: 'En retard', total: 1 }],
	statuts_paiement: [{ statut_paiement: 'En attente', total: 1 }],
	couts_detail: {
		achat: '1000000',
		transport: '100000',
		transit: '50000',
		douane: '50000',
		tva: '30000',
		livraison_locale: '10000',
		autres: '10000.50',
		total: '1250000.50',
	},
	monthly_flow: [
		{ month: '2026-09', commandes: 1, paiements: 0, livraisons: 0, cout_total: '250000' },
		{ month: '2026-10', commandes: 2, paiements: 1, livraisons: 1, cout_total: '1000000.50' },
	],
};

const result = <T,>(row: T) => ({
	currentData: {
		pages: [{ results: [row], count: 2, next: '?page=2', previous: null, stats: logisticsStats }],
		pageParams: [1],
	},
	isLoading: false,
	isFetching: false,
	isError: false,
	error: undefined as unknown,
	hasNextPage: true,
	isFetchingNextPage: false,
	isFetchNextPageError: false,
	refetch: jest.fn(),
	fetchNextPage: jest.fn(),
});
const mockScreen = {
	company_id: 5,
	role: 'Caissier',
	userId: 42,
	params: {} as { id?: string | string[]; company_id?: string | string[] },
	membershipIds: [5, 11],
	membershipsError: false,
	supplierDetail: {
		currentData: logisticsSupplier as LogistiqueSupplier | undefined,
		isLoading: false,
		isFetching: false,
		isError: false,
		isUninitialized: false,
		error: undefined as unknown,
		refetch: jest.fn(),
	},
	brands: [
		{ id: 2, nom: 'Atlas Brand' },
		{ id: 3, nom: 'Iberia Brand' },
	],
	brandsLoading: false,
	brandsError: false,
	refetchBrands: jest.fn(),
	addSupplier: jest.fn(),
	editSupplier: jest.fn(),
	token: 'access' as string | null,
	orders: result(logisticsOrder),
	suppliers: result(logisticsSupplier),
	dashboard: {
		currentData: logisticsStats as LogistiqueStats | undefined,
		isLoading: false,
		isFetching: false,
		isError: false,
		error: undefined as unknown,
		refetch: jest.fn(),
	},
	fetchAll: jest.fn(),
	deleteOrder: jest.fn(),
	bulkDelete: jest.fn(),
	deleteSupplier: jest.fn(),
	onSuccess: jest.fn(),
	onError: jest.fn(),
};
const mockScreenState = createQueryMock(mockScreen);
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockScreenState.useResult().params,
	router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView', () => ({
	__esModule: true,
	default: jest.requireActual('react-native').ScrollView,
}));
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { View, Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	return function MockSheet(props: { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
		return props.visible ? (
			<View>
				<Text>{props.title}</Text>
				<Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={props.onClose} />
				{props.children}
			</View>
		) : null;
	};
});
jest.mock('@/store/services/company', () => ({
	useGetUserCompaniesQuery: jest.fn(() => {
		const state = mockScreenState.useResult();
		return {
			currentData: state.membershipIds.map((id) => ({ id, role: state.role })),
			isLoading: false,
			isUninitialized: false,
			isError: state.membershipsError,
			refetch: jest.fn(),
		};
	}),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetMarqueListQuery: jest.fn(() => {
		const state = mockScreenState.useResult();
		return {
			currentData: state.brands,
			isLoading: state.brandsLoading,
			isFetching: state.brandsLoading,
			isError: state.brandsError,
			refetch: state.refetchBrands,
		};
	}),
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => mockScreenState.useResult().token }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr, language: 'fr' }),
	useToast: () => ({ onSuccess: mockScreen.onSuccess, onError: mockScreen.onError }),
	useAppSelector: () => ({ user: { pk: mockScreenState.useResult().userId } }),
}));
jest.mock('@/store/services/logistique', () => ({
	useGetLogistiqueInfiniteListInfiniteQuery: jest.fn(() => mockScreenState.useResult().orders),
	useGetLogistiqueSuppliersInfiniteListInfiniteQuery: jest.fn(() => mockScreenState.useResult().suppliers),
	useGetLogistiqueDashboardQuery: jest.fn(() => mockScreenState.useResult().dashboard),
	useLazyGetLogistiqueListQuery: () => [mockScreen.fetchAll],
	useDeleteLogistiqueMutation: () => [mockScreen.deleteOrder, {}],
	useBulkDeleteLogistiqueMutation: () => [mockScreen.bulkDelete, {}],
	useDeleteLogistiqueSupplierMutation: () => [mockScreen.deleteSupplier, {}],
	useGetLogistiqueSupplierQuery: jest.fn(() => mockScreenState.useResult().supplierDetail),
	useAddLogistiqueSupplierMutation: () => [mockScreen.addSupplier, {}],
	useEditLogistiqueSupplierMutation: () => [mockScreen.editSupplier, {}],
}));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return (props: { children: (args: { company_id: number; role: string; tabs: ReactNode }) => ReactNode }) => {
		const state = mockScreenState.useResult();
		return props.children({ company_id: state.company_id, role: state.role, tabs: <Text>Company tabs</Text> });
	};
});
jest.mock('@/components/shared/bottomNavigation/bottomNavigation', () => () => null);
jest.mock('@/components/shared/paginatedDataGrid/paginatedDataGrid', () => {
	const { View } = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		...jest.requireActual('@/components/shared/paginatedDataGrid/paginatedDataGrid'),
		__esModule: true,
		default: jest.fn(
			(props: {
				header: ReactNode;
				rows: { id: number }[];
				renderRow: (row: { id: number }) => ReactNode;
				selectionControl?: ReactNode;
				selectionActions?: ReactNode;
			}) => (
				<View>
					{props.header}
					{props.selectionControl}
					{props.selectionActions}
					{props.rows.map((row) => (
						<View key={row.id}>{props.renderRow(row)}</View>
					))}
				</View>
			),
		),
	};
});
jest.mock('@/components/shared/listCardActions/listCardActions', () => {
	const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const t = jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr;
	return function MockListCardActions(props: { onEdit?: () => void; editDisabled?: boolean; onDelete?: () => void }) {
		return (
			<>
				{(props.onEdit || props.editDisabled) && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.edit}
						disabled={props.editDisabled}
						onPress={props.onEdit}
					>
						<Text>{t.common.edit}</Text>
					</Pressable>
				)}
				{props.onDelete && (
					<Pressable accessibilityRole="button" accessibilityLabel="Delete row" onPress={props.onDelete}>
						<Text>Delete row</Text>
					</Pressable>
				)}
			</>
		);
	};
});
jest.mock('@/components/nativeElements/modals/actionModal/actionModals', () => {
	const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
	return function MockActionModals(props: {
		title: string;
		children: ReactNode;
		actions: { text: string; onClick: () => void; disabled?: boolean }[];
	}) {
		return (
			<View>
				<Text>{props.title}</Text>
				{props.children}
				{props.actions.map((action) => (
					<Pressable
						key={action.text}
						accessibilityRole="button"
						accessibilityLabel={action.text}
						disabled={action.disabled}
						onPress={action.onClick}
					>
						<Text>{action.text}</Text>
					</Pressable>
				))}
			</View>
		);
	};
});
jest.mock('@/components/shared/themedCharts/themedCharts', () => {
	const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
	const chart = jest.fn((props: { data: { labels: string[] } }) => <Text>{props.data.labels.join(' | ')}</Text>);
	return { Line: chart, Bar: chart, Doughnut: chart };
});
jest.mock('@/components/nativeElements/customTooltip/customTooltip', () => {
	return (props: { children: ReactNode }) => props.children;
});

export const logistiqueScreen = mockScreen;
export const syncLogistiqueScreen = () =>
	mockScreenState.setResult({
		...mockScreen,
		orders: { ...mockScreen.orders },
		suppliers: { ...mockScreen.suppliers },
		dashboard: { ...mockScreen.dashboard },
		supplierDetail: { ...mockScreen.supplierDetail },
	});
export const resetLogistiqueScreen = async () => {
	jest.clearAllMocks();
	mockScreen.company_id = 5;
	mockScreen.role = 'Caissier';
	mockScreen.userId = 42;
	mockScreen.params = {};
	mockScreen.membershipIds = [5, 11];
	mockScreen.membershipsError = false;
	mockScreen.supplierDetail = {
		currentData: logisticsSupplier,
		isLoading: false,
		isFetching: false,
		isError: false,
		isUninitialized: false,
		error: undefined,
		refetch: jest.fn(),
	};
	mockScreen.brandsLoading = false;
	mockScreen.brandsError = false;
	mockScreen.addSupplier.mockReturnValue({ unwrap: async () => ({ ...logisticsSupplier, id: 20, total_dossiers: 0 }) });
	mockScreen.editSupplier.mockReturnValue({ unwrap: async () => logisticsSupplier });
	mockScreen.token = 'access';
	mockScreen.orders = result(logisticsOrder);
	mockScreen.suppliers = result(logisticsSupplier);
	mockScreen.dashboard = {
		currentData: logisticsStats,
		isLoading: false,
		isFetching: false,
		isError: false,
		error: undefined,
		refetch: jest.fn(),
	};
	mockScreen.deleteOrder.mockReturnValue({ unwrap: async () => undefined });
	mockScreen.bulkDelete.mockReturnValue({ unwrap: async () => undefined });
	mockScreen.deleteSupplier.mockReturnValue({ unwrap: async () => undefined });
	mockScreen.fetchAll.mockReturnValue({
		unwrap: async () => ({ results: [logisticsOrder, { ...logisticsOrder, id: 8 }] }),
		abort: jest.fn(),
		unsubscribe: jest.fn(),
	});
	await syncLogistiqueScreen();
};
