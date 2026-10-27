import { logistiqueScreen as state, logisticsSupplier, resetLogistiqueScreen } from '@/__tests__/logistiqueScreenSetup';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LogistiqueSupplierDeleteDialog from './logistiqueSupplierDeleteDialog';
import { translations } from '@/translations';

const t = translations.fr;
beforeEach(resetLogistiqueScreen);
it('keeps linked suppliers protected using the shared delete modal', async () => {
	const close = jest.fn();
	await render(<LogistiqueSupplierDeleteDialog supplier={logisticsSupplier} onClose={close} />);
	expect(screen.getByText(t.logistique.supplierInUse)).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: t.common.delete })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
	expect(close).toHaveBeenCalledTimes(1);
	expect(state.deleteSupplier).not.toHaveBeenCalled();
});
it('deletes an unused supplier in its own company and notifies the parent', async () => {
	const close = jest.fn(),
		deleted = jest.fn();
	await render(
		<LogistiqueSupplierDeleteDialog
			supplier={{ ...logisticsSupplier, total_dossiers: 0 }}
			onClose={close}
			onDeleted={deleted}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(state.deleteSupplier).toHaveBeenCalledWith({ id: 9, company_id: 5 }));
	expect(state.onSuccess).toHaveBeenCalledWith(t.logistique.supplierDeleted);
	expect(close).toHaveBeenCalledTimes(1);
	expect(deleted).toHaveBeenCalledTimes(1);
});
it('keeps the dialog open after a failed request so the user can retry', async () => {
	state.deleteSupplier.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { detail: 'Supplier is in use' } }),
	});
	const close = jest.fn();
	await render(
		<LogistiqueSupplierDeleteDialog supplier={{ ...logisticsSupplier, total_dossiers: 0 }} onClose={close} />,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(state.onError).toHaveBeenCalled());
	expect(close).not.toHaveBeenCalled();
});
