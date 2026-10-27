import {
	logistiqueScreen as state,
	logisticsStats,
	resetLogistiqueScreen,
	syncLogistiqueScreen,
} from '@/__tests__/logistiqueScreenSetup';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { FlatList, type FlatListProps, type RefreshControlProps } from 'react-native';
import Page from '@/app/(app)/(drawer)/logistique/dashboard';
import { useGetLogistiqueDashboardQuery } from '@/store/services/logistique';
import { translations } from '@/translations';

const t = translations.fr;
jest.mock('react-native', () => {
	const native = jest.requireActual<typeof import('react-native')>('react-native');
	const NativeList = native.FlatList;
	return Object.defineProperties(
		{},
		{
			...Object.getOwnPropertyDescriptors(native),
			FlatList: { value: jest.fn((props: FlatListProps<unknown>) => <NativeList {...props} />), enumerable: true },
		},
	);
});
beforeEach(resetLogistiqueScreen);
it('shows scoped KPI values and complete formatted costs', async () => {
	await render(<Page />);
	expect(useGetLogistiqueDashboardQuery).toHaveBeenCalledWith({ company_id: 5 }, { skip: false });
	expect(screen.getByTestId('logistique-total-cost')).toHaveTextContent(/1\s250\s000,50 MAD/);
	expect(screen.getByText(t.logistique.docsMissing)).toBeOnTheScreen();
	expect(screen.getByText(t.logistique.transitNotStarted)).toBeOnTheScreen();
	expect(screen.getByText('Atlas Supply')).toBeOnTheScreen();
});
it('includes all seven web charts and keeps their full datasets', async () => {
	await render(<Page />);
	const props = jest.mocked(FlatList).mock.calls.at(-1)![0] as FlatListProps<{
		key: string;
		data: { datasets: { data: number[] }[] };
	}>;
	expect(props.data).toHaveLength(7);
	expect(Array.from(props.data!).map((chart) => chart.key)).toEqual([
		'flow',
		'workflow',
		'payments',
		'alerts',
		'costs',
		'trend',
		'supplier-share',
	]);
	expect(props.data![0]!.data.datasets[0]!.data).toEqual([1, 2]);
	expect(props.data![4]!.data.datasets[0]!.data).toEqual([1000000, 100000, 50000, 50000, 30000, 10000, 10000.5]);
	await act(() => (props.refreshControl as ReactElement<RefreshControlProps>).props.onRefresh?.());
	expect(state.dashboard.refetch).toHaveBeenCalledTimes(1);
});
it('shows loading and retry rather than an empty dashboard on request failure', async () => {
	state.dashboard.currentData = undefined;
	state.dashboard.isLoading = true;
	await syncLogistiqueScreen();
	await render(<Page />);
	expect(screen.getByTestId('api-loader')).toBeOnTheScreen();
	state.dashboard.isLoading = false;
	state.dashboard.isError = true;
	state.dashboard.error = { status: 500, data: { message: 'Server unavailable' } };
	await syncLogistiqueScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
	expect(state.dashboard.refetch).toHaveBeenCalledTimes(1);
});
it('shows empty supplier and chart states without inventing values', async () => {
	state.dashboard.currentData = {
		...logisticsStats,
		kpi_fournisseurs: [],
		monthly_flow: [],
		statuts_workflow: [],
		statuts_paiement: [],
	};
	await syncLogistiqueScreen();
	await render(<Page />);
	expect(screen.getByText(t.logistique.noSupplierKpi)).toBeOnTheScreen();
	expect(screen.getAllByText(t.logistique.noChartData).length).toBeGreaterThan(0);
});
