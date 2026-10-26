import { render, screen } from '@testing-library/react-native';
import * as queries from '@/store/services/dashboard';
import { Bar, Doughnut, Line } from '@/components/shared/themedCharts/themedCharts';
import {
	CashFlowCharts,
	ClientCharts,
	CommercialCharts,
	DiscountMarginCharts,
	FinancialCharts,
	GlobalCharts,
	KPICardsSection,
	MonthlyObjectivesSection,
	OperationalCharts,
} from './dashboardCharts';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual('@/utils/hooks'),
	useAppSelector: () => ({ is_staff: false }),
}));
const mockResults: Record<string, { currentData?: unknown; isError?: boolean }> = {};
jest.mock('@/store/services/dashboard', () => {
	const names = [
		'ClientMultidimensionalProfile',
		'CollectionRate',
		'DiscountImpactAnalysis',
		'KPICardsWithTrends',
		'MonthlyDocumentVolume',
		'MonthlyGlobalPerformance',
		'MonthlyObjectives',
		'MonthlyRevenueEvolution',
		'OverdueReceivables',
		'PaymentDelayByClient',
		'PaymentStatusOverview',
		'PaymentTimeline',
		'ProductMarginVolume',
		'ProductPriceVolumeAnalysis',
		'QuoteConversionRate',
		'SectionMicroTrends',
		'TopClientsByRevenue',
		'TopProductsByQuantity',
		'ReceivablesByClient',
		'UninvoicedDeliveries',
	];
	return Object.fromEntries(
		names.map((name) => [`useGet${name}Query`, jest.fn(() => ({ refetch: jest.fn(), ...mockResults[name] }))]),
	);
});
jest.mock('@/components/shared/themedCharts/themedCharts', () => {
	const { Text } = jest.requireActual('react-native');
	const chart = jest.fn(() => <Text>Native chart</Text>);
	return { Bar: jest.fn(chart), Line: jest.fn(chart), Doughnut: jest.fn(chart) };
});

const props = {
	company_id: 5,
	devise: 'EUR' as const,
	dateParams: {
		company_id: 5,
		devise: 'EUR' as const,
		client_id: 7,
		project: 'Atlas',
		date_from: '2026-01-01',
		date_to: '2026-10-26',
	},
};
const kpi = { value: 150, trend: [1, 2, 3] };
const fixtures = {
	KPICardsWithTrends: {
		current_month_revenue: kpi,
		outstanding_receivables: kpi,
		average_invoice_amount: kpi,
		active_clients: kpi,
	},
	MonthlyObjectives: {
		revenue: { current: 120, objective: 100, percentage: 120 },
		invoices: { current: 0, objective: 0, percentage: 0 },
		conversion: { current: 10, objective: 20, percentage: 50 },
		objectives_set: true,
	},
	MonthlyRevenueEvolution: [{ month: '2026-10', revenue: 100 }],
	ReceivablesByClient: {
		as_of: '2026-10-26',
		currency: 'EUR',
		total_amount: 100,
		client_count: 1,
		clients: [{ client_name: 'Casa di lusso', overdue: 30, not_due: 50, no_due_date: 20 }],
	},
	PaymentStatusOverview: [{ status: 'Payé', count: 1 }],
	CollectionRate: { rate: 80, total_invoiced: 100, total_collected: 80 },
	TopClientsByRevenue: [{ client_name: 'Casa di lusso', revenue: 100 }],
	TopProductsByQuantity: [{ designation: 'Article', quantity: 20 }],
	QuoteConversionRate: [{ status: 'Accepté', count: 1 }],
	ProductPriceVolumeAnalysis: [{ designation: 'Article', total_quantity: 20, average_price: 10 }],
	UninvoicedDeliveries: {
		total_count: 1,
		total_amount: 100,
		currency: 'EUR',
		as_of: '2026-10-26',
		buckets: [{ key: '0_7', amount: 100, count: 1 }],
	},
	MonthlyDocumentVolume: [{ month: '2026-10', devis: 1, factures: 2, bdl: 3 }],
	PaymentTimeline: [{ date: '2026-10-01', invoiced: 100, collected: 80 }],
	OverdueReceivables: [{ period: '0-30', count: 1, amount: 20 }],
	PaymentDelayByClient: [{ client_name: 'Casa di lusso', average_delay_days: 45 }],
	ClientMultidimensionalProfile: [
		{
			client_name: 'Casa di lusso',
			metrics: { volume: 10000, frequency: 2, avg_amount: 1000, payment_speed: 10, acceptance_rate: 50 },
		},
	],
	DiscountImpactAnalysis: [{ document_id: 1, document_type: 'Devis', total_amount: 100, discount_amount: 10 }],
	ProductMarginVolume: [{ designation: 'Article', average_margin: 25, total_quantity: 20 }],
	MonthlyGlobalPerformance: {
		current: { revenue: 10000, quotes: 2, conversion: 50, collection: 8000, new_clients: 1 },
		previous: { revenue: 5000, quotes: 1, conversion: 25, collection: 4000, new_clients: 0 },
	},
	SectionMicroTrends: { financial: [1, 2], commercial: [2, 3], operational: [3, 4], cashflow: [4, 5] },
};
beforeEach(() => {
	jest.clearAllMocks();
	for (const key of Object.keys(mockResults)) delete mockResults[key];
	for (const [key, value] of Object.entries(fixtures)) mockResults[key] = { currentData: value };
});

