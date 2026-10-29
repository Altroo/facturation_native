import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CompanyDocumentLivreParField from './companyDocumentLivreParField';
import { AutocompleteDropdownContextProvider, toggleAutocomplete } from '@/__tests__/setupAutocomplete';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onError: jest.fn() }),
}));
jest.mock('@/store/services/parameter', () => ({
	useGetLivreParListQuery: (args: unknown) => mockQuery(args),
	useAddLivreParMutation: () => [mockAdd, {}],
	useEditLivreParMutation: () => [mockEdit, {}],
	useDeleteLivreParMutation: () => [mockDelete, {}],
}));
const mockQuery = jest.fn();
const mockAdd = jest.fn();
const mockEdit = jest.fn();
const mockDelete = jest.fn();
const onChange = jest.fn();
const t = translations.fr;
const props = { companyId: 5, value: 6, onChange, disabled: false, onBlur: jest.fn() };
const setup = () =>
	render(<CompanyDocumentLivreParField {...props} />, { wrapper: AutocompleteDropdownContextProvider });
beforeEach(() => {
	jest.clearAllMocks();
	mockQuery.mockReturnValue({
		currentData: [
			{ id: 6, nom: 'Atlas livraison' },
			{ id: 7, nom: 'Nouveau livreur' },
		],
	});
	mockAdd.mockReturnValue({ unwrap: async () => ({ id: 8 }) });
	mockEdit.mockReturnValue({ unwrap: async () => ({ id: 6 }) });
	mockDelete.mockReturnValue({ unwrap: async () => undefined });
});

describe('CompanyDocumentLivreParField', () => {
	it('scopes choices to the company and passes the selected delivery person ID to the form', async () => {
		await setup();
		expect(mockQuery).toHaveBeenCalledWith({ company_id: 5 });
		await toggleAutocomplete(t.documentForm.livrePar);
		await fireEvent.press(screen.getByRole('radio', { name: 'Nouveau livreur' }));
		expect(onChange).toHaveBeenCalledWith(7);
	});

	it('creates a company-scoped delivery person and selects the returned ID', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: `${t.common.add} ${t.documentForm.livreurLabel}` }));
		await fireEvent.changeText(
			screen.getByLabelText(t.addEntityModal.fieldLabel(t.documentForm.livreurLabel)),
			'Nouveau',
		);
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(onChange).toHaveBeenCalledWith(8));
		expect(mockAdd).toHaveBeenCalledWith({ data: { company: 5, nom: 'Nouveau' } });
	});

	it('clears the selection only after confirmed deletion succeeds', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: `${t.common.delete} ${t.documentForm.livreurLabel}` }));
		expect(mockDelete).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
		expect(mockDelete).toHaveBeenCalledWith({ id: 6 });
	});

	it('renames the selected delivery person within its company without changing the form selection', async () => {
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: `${t.common.update} ${t.documentForm.livreurLabel}` }));
		await fireEvent.changeText(
			screen.getByLabelText(t.addEntityModal.fieldLabel(t.documentForm.livreurLabel)),
			'Atlas Express',
		);
		await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
		await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ id: 6, data: { company: 5, nom: 'Atlas Express' } }));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('shows a retry when delivery people cannot be loaded', async () => {
		const refetch = jest.fn();
		mockQuery.mockReturnValue({ isError: true, error: { status: 500 }, refetch });
		await setup();
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('disables both selection and CRUD actions while the form is submitting', async () => {
		await render(<CompanyDocumentLivreParField {...props} disabled />, {
			wrapper: AutocompleteDropdownContextProvider,
		});
		expect(screen.getByRole('button', { name: `${t.common.add} ${t.documentForm.livreurLabel}` })).toBeDisabled();
		expect(screen.getByRole('button', { name: `${t.common.update} ${t.documentForm.livreurLabel}` })).toBeDisabled();
		expect(screen.getByRole('button', { name: `${t.common.delete} ${t.documentForm.livreurLabel}` })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: `${t.common.add} ${t.documentForm.livreurLabel}` }));
		expect(screen.queryByTestId('entity-name-sheet')).toBeNull();
	});
});
