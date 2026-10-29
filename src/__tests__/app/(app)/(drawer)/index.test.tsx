import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import DashboardPage from '@/app/(app)/(drawer)';
import { KPICardsSection } from '@/components/shared/dashboard/dashboardCharts';
import { translations } from '@/translations';

const mockPage = { company: 5, foreign: true };
const mockDispatch = jest.fn(() => []);
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({ ...jest.requireActual('@/utils/hooks'), useAppDispatch: () => mockDispatch }));
jest.mock('@/components/shared/bottomNavigation/bottomNavigation', () => () => null);
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => {
	const { Text } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: ({ children }: { children: (args: { company_id: number; tabs: ReactNode }) => ReactNode }) =>
			children({ company_id: mockPage.company, tabs: <Text>Company tabs</Text> }),
	};
});
jest.mock('@/components/shared/dashboard/dashboardCharts', () => {
	const { Text } = jest.requireActual('react-native');
	return Object.fromEntries(
		[
			'KPICardsSection',
			'MonthlyObjectivesSection',
			'FinancialCharts',
			'CommercialCharts',
			'OperationalCharts',
			'CashFlowCharts',
			'ClientCharts',
			'DiscountMarginCharts',
			'GlobalCharts',
		].map((name) => [name, jest.fn(() => <Text>{name}</Text>)]),
	);
});
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { uses_foreign_currency: mockPage.foreign } }),
}));
jest.mock('@/store/services/client', () => ({ useGetClientsListQuery: () => ({ currentData: [] }) }));
jest.mock('@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect', () => () => null);
jest.mock('@/components/nativeElements/customDateInput/customDateInput', () => {
	const { TextInput } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
			<TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />
		),
	};
});
beforeEach(() => {
	jest.clearAllMocks();
	mockPage.company = 5;
	mockPage.foreign = true;
});
const lastScope = () => jest.mocked(KPICardsSection).mock.calls.at(-1)![0].dateParams;

describe('DashboardPage', () => {
	it('uses the existing company tabs and scopes dashboard data to the selected company', async () => {
		await render(<DashboardPage />);
		expect(screen.getByText('Company tabs')).toBeOnTheScreen();
		expect(lastScope()).toMatchObject({ company_id: 5, devise: 'MAD' });
		expect(screen.queryByText('Facturation')).not.toBeOnTheScreen();
	});

	it('changes the server currency and clears company-specific filters when switching company', async () => {
		const view = await render(<DashboardPage />);
		await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
		expect(lastScope()).toMatchObject({ devise: 'EUR' });
		mockPage.company = 8;
		mockPage.foreign = false;
		await view.rerender(<DashboardPage key="company-8" />);
		expect(lastScope()).toMatchObject({ company_id: 8, devise: 'MAD' });
		expect(screen.queryByRole('radio', { name: 'EUR' })).not.toBeOnTheScreen();
	});

	it('applies dates and project to requests, then restores the web default date range on reset', async () => {
		await render(<DashboardPage />);
		const t = translations.fr;
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.changeText(screen.getByLabelText(t.dashboard.dateFrom), '2026-01-01');
		await fireEvent.changeText(screen.getByLabelText(t.dashboard.filterProject), 'Atlas');
		await fireEvent(screen.getByLabelText(t.dashboard.filterProject), 'endEditing');
		expect(lastScope()).toMatchObject({ date_from: '2026-01-01', project: 'Atlas' });
		await act(async () => {
			await fireEvent.press(screen.getByRole('button', { name: t.dashboard.resetDates }));
		});
		expect(lastScope().project).toBeUndefined();
		expect(lastScope().date_from).not.toBe('2026-01-01');
	});
});
