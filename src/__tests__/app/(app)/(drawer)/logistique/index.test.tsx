import {
	logistiqueScreen as state,
	logisticsOrder,
	resetLogistiqueScreen,
	syncLogistiqueScreen,
} from '@/__tests__/logistiqueScreenSetup';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Page from '@/app/(app)/(drawer)/logistique/index';
import Grid, { type PaginatedDataGridProps } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import { useGetLogistiqueInfiniteListInfiniteQuery } from '@/store/services/logistique';
import type { LogistiqueOrder } from '@/types/logistiqueTypes';
import { translations } from '@/translations';

const t = translations.fr;
const grid = () => jest.mocked(Grid).mock.calls.at(-1)![0] as PaginatedDataGridProps<LogistiqueOrder>;
beforeEach(resetLogistiqueScreen);

describe('LogistiqueListPage', () => {
	it('shows web list fields in mobile cards without links to unfinished pages', async () => {
		await render(<Page />);
		expect(screen.getByText('LOG-007')).toBeOnTheScreen();
		expect(screen.getByText('Atlas Supply')).toBeOnTheScreen();
		expect(screen.getByText('Documents manquants')).toBeOnTheScreen();
		expect(screen.getByText(/1\s250\s000,50 MAD/)).toBeOnTheScreen();
		expect(grid().createAction).toMatchObject({ label: t.logistique.newOrder, disabled: true });
		expect(screen.queryByRole('button', { name: t.common.view })).toBeNull();
		expect(screen.getByRole('button', { name: t.common.edit })).toBeDisabled();
	});

	it('keeps manager-only creation and responsible-user editing aligned with the web', async () => {
		state.role = 'Lecture';
		state.orders.currentData.pages[0]!.results = [
			{ ...logisticsOrder, responsable: 42, statut_paiement: 'Non demandé' },
		];
		await syncLogistiqueScreen();
		await render(<Page />);
		expect(grid().createAction).toBeUndefined();
		expect(screen.getByRole('button', { name: t.common.edit })).toBeDisabled();
		state.orders = {
			...state.orders,
			currentData: {
				...state.orders.currentData,
				pages: [
					{
						...state.orders.currentData.pages[0]!,
						results: [{ ...logisticsOrder, responsable: 42, statut_global: 'Annulé', statut_paiement: 'Non demandé' }],
					},
				],
			},
		};
		await syncLogistiqueScreen();
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
	});

	it('sends company, search, ordering and combined date/status filters to the server', async () => {
		await render(<Page />);
		await act(() => {
			grid().setSearchTerm('Atlas');
			grid().sorting!.onSortModelChange([{ field: 'cout_total', sort: 'desc' }]);
			grid().onFilterModelChange!({
				logicOperator: 'or',
				items: [
					{ id: 'date', field: 'date_prevue', operator: 'between', value: { from: '2026-10-01', to: '2026-10-20' } },
					{ id: 'status', field: 'statut_global', operator: 'equals', value: 'En retard' },
				],
			});
		});
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({
				company_id: 5,
				search: 'Atlas',
				ordering: '-cout_total',
				filter_logic: 'or',
				filter_groups: JSON.stringify([
					{ date_prevue_after: '2026-10-01', date_prevue_before: '2026-10-20' },
					{ statut_global: 'En retard' },
				]),
			}),
			expect.anything(),
		);
	});

	it('loads another page, refreshes, and guards duplicate next-page requests', async () => {
		await render(<Page />);
		grid().onEndReached?.();
		expect(state.orders.fetchNextPage).toHaveBeenCalledTimes(1);
		await act(() => grid().onRefresh?.());
		expect(state.orders.refetch).toHaveBeenCalledTimes(1);
		state.orders = { ...state.orders, isFetching: true };
		await syncLogistiqueScreen();
		grid().onEndReached?.();
		expect(state.orders.fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('requires confirmation before deleting and shows success', async () => {
		await render(<Page />);
		await fireEvent.press(screen.getByRole('button', { name: 'Delete row' }));
		expect(state.deleteOrder).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(state.deleteOrder).toHaveBeenCalledWith({ id: 7 }));
		expect(state.onSuccess).toHaveBeenCalledWith(t.logistique.deleteSuccess);
	});

	it('selects all server matches and submits their IDs for bulk deletion', async () => {
		await render(<Page />);
		await fireEvent.press(screen.getByRole('checkbox', { name: t.shared.selectAllMatching(2) }));
		await waitFor(() => expect(grid().selectedIds).toEqual([7, 8]));
		expect(state.fetchAll).toHaveBeenCalledWith(
			expect.objectContaining({ company_id: 5, with_pagination: false }),
			false,
		);
		await fireEvent.press(screen.getByText(t.logistique.bulkDeleteBtn(2)));
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(state.bulkDelete).toHaveBeenCalledWith({ ids: [7, 8] }));
	});

	it('clears stale selection on company changes and hides deletion for readers', async () => {
		await render(<Page />);
		await fireEvent.press(
			screen.getByRole('checkbox', { name: `${t.shared.selectAll}: ${logisticsOrder.numero_commande}` }),
		);
		expect(grid().selectedIds).toEqual([7]);
		state.company_id = 11;
		state.role = 'Lecture';
		await syncLogistiqueScreen();
		expect(grid().selectedIds).toEqual([]);
		expect(screen.queryByRole('button', { name: 'Delete row' })).toBeNull();
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ company_id: 11 }),
			expect.anything(),
		);
	});

	it('skips unauthenticated requests', async () => {
		state.token = null;
		await syncLogistiqueScreen();
		await render(<Page />);
		expect(useGetLogistiqueInfiniteListInfiniteQuery).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ skip: true }),
		);
	});
});
