import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import CustomDropDownSelect from './customDropDownSelect';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const items = [
	{ code: 'H', value: 'Homme' },
	{ code: 'F', value: 'Femme' },
];
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
