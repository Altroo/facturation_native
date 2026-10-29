import {
	logistiqueScreen as state,
	logisticsSupplier,
	resetLogistiqueScreen,
	syncLogistiqueScreen,
} from '@/__tests__/logistiqueScreenSetup';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/logistique/fournisseurs/index';
import Grid, { type PaginatedDataGridProps } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import { useGetLogistiqueSuppliersInfiniteListInfiniteQuery } from '@/store/services/logistique';
import type { LogistiqueSupplier } from '@/types/logistiqueTypes';
import { translations } from '@/translations';
import { router } from 'expo-router';
import { LOGISTIQUE_SUPPLIER_ADD, LOGISTIQUE_SUPPLIER_EDIT, LOGISTIQUE_SUPPLIER_VIEW } from '@/utils/routes';

const t = translations.fr;
const grid = () => jest.mocked(Grid).mock.calls.at(-1)![0] as PaginatedDataGridProps<LogistiqueSupplier>;
beforeEach(resetLogistiqueScreen);

describe('LogistiqueSuppliersPage', () => {
	it('shows supplier contact, dossier count and last activity without unfinished routes', async () => {
		await render(<Page />);
		expect(screen.getByText(logisticsSupplier.nom)).toBeOnTheScreen();
		expect(screen.getByText(logisticsSupplier.email)).toBeOnTheScreen();
		expect(screen.getByText(t.logistique.ordersCount)).toBeOnTheScreen();
		expect(screen.getByText(t.logistique.colLastActivity)).toBeOnTheScreen();
		expect(grid().createAction).toMatchObject({ label: t.logistique.supplierNew, onPress: expect.any(Function) });
		expect(screen.queryByRole('button', { name: t.common.view })).toBeNull();
		expect(screen.getByRole('button', { name: t.common.edit })).toBeEnabled();
	});

	it('opens details by tapping the card and uses the selected company for add/edit navigation', async () => {
		await render(<Page />);
		await fireEvent.press(
			screen.getByRole('button', { name: `${t.logistique.supplierViewTitle}: ${logisticsSupplier.nom}` }),
		);
		expect(router.push).toHaveBeenLastCalledWith(LOGISTIQUE_SUPPLIER_VIEW(9, 5));
		grid().createAction?.onPress?.();
		expect(router.push).toHaveBeenLastCalledWith(LOGISTIQUE_SUPPLIER_ADD(5));
		await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
		expect(router.push).toHaveBeenLastCalledWith(LOGISTIQUE_SUPPLIER_EDIT(9, 5));
	});

	it('sends search, date filters and numeric ordering to Django', async () => {
		await render(<Page />);
		await act(() => {
			grid().setSearchTerm('Atlas');
			grid().sorting!.onSortModelChange([{ field: 'total_dossiers', sort: 'desc' }]);
			grid().onFilterModelChange!({
				logicOperator: 'and',
				items: [
					{
						id: 'date',
						field: 'derniere_activite',
						operator: 'between',
						value: { from: '2026-10-01', to: '2026-10-20' },
					},
				],
			});
		});
		expect(useGetLogistiqueSuppliersInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({
				company_id: 5,
				search: 'Atlas',
				ordering: '-total_dossiers',
				derniere_activite_after: '2026-10-01',
				derniere_activite_before: '2026-10-20',
			}),
			expect.anything(),
		);
	});

	it('explains why a linked supplier cannot be deleted', async () => {
		await render(<Page />);
		await fireEvent.press(screen.getByRole('button', { name: 'Delete row' }));
		expect(screen.getByText(t.logistique.supplierInUse)).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.common.delete })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		expect(state.deleteSupplier).not.toHaveBeenCalled();
	});

	it('deletes an unused supplier only after confirmation', async () => {
		state.suppliers.currentData.pages[0]!.results = [{ ...logisticsSupplier, total_dossiers: 0 }];
		await syncLogistiqueScreen();
		await render(<Page />);
		await fireEvent.press(screen.getByRole('button', { name: 'Delete row' }));
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(state.deleteSupplier).toHaveBeenCalledWith({ id: 9, company_id: 5 }));
		expect(state.onSuccess).toHaveBeenCalledWith(t.logistique.supplierDeleted);
	});

	it('hides deletion for readers and keeps server pagination available', async () => {
		state.role = 'Lecture';
		await syncLogistiqueScreen();
		await render(<Page />);
		expect(screen.queryByRole('button', { name: 'Delete row' })).toBeNull();
		expect(grid().createAction).toBeUndefined();
		expect(screen.queryByRole('button', { name: t.common.view })).toBeNull();
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
		grid().onEndReached?.();
		expect(state.suppliers.fetchNextPage).toHaveBeenCalledTimes(1);
		grid().onRefresh?.();
		expect(state.suppliers.refetch).toHaveBeenCalledTimes(1);
	});
});