it.each([
	KPICardsSection,
	MonthlyObjectivesSection,
	FinancialCharts,
	CommercialCharts,
	OperationalCharts,
	CashFlowCharts,
	ClientCharts,
	DiscountMarginCharts,
	GlobalCharts,
])('renders %p with live data and applies every filter to each request', async (Component) => {
	await render(<Component {...props} />);
	expect(screen.getAllByText('Native chart').length).toBeGreaterThan(0);
	for (const hook of Object.values(queries)) {
		if (jest.isMockFunction(hook)) for (const call of hook.mock.calls) expect(call[0]).toEqual(props.dateParams);
	}
});

it('clamps goal rings above 100% without changing the displayed percentage', async () => {
	await render(<MonthlyObjectivesSection {...props} />);
	expect(jest.mocked(Doughnut).mock.calls[0]![0]).toMatchObject({
		centerLabel: '120.0%',
		data: { datasets: [{ data: [100, 0] }] },
	});
});

it('uses each currency-specific KPI and retains all web sparkline values', async () => {
	mockResults.KPICardsWithTrends.currentData = {
		...fixtures.KPICardsWithTrends,
		currency_data: {
			EUR: { ...fixtures.KPICardsWithTrends, current_month_revenue: { value: 1149560, trend: [7, 8, 9] } },
		},
	};
	await render(<KPICardsSection {...props} />);
	expect(screen.getByText('1 149 560,00')).toBeOnTheScreen();
	expect(jest.mocked(Line).mock.calls[0]![0].data.datasets[0].data).toEqual([7, 8, 9]);
});

it('preserves the receivables categories and the real current document scope', async () => {
	await render(<FinancialCharts {...props} />);
	expect(jest.mocked(Bar).mock.calls[0]![0]).toMatchObject({
		stacked: true,
		data: { datasets: [{ data: [30] }, { data: [50] }, { data: [20] }] },
	});
	expect(screen.getByText(translations.fr.dashboard.currentDocumentScope('26/10/2026'))).toBeOnTheScreen();
});

it('shows quote status percentages without replacing the API counts', async () => {
	mockResults.QuoteConversionRate.currentData = [
		{ status: 'Accepté', count: 1 },
		{ status: 'Envoyé', count: 1 },
	];
	await render(<CommercialCharts {...props} />);
	expect(jest.mocked(Doughnut).mock.calls[0]![0]).toMatchObject({
		showPercentages: true,
		data: { labels: ['Accepté', 'Envoyé'], datasets: [{ data: [1, 1] }] },
	});
});

it('does not keep the previous filter scope visible while a new request has no current data', async () => {
	mockResults.MonthlyRevenueEvolution = {};
	await render(<FinancialCharts {...props} />);
	expect(screen.getByText(translations.fr.dashboard.noRevenue)).toBeOnTheScreen();
	expect(Line).not.toHaveBeenCalled();
});
