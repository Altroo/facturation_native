import {
	logistiqueScreen as state,
	resetLogistiqueScreen,
	syncLogistiqueScreen,
	logisticsSupplier,
} from '@/__tests__/logistiqueScreenSetup';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Page from '@/app/(app)/(drawer)/logistique/fournisseurs/form';
import { useGetLogistiqueSupplierQuery } from '@/store/services/logistique';
import { translations } from '@/translations';
import { LOGISTIQUE_SUPPLIER_VIEW } from '@/utils/routes';

const t = translations.fr;
beforeEach(async () => {
	await resetLogistiqueScreen();
	state.params = { company_id: '5' };
	await syncLogistiqueScreen();
});

it('creates a supplier with all web fields, trimming text and preserving multiple brands', async () => {
	await render(<Page />);
	await fireEvent.press(screen.getByRole('button', { name: t.logistique.fieldBrands }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Atlas Brand' }));
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Iberia Brand' }));
	await fireEvent.press(screen.getByRole('button', { name: 'Close sheet' }));
	await fireEvent.changeText(screen.getByLabelText(t.logistique.supplierName), '  Maison Mobile  ');
	await fireEvent.changeText(screen.getByLabelText(t.logistique.colSupplierEmail), ' contact@example.invalid ');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() =>
		expect(state.addSupplier).toHaveBeenCalledWith({
			company_id: 5,
			nom: 'Maison Mobile',
			email: 'contact@example.invalid',
			marques: [2, 3],
		}),
	);
	expect(state.editSupplier).not.toHaveBeenCalled();
	expect(state.onSuccess).toHaveBeenCalledWith(t.logistique.supplierSaved);
	expect(router.dismissTo).toHaveBeenCalledWith(LOGISTIQUE_SUPPLIER_VIEW(20, 5));
});
it('prefills editing and saves through PUT without losing selected brands', async () => {
	state.params = { id: '9', company_id: '5' };
	await syncLogistiqueScreen();
	await render(<Page />);
	expect(screen.getByDisplayValue(logisticsSupplier.nom)).toBeOnTheScreen();
	expect(screen.getByText('Atlas Brand')).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(t.logistique.supplierName), 'Updated supplier');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() =>
		expect(state.editSupplier).toHaveBeenCalledWith({
			id: 9,
			company_id: 5,
			nom: 'Updated supplier',
			email: logisticsSupplier.email,
			marques: [2],
		}),
	);
	expect(state.addSupplier).not.toHaveBeenCalled();
});
it('requires a name, accepts an optional email, and rejects invalid emails', async () => {
	await render(<Page />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(screen.getByText(t.logistique.supplierRequired)).toBeOnTheScreen());
	expect(state.addSupplier).not.toHaveBeenCalled();
	await fireEvent.changeText(screen.getByLabelText(t.logistique.supplierName), 'Supplier');
	await fireEvent.changeText(screen.getByLabelText(t.logistique.colSupplierEmail), 'invalid-email');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(screen.getByText(t.logistique.supplierInvalidEmail)).toBeOnTheScreen());
	expect(state.addSupplier).not.toHaveBeenCalled();
});
it.each(['Commercial', 'Logistique'])('allows the web supplier manager role %s', async (role) => {
	state.role = role;
	await syncLogistiqueScreen();
	await render(<Page />);
	expect(screen.getByLabelText(t.logistique.supplierName)).toBeOnTheScreen();
});
it('blocks readers and does not fetch a supplier for unauthorized editing', async () => {
	state.role = 'Lecture';
	state.params = { id: '9', company_id: '5' };
	await syncLogistiqueScreen();
	await render(<Page />);
	expect(screen.queryByLabelText(t.logistique.supplierName)).toBeNull();
	expect(useGetLogistiqueSupplierQuery).toHaveBeenCalledWith(
		expect.anything(),
		expect.objectContaining({ skip: true }),
	);
});
it('rejects invalid route parameters and foreign-company responses', async () => {
	state.params = { id: 'invalid', company_id: '5' };
	await syncLogistiqueScreen();
	const view = await render(<Page />);
	expect(screen.getByText(t.notFound.message)).toBeOnTheScreen();
	state.params = { id: '9', company_id: '5' };
	state.supplierDetail.currentData = { ...logisticsSupplier, company: 99 };
	await syncLogistiqueScreen();
	await view.rerender(<Page />);
	expect(screen.queryByLabelText(t.logistique.supplierName)).toBeNull();
});
it('shows a recoverable save error and keeps the entered values', async () => {
	state.addSupplier.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { nom: ['Supplier already exists'] } }),
	});
	await render(<Page />);
	await fireEvent.changeText(screen.getByLabelText(t.logistique.supplierName), 'Keep this name');
	await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
	await waitFor(() => expect(state.onError).toHaveBeenCalled());
	expect(screen.getByDisplayValue('Keep this name')).toBeOnTheScreen();
	expect(router.dismissTo).not.toHaveBeenCalled();
});
