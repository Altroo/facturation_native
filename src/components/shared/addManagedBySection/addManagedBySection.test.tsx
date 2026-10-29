import { View } from 'react-native';
import { fireEvent, render as renderComponent, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { AutocompleteDropdownContextProvider, toggleAutocomplete } from '@/__tests__/setupAutocomplete';
import AddManagedBySection, { AddManagedBySectionProps } from './addManagedBySection';
import { translations } from '@/translations';
const render = (ui: ReactElement) => renderComponent(ui, { wrapper: AutocompleteDropdownContextProvider });

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
const onSelectChange = jest.fn();
const onRoleChange = jest.fn();
const onAdd = jest.fn();
const props: AddManagedBySectionProps = {
	title: 'Ajouter un gestionnaire',
	selectId: 'user',
	selectLabel: 'Utilisateur',
	selectItems: [{ code: 'Sara', value: '12' }],
	selectValue: null,
	onSelectChange,
	selectIcon: null,
	roleId: 'role',
	roleLabel: 'Rôle',
	roleOptions: [{ code: 'Lecture', value: 'Lecture' }],
	roleValue: '',
	onRoleChange,
	roleIcon: null,
	onAdd,
	isAddDisabled: true,
};
beforeEach(() => jest.clearAllMocks());

describe('AddManagedBySection', () => {
	it('returns the selected object and role to the form while leaving addition eligibility under form control', async () => {
		const view = await render(<AddManagedBySection {...props} />);
		const event = { nativeEvent: { target: 1 } };
		await toggleAutocomplete('Utilisateur');
		await fireEvent.press(screen.getByRole('radio', { name: 'Sara' }), event);
		expect(onSelectChange).toHaveBeenCalledWith(
			expect.objectContaining({ nativeEvent: expect.objectContaining(event.nativeEvent) }),
			{ code: 'Sara', value: '12' },
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Rôle' }));
		await fireEvent.press(screen.getByRole('radio', { name: 'Lecture' }));
		expect(onRoleChange).toHaveBeenCalledWith('Lecture');
		expect(screen.getByRole('button', { name: translations.fr.common.add })).toBeDisabled();
		await view.rerender(
			<AddManagedBySection {...props} selectValue={props.selectItems[0]} roleValue="Lecture" isAddDisabled={false} />,
		);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.add }));
		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it('blocks all interactions during a pending form submission', async () => {
		await render(<AddManagedBySection {...props} disabled isAddDisabled={false} />);
		for (const button of screen.getAllByRole('button')) {
			expect(button).toBeDisabled();
			await fireEvent.press(button);
		}
		expect(onSelectChange).not.toHaveBeenCalled();
		expect(onRoleChange).not.toHaveBeenCalled();
		expect(onAdd).not.toHaveBeenCalled();
	});

	describe('AddManagedBySection', () => {
		const mockSelectChange = jest.fn();
		const mockRoleChange = jest.fn();
		const mockAddClick = jest.fn();

		const defaultProps: AddManagedBySectionProps = {
			title: 'Ajouter un gestionnaire',
			selectId: 'user-select',
			selectLabel: 'Utilisateur',
			selectItems: [
				{ value: 'Alice', code: 'alice-code' },
				{ value: 'Bob', code: 'bob-code' },
			],
			selectValue: { value: 'Alice', code: 'alice-code' },
			onSelectChange: mockSelectChange,
			selectIcon: <View testID="select-icon" />,

			roleId: 'role-select',
			roleLabel: 'Rôle',
			roleOptions: [
				{ value: 'Caissier', code: 'caissier' },
				{ value: 'Lecture', code: 'lecture' },
			],
			roleValue: 'Caissier',
			onRoleChange: mockRoleChange,
			roleIcon: <View testID="role-icon" />,

			onAdd: mockAddClick,
			isAddDisabled: false,
		};

		it('renders all elements correctly in desktop mode', async () => {
			await render(<AddManagedBySection {...defaultProps} />);

			expect(screen.getByText('Ajouter un gestionnaire')).toBeOnTheScreen();
			expect(screen.getByRole('combobox', { name: 'Utilisateur' })).toBeOnTheScreen();
			expect(screen.getByLabelText('Rôle')).toBeOnTheScreen();
			expect(screen.getByRole('button', { name: 'Ajouter' })).toBeEnabled();
			expect(screen.getByTestId('select-icon')).toBeOnTheScreen();
			expect(screen.getByTestId('role-icon')).toBeOnTheScreen();
		});

		it('disables the add button when isAddDisabled is true', async () => {
			await render(<AddManagedBySection {...defaultProps} isAddDisabled={true} />);
			expect(screen.getByRole('button', { name: 'Ajouter' })).toBeDisabled();
		});

		it('calls onAdd when the button is clicked', async () => {
			await render(<AddManagedBySection {...defaultProps} />);
			await fireEvent.press(screen.getByRole('button', { name: 'Ajouter' }));
			expect(mockAddClick).toHaveBeenCalled();
		});

		it('renders noOptionsText when there are no selectItems', async () => {
			await render(
				<AddManagedBySection
					{...defaultProps}
					selectItems={[]} // empty list
					selectValue={null}
				/>,
			);
			await toggleAutocomplete('Utilisateur');
			expect(screen.getByText('Aucun résultat')).toBeOnTheScreen();
		});
	});
});
