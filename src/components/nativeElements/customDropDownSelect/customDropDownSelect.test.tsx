import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, Pressable, Text, View } from 'react-native';

import CustomDropDownSelect, { dismissDropDownsOnOutsidePress } from './customDropDownSelect';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const items = [
	{ code: 'H', value: 'Homme' },
	{ code: 'F', value: 'Femme' },
];
it.each(['touchStart', 'pointerDown'] as const)(
	'dismisses on an outside %s without consuming the action',
	async (eventName) => {
		const onOutsidePress = jest.fn();
		const onChange = jest.fn();
		await render(
			<View testID="root" onTouchStart={dismissDropDownsOnOutsidePress} onPointerDown={dismissDropDownsOnOutsidePress}>
				<CustomDropDownSelect label="Sexe" items={items} value="Homme" onChange={onChange} />
				<Pressable accessibilityRole="button" onPress={onOutsidePress}>
					<Text>Outside</Text>
				</Pressable>
			</View>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Sexe' }));
		await fireEvent(screen.getByTestId('root'), eventName, { target: 2, timeStamp: 2 });
		expect(screen.queryByRole('radio')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: 'Outside' }));
		expect(onOutsidePress).toHaveBeenCalledTimes(1);
		expect(onChange).not.toHaveBeenCalled();
	},
);

it.each(['touchStart', 'pointerDown'] as const)(
	'preserves an inside %s so an option can be selected',
	async (eventName) => {
		const onChange = jest.fn();
		await render(
			<View testID="root" onTouchStart={dismissDropDownsOnOutsidePress} onPointerDown={dismissDropDownsOnOutsidePress}>
				<CustomDropDownSelect label="Sexe" items={items} value="Homme" onChange={onChange} />
			</View>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Sexe' }));
		const option = screen.getByRole('radio', { name: 'Femme' });
		// fireEvent stops at the first handler. Forward the same event to the root
		// explicitly to reproduce native bubbling from the option through its field.
		const event = { target: 1, timeStamp: 1 };
		await fireEvent(option, eventName, event);
		await fireEvent(screen.getByTestId('root'), eventName, event);
		expect(option).toBeOnTheScreen();
		await fireEvent.press(option);
		expect(onChange).toHaveBeenCalledWith('Femme');
		expect(screen.queryByRole('radio')).toBeNull();
	},
);

it.each(['touchStart', 'pointerDown'] as const)('closes when the field label receives %s', async (eventName) => {
	const onChange = jest.fn();
	await render(
		<View testID="root" onTouchStart={dismissDropDownsOnOutsidePress} onPointerDown={dismissDropDownsOnOutsidePress}>
			<CustomDropDownSelect label="Type" items={['Factures', 'Paiements']} value="Factures" onChange={onChange} />
		</View>,
	);
	await fireEvent.press(screen.getByRole('button', { name: 'Type' }));
	const event = { target: 4, timeStamp: 2 };
	await fireEvent(screen.getByText('Type'), eventName, event);
	await fireEvent(screen.getByTestId('root'), eventName, event);
	expect(screen.queryByRole('radio')).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
});

it('closes the previous field when another dropdown is touched', async () => {
	await render(
		<View testID="root" onTouchStart={dismissDropDownsOnOutsidePress}>
			<CustomDropDownSelect label="Sexe" items={items} value="Homme" />
			<CustomDropDownSelect label="Rôle" items={['Admin', 'Commercial']} value="Admin" />
		</View>,
	);
	await fireEvent.press(screen.getByRole('button', { name: 'Sexe' }));
	const secondField = screen.getByRole('button', { name: 'Rôle' });
	const event = { target: 3, timeStamp: 3 };
	await fireEvent(secondField, 'touchStart', event);
	await fireEvent(screen.getByTestId('root'), 'touchStart', event);
	await fireEvent.press(secondField);
	expect(screen.queryByRole('radio', { name: 'Femme' })).toBeNull();
	expect(screen.getByRole('radio', { name: 'Commercial' })).toBeOnTheScreen();
});

it('shows option labels while returning stable values without an editable text field', async () => {
	const onChange = jest.fn();
	await render(
		<CustomDropDownSelect
			label="Colonne"
			items={['date_created', 'email']}
			value="date_created"
			getOptionLabel={(value) => (value === 'date_created' ? 'Date de création' : 'Email')}
			onChange={onChange}
		/>,
	);
	expect(screen.getByText('Date de création')).toBeOnTheScreen();
	expect(screen.queryByRole('combobox')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: 'Colonne' }));
	await fireEvent.press(screen.getByRole('radio', { name: 'Email' }));
	expect(onChange).toHaveBeenCalledWith('email');
});
it.each(['ios', 'android', 'web'] as const)('opens inline choices and toggles them closed on %s', async (platform) => {
	const os = jest.replaceProperty(Platform, 'OS', platform);
	try {
		await render(<CustomDropDownSelect label="Sexe" value="Homme" items={items} />);
		const field = screen.getByRole('button', { name: 'Sexe' });
		await fireEvent.press(field);
		expect(screen.getByTestId('dropdown-options')).toBeOnTheScreen();
		expect(screen.getByRole('radio', { name: 'Homme' })).toBeChecked();
		expect(screen.queryByRole('button', { name: translations.fr.common.close })).toBeNull();
		await fireEvent.press(field);
		expect(screen.queryByRole('radio')).toBeNull();
	} finally {
		os.restore();
	}
});
it('selects the original item.value, not its code, and closes after selection', async () => {
	const onChange = jest.fn();
	const Example = () => {
		const [value, setValue] = useState('Homme');
		return (
			<CustomDropDownSelect
				label="Sexe"
				value={value}
				items={items}
				onChange={(next) => {
					onChange(next);
					setValue(next);
				}}
			/>
		);
	};
	await render(<Example />);
	expect(screen.getByText('Homme')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Sexe' }));
	expect(screen.getByRole('radio', { name: 'Homme' })).toBeChecked();
	await fireEvent.press(screen.getByRole('radio', { name: 'Femme' }));
	expect(onChange).toHaveBeenCalledWith('Femme');
	expect(screen.queryByRole('radio')).toBeNull();
	expect(screen.getByText('Femme')).toBeOnTheScreen();
});
it('supports original string options and an empty option', async () => {
	const onChange = jest.fn();
	await render(<CustomDropDownSelect label="Civilité" value="Mme" items={['', 'Mme', 'M.']} onChange={onChange} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Civilité' }));
	await fireEvent.press(screen.getByRole('radio', { name: translations.fr.common.selectValue }));
	expect(onChange).toHaveBeenCalledWith('');
});

it('displays a named empty option such as no discount instead of an unfinished placeholder', async () => {
	const onChange = jest.fn();
	await render(
		<CustomDropDownSelect
			label="Remise"
			items={['', 'Pourcentage']}
			value=""
			getOptionLabel={(value) => value || 'Aucune'}
			onChange={onChange}
		/>,
	);
	expect(screen.getByText('Aucune')).toBeOnTheScreen();
	expect(screen.queryByText(translations.fr.common.selectValue)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: 'Remise' }));
	expect(screen.getByRole('radio', { name: 'Aucune' })).toBeChecked();
	await fireEvent.press(screen.getByRole('radio', { name: 'Aucune' }));
	expect(onChange).toHaveBeenCalledWith('');
});
it('separates helper text from error state and renders an empty list', async () => {
	const view = await render(
		<CustomDropDownSelect label="Entreprise" value={null} items={[]} error helperText="Entreprise requise" />,
	);
	expect(screen.getByRole('alert')).toHaveTextContent('Entreprise requise');
	await fireEvent.press(screen.getByRole('button', { name: 'Entreprise' }));
	expect(screen.getByText(translations.fr.common.noOptions)).toBeOnTheScreen();
	await view.rerender(
		<CustomDropDownSelect label="Entreprise" value={null} items={[]} helperText="Choisissez une entreprise" />,
	);
	expect(screen.queryByRole('alert')).toBeNull();
	expect(screen.getByText('Choisissez une entreprise')).toBeOnTheScreen();
});
it('prevents opening a disabled selector and preserves an unknown saved value', async () => {
	const onChange = jest.fn();
	await render(<CustomDropDownSelect label="Rôle" value="Legacy" items={items} disabled onChange={onChange} />);
	expect(screen.getByText('Legacy')).toBeOnTheScreen();
	const input = screen.getByRole('button', { name: 'Rôle' });
	expect(input).toBeDisabled();
	await fireEvent.press(input);
	expect(screen.queryByRole('radio')).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
});

