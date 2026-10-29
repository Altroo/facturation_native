import {
	logistiqueScreen as state,
	resetLogistiqueScreen,
	syncLogistiqueScreen,
	logisticsSupplier,
} from '@/__tests__/logistiqueScreenSetup';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Page from '@/app/(app)/(drawer)/logistique/fournisseurs/[id]/index';
import DataGridToolbar from '@/components/shared/paginatedDataGrid/dataGridToolbar';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import { useGetLogistiqueInfiniteListInfiniteQuery } from '@/store/services/logistique';
import { translations } from '@/translations';
import { LOGISTIQUE_SUPPLIER_EDIT } from '@/utils/routes';

jest.mock('@/components/shared/paginatedDataGrid/dataGridToolbar', () => ({
	__esModule: true,
	default: jest.fn(() => null),
}));
jest.mock('@/components/shared/detailsPage/detailsPage', () => {
	const { View } = jest.requireActual<typeof import('react-native')>('react-native');
	const MockDetailsPage = jest.fn(
		(props: { children: import('react').ReactNode; actions?: import('react').ReactNode }) => (
			<View>
				{props.children}
				{props.actions}
			</View>
		),
	);
	return { __esModule: true, default: MockDetailsPage };
});
const t = translations.fr;
beforeEach(async () => {
	await resetLogistiqueScreen();
	state.params = { id: '9', company_id: '5' };
	await syncLogistiqueScreen();
});

describe('LogistiqueSupplierViewPage', () => {
	it('uses shared detail cards and limits linked dossiers to the current supplier and company', async () => {
		await render(<Page />);
		expect(screen.getByText(logisticsSupplier.nom)).toBeOnTheScreen();
		expect(screen.getByText(logisticsSupplier.email)).toBeOnTheScreen();
		expect(screen.getByText('LOG-007')).toBeOnTheScreen();
		expect(screen.getByText('En retard')).toBeOnTheScreen();
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, fournisseur_record: 9 }),
			expect.objectContaining({ skip: false }),
		);
		expect(screen.queryByText(t.logistique.colFournisseur)).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
		expect(router.push).toHaveBeenCalledWith(LOGISTIQUE_SUPPLIER_EDIT(9, 5));
	});

	it('sends history search/sorting to Django and uses the parent scroll to load another page', async () => {
		await render(<Page />);
		const toolbar = jest.mocked(DataGridToolbar).mock.calls.at(-1)![0];
		await act(() => {
			toolbar.setSearchTerm('LOG-01');
			toolbar.sorting!.onSortModelChange([{ field: 'date_prevue', sort: 'desc' }]);
		});
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ search: 'LOG-01', ordering: '-date_prevue', fournisseur_record: 9, company_id: 5 }),
			expect.anything(),
		);
		jest.mocked(DetailsPage).mock.calls.at(-1)![0].onEndReached?.();
		expect(state.orders.fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('hides management actions for readers while keeping the details visible', async () => {
		state.role = 'Lecture';
		await syncLogistiqueScreen();
		await render(<Page />);
		expect(screen.getByText(logisticsSupplier.nom)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
		expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	});

	it('prevents foreign-company data and its dossier requests from being displayed', async () => {
		state.supplierDetail.currentData = { ...logisticsSupplier, company: 99 };
		await syncLogistiqueScreen();
		await render(<Page />);
		expect(screen.queryByText(logisticsSupplier.email)).toBeNull();
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ skip: true }),
		);
	});

	it('uses the same compact deletion guard as the list', async () => {
		await render(<Page />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		expect(screen.getByText(t.logistique.supplierInUse)).toBeOnTheScreen();
		expect(screen.getAllByRole('button', { name: t.common.delete }).at(-1)).toBeDisabled();
	});
});
