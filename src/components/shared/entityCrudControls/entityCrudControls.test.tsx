import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EntityCrudControls from './entityCrudControls';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
	useToast: () => ({ onError: mockError }),
}));
const t = translations.fr;
const mockError = jest.fn();
const add = jest.fn();
const edit = jest.fn();
const remove = jest.fn();
const onAdd = jest.fn();
const onDelete = jest.fn();
const props = {
	label: 'Ville',
	selectedItem: { value: '2', code: 'Casablanca' },
	addEntity: add,
	editEntity: edit,
	deleteEntity: remove,
	onAddSuccess: onAdd,
	onDeleteSuccess: onDelete,
};
beforeEach(() => {
	jest.clearAllMocks();
	add.mockReturnValue({ unwrap: () => Promise.resolve({ id: 3 }) });
	edit.mockReturnValue({ unwrap: () => Promise.resolve() });
	remove.mockReturnValue({ unwrap: () => Promise.resolve() });
});

it('validates a name, trims it, and returns the new city ID to its parent', async () => {
	await render(<EntityCrudControls {...props} selectedItem={null} />);
	expect(screen.queryByRole('button', { name: `${t.common.update} Ville` })).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.add} Ville` }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	expect(add).not.toHaveBeenCalled();
	expect(screen.getByRole('alert')).toHaveTextContent(t.addEntityModal.requiredError('Ville'));
	await fireEvent.changeText(screen.getByLabelText(t.addEntityModal.fieldLabel('Ville')), '  Rabat  ');
	await fireEvent.press(screen.getByRole('button', { name: t.common.add }));
	await waitFor(() => expect(onAdd).toHaveBeenCalledWith(3));
	expect(add).toHaveBeenCalledWith({ data: { nom: 'Rabat' } });
	expect(screen.queryByTestId('entity-name-sheet')).toBeNull();
});

it('prefills and updates the selected entity', async () => {
	await render(<EntityCrudControls {...props} />);
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.update} Ville` }));
	expect(screen.getByLabelText(t.addEntityModal.fieldLabel('Ville'))).toHaveProp('value', 'Casablanca');
	await fireEvent.changeText(screen.getByLabelText(t.addEntityModal.fieldLabel('Ville')), 'Rabat');
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() => expect(edit).toHaveBeenCalledWith({ id: 2, data: { nom: 'Rabat' } }));
	expect(onAdd).not.toHaveBeenCalled();
});

it('requires confirmation before deleting and lets the parent clear its selected value', async () => {
	await render(<EntityCrudControls {...props} />);
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.delete} Ville` }));
	expect(remove).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
	expect(remove).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.delete} Ville` }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
	await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
	expect(remove).toHaveBeenCalledWith({ id: 2 });
});

it('retains the open editor and entered value on a failed API request', async () => {
	edit.mockReturnValue({
		unwrap: () => Promise.reject({ status: 400, data: { details: { nom: ['City already exists'] } } }),
	});
	await render(<EntityCrudControls {...props} />);
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.update} Ville` }));
	await fireEvent.changeText(screen.getByLabelText(t.addEntityModal.fieldLabel('Ville')), 'Rabat');
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() => expect(mockError).toHaveBeenCalledWith('City already exists'));
	expect(screen.getByLabelText(t.addEntityModal.fieldLabel('Ville'))).toHaveProp('value', 'Rabat');
	expect(screen.getByRole('alert')).toHaveTextContent('City already exists');
});

it('prevents repeated requests and dismissal until the pending save finishes', async () => {
	let finish!: () => void;
	edit.mockReturnValue({
		unwrap: () =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	});
	await render(<EntityCrudControls {...props} />);
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.update} Ville` }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	await waitFor(() => expect(edit).toHaveBeenCalledTimes(1));
	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	expect(screen.getByTestId('entity-name-sheet')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.common.update }));
	expect(edit).toHaveBeenCalledTimes(1);
	await act(async () => finish());
	await waitFor(() => expect(screen.queryByTestId('entity-name-sheet')).toBeNull());
});

it('keeps Add text-only and exposes edit/delete directly only after selection', async () => {
	const { rerender } = await render(<EntityCrudControls {...props} selectedItem={null} />);
	expect(screen.getByRole('button', { name: `${t.common.add} Ville` })).toHaveTextContent(t.common.add);
	expect(screen.container.queryAll((node) => node.props.name === 'add')).toHaveLength(0);
	expect(screen.queryByRole('button', { name: `${t.common.update} Ville` })).toBeNull();
	expect(screen.queryByRole('button', { name: `${t.common.delete} Ville` })).toBeNull();
	await rerender(<EntityCrudControls {...props} />);
	expect(screen.queryByRole('menuitem')).toBeNull();
	expect(screen.getByRole('button', { name: `${t.common.update} Ville` })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: `${t.common.delete} Ville` })).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: `${t.common.moreActions} (Ville)` })).toBeNull();
	expect(edit).not.toHaveBeenCalled();
	expect(remove).not.toHaveBeenCalled();
});