it('renders the required marker without changing the accessible selection label', async () => {
	await render(<CustomDropDownSelect label="Rôle" required items={[]} value="" />);
	expect(screen.getByText('Rôle *')).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: 'Rôle' })).toBeOnTheScreen();
});

it('closes an open selector when disabled and keeps it closed when enabled again', async () => {
	const view = await render(<CustomDropDownSelect label="Rôle" items={items} value="Homme" />);
	await fireEvent.press(screen.getByRole('button', { name: 'Rôle' }));
	expect(screen.getAllByRole('radio')).toHaveLength(items.length);
	await view.rerender(<CustomDropDownSelect label="Rôle" items={items} value="Homme" disabled />);
	expect(screen.getByRole('button', { name: 'Rôle' })).toBeDisabled();
	expect(screen.queryByRole('radio')).toBeNull();
	await view.rerender(<CustomDropDownSelect label="Rôle" items={items} value="Homme" />);
	expect(screen.getByRole('button', { name: 'Rôle' })).toHaveProp('accessibilityState', {
		disabled: false,
		expanded: false,
	});
	expect(screen.queryByRole('radio')).toBeNull();
});

describe('CustomDropDownSelect', () => {
	const mockItems = ['Option A', 'Option B', 'Option C'];
	it('renders label and options', async () => {
		await render(<CustomDropDownSelect id="test-select" label="Test Label" items={mockItems} value="" />);

		expect(screen.getByLabelText('Test Label')).toBeOnTheScreen();
	});

	it('renders selected value', async () => {
		await render(<CustomDropDownSelect id="test-select" label="Test Label" items={mockItems} value="Option B" />);

		expect(screen.getByText('Option B')).toBeOnTheScreen();
	});

	it('calls onChange when selection changes', async () => {
		const handleChange = jest.fn();

		await render(
			<CustomDropDownSelect
				id="test-select"
				label="Test Label"
				items={mockItems}

				value=""
				onChange={handleChange}
			/>,
		);

		await fireEvent.press(screen.getByLabelText('Test Label'));
		await fireEvent.press(screen.getByText('Option B'));

		expect(handleChange).toHaveBeenCalled();
	});

	it('displays helper text when provided', async () => {
		await render(
			<CustomDropDownSelect
				id="test-select"
				label="Test Label"
				items={['One', 'Two']}

				value=""
				helperText="This is a helper"
			/>,
		);

		// Open the dropdown
		await fireEvent.press(screen.getByLabelText('Test Label'));

		// Now assert the helper text
		expect(screen.getByText('This is a helper')).toBeOnTheScreen();
	});

	it('renders disabled select when disabled is true', async () => {
		await render(
			<CustomDropDownSelect
				id="test-select"
				label="Test Label"
				items={['One', 'Two']}

				value=""
				disabled
			/>,
		);

		const select = screen.getByRole('button', { name: 'Test Label' });
		expect(select).toBeDisabled();
	});
});
