import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MonthlyObjectivesPage from '@/app/(app)/(drawer)/settings/monthly-objectives';
import { translations } from '@/translations';
import type { MonthlyObjectivesSettings } from '@/types/dashboardTypes';
import { useGetMonthlyObjectivesSettingsByCompanyQuery } from '@/store/services/dashboard';
import { router } from 'expo-router';
import { DASHBOARD_SETTINGS } from '@/utils/routes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => ({ company_id: '5' }),
	router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
const mockState: { staff: boolean; foreign: boolean; existing?: MonthlyObjectivesSettings; error?: unknown } = {
	staff: true,
	foreign: true,
};
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual('@/utils/hooks'),
	useAppSelector: () => ({ is_staff: mockState.staff }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/company', () => ({
	useGetCompanyQuery: () => ({ currentData: { uses_foreign_currency: mockState.foreign } }),
}));
jest.mock('@/store/services/dashboard', () => ({
	useGetMonthlyObjectivesSettingsByCompanyQuery: jest.fn(() => ({
		currentData: mockState.existing,
		isError: !!mockState.error,
		error: mockState.error,
	})),
	useCreateMonthlyObjectivesSettingsMutation: () => [mockCreate],
	useUpdateMonthlyObjectivesSettingsMutation: () => [mockUpdate],
}));
jest.mock('@/components/shared/company-documents-list/companyDocumentsWrapperList', () => ({
	__esModule: true,
	default: ({ children }: { children: (args: { company_id: number; tabs: ReactNode }) => ReactNode }) =>
		children({ company_id: 5, tabs: null }),
}));
const t = translations.fr;
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(router.canGoBack).mockReturnValue(true);
	mockState.staff = true;
	mockState.foreign = true;
	mockState.existing = undefined;
	mockState.error = { status: 404, data: {} };
	mockCreate.mockReturnValue({ unwrap: async () => ({ id: 11 }) });
	mockUpdate.mockReturnValue({ unwrap: async () => ({ id: 11 }) });
});

it('denies objective configuration to non-administrators before requesting settings', async () => {
	mockState.staff = false;
	await render(<MonthlyObjectivesPage />);
	expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
	expect(useGetMonthlyObjectivesSettingsByCompanyQuery).not.toHaveBeenCalled();
});

it('treats an unconfigured company as a new form and saves the same payload as the web', async () => {
	await render(<MonthlyObjectivesPage />);
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldCALabel), '1000');
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldFacturesLabel), '5');
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldConversionLabel), '50');
	await waitFor(() => expect(screen.getByRole('button', { name: t.common.save })).toBeEnabled());
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.monthlyObjectives.createSuccess));
	expect(router.back).toHaveBeenCalledTimes(1);
	expect(mockCreate).toHaveBeenCalledWith({
		company: 5,
		objectif_ca: '1000',
		objectif_factures: 5,
		objectif_conversion: '50',
		objectif_ca_eur: null,
		objectif_ca_usd: null,
	});
});

it('edits existing objectives and hides foreign currency fields when the company does not use them', async () => {
	mockState.foreign = false;
	mockState.error = undefined;
	mockState.existing = {
		id: 11,
		company: 5,
		objectif_ca: '1000',
		objectif_factures: 5,
		objectif_conversion: '50',
		objectif_ca_eur: null,
		objectif_ca_usd: null,
		date_created: '',
		date_updated: '',
	};
	await render(<MonthlyObjectivesPage />);
	expect(screen.queryByLabelText(t.monthlyObjectives.fieldCAEurLabel)).not.toBeOnTheScreen();
	await waitFor(() => expect(screen.getByRole('button', { name: t.common.save })).toBeEnabled());
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() =>
		expect(mockUpdate).toHaveBeenCalledWith({
			id: 11,
			data: { company: 5, objectif_ca: '1000', objectif_factures: 5, objectif_conversion: '50' },
		}),
	);
	expect(router.back).toHaveBeenCalledTimes(1);
});

it('returns to settings when an objectives screen was opened without navigation history', async () => {
	jest.mocked(router.canGoBack).mockReturnValue(false);
	await render(<MonthlyObjectivesPage />);
	await waitFor(() => expect(screen.getByRole('button', { name: t.common.save })).toBeEnabled());
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(router.replace).toHaveBeenCalledWith(DASHBOARD_SETTINGS));
	expect(router.back).not.toHaveBeenCalled();
});

it('groups currency objectives for display but submits raw amounts for every currency', async () => {
	await render(<MonthlyObjectivesPage />);
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldCALabel), '300 000 000,25');
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldCAEurLabel), '10 000,50');
	await fireEvent.changeText(screen.getByLabelText(t.monthlyObjectives.fieldCAUsdLabel), '20 000');
	expect(screen.getByLabelText(t.monthlyObjectives.fieldCALabel)).toHaveProp('value', '300\u00a0000\u00a0000,25');
	await waitFor(() => expect(screen.getByRole('button', { name: t.common.save })).toBeEnabled());
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() =>
		expect(mockCreate).toHaveBeenCalledWith({
			company: 5,
			objectif_ca: '300000000.25',
			objectif_ca_eur: '10000.5',
			objectif_ca_usd: '20000',
			objectif_factures: 0,
			objectif_conversion: '0',
		}),
	);
});

it('reports a failed save and leaves the form available for correction', async () => {
	mockCreate.mockReturnValue({
		unwrap: async () => Promise.reject({ status: 400, data: { details: { error: ['Invalid objective'] } } }),
	});
	await render(<MonthlyObjectivesPage />);
	await waitFor(() => expect(screen.getByRole('button', { name: t.common.save })).toBeEnabled());
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.monthlyObjectives.createError));
	expect(router.back).not.toHaveBeenCalled();
	expect(router.replace).not.toHaveBeenCalled();
	expect(screen.getByLabelText(t.monthlyObjectives.fieldCALabel)).toBeOnTheScreen();
});
