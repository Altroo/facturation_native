import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import CustomAutoCompleteSelect from './customAutoCompleteSelect';
import { translations } from '@/translations';
import type { DropDownType } from '@/types/accountTypes';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const items: DropDownType[] = [
	{ value: '1', code: 'Sara User' },
	{ value: '2', code: 'Sara User' },
	{ value: '3', code: 'Ali', archived: true },
];
const longItems: DropDownType[] = [
	...items,
	...Array.from({ length: 4 }, (_, index) => ({ value: String(index + 4), code: 'Person ' + index })),
];
it('clears a dismissed dropdown search before reopening without selecting an option', async () => {
	const onChange = jest.fn();
	await render(
		<CustomAutoCompleteSelect
			label="Gestionnaire"
			items={longItems}
			value={null}
			noOptionsText="Aucun résultat"
			onChange={onChange}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	await fireEvent.changeText(screen.getByLabelText(translations.fr.common.search), 'Missing');
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	expect(screen.queryByRole('radio')).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	expect(screen.getByLabelText(translations.fr.common.search)).toHaveProp('value', '');
	expect(screen.getAllByRole('radio')).toHaveLength(longItems.length);
});
it('shows small choice lists inline without a search box or close button', async () => {
	await render(
		<CustomAutoCompleteSelect label="Gestionnaire" items={items} value={null} noOptionsText="Aucun résultat" />,
	);
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	expect(screen.getAllByRole('radio')).toHaveLength(items.length);
	expect(screen.queryByLabelText(translations.fr.common.search)).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.common.close })).toBeNull();
});
it('returns the selected object and keeps duplicate displayed names separate by value', async () => {
	const onChange = jest.fn();
	const Example = () => {
		const [value, setValue] = useState<DropDownType | null>(items[0]);
		return (
			<CustomAutoCompleteSelect
				label="Gestionnaire"
				items={items}
				value={value}
				noOptionsText="Aucun résultat"
				onChange={(_event, next) => {
					onChange(next);
					setValue(next);
				}}
			/>
		);
	};
	await render(<Example />);
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	const duplicates = screen.getAllByRole('radio', { name: 'Sara User' });
	expect(duplicates[0]).toBeChecked();
	expect(duplicates[1]).not.toBeChecked();
	await fireEvent.press(duplicates[1]);
	expect(onChange).toHaveBeenCalledWith(items[1]);
	expect(screen.queryByRole('radio')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	expect(screen.getAllByRole('radio', { name: 'Sara User' })[1]).toBeChecked();
});
it('filters original code labels, keeps archived labels, and shows the caller empty message', async () => {
	await render(
		<CustomAutoCompleteSelect label="Gestionnaire" items={longItems} value={null} noOptionsText="Aucun résultat" />,
	);
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	await fireEvent.changeText(screen.getByLabelText(translations.fr.common.search), 'ALI');
	expect(screen.getAllByRole('radio')).toHaveLength(1);
	expect(screen.getByRole('radio', { name: 'Ali (' + translations.fr.common.archived + ')' })).toBeOnTheScreen();
	await fireEvent.changeText(screen.getByLabelText(translations.fr.common.search), 'Missing');
	expect(screen.queryByRole('radio')).toBeNull();
	expect(screen.getByText('Aucun résultat')).toBeOnTheScreen();
});
it('keeps start/end accessories and prevents disabled selection', async () => {
	const onChange = jest.fn();
	await render(
		<CustomAutoCompleteSelect
			label="Gestionnaire"
			items={items}
			value={items[0]}
			noOptionsText="Aucun résultat"
			disabled
			onChange={onChange}
			startIcon={<Text>Start</Text>}
			endIcon={<Text>End</Text>}
		/>,
	);
	expect(screen.getByText('Start')).toBeOnTheScreen();
	expect(screen.getByText('End')).toBeOnTheScreen();
	const input = screen.getByRole('button', { name: 'Gestionnaire' });
	expect(input).toBeDisabled();
	await fireEvent.press(input);
	expect(screen.queryByRole('radio')).toBeNull();
	expect(onChange).not.toHaveBeenCalled();
});

it('clears the selected object to null without selecting a different option', async () => {
	const onChange = jest.fn();
	const Example = () => {
		const [value, setValue] = useState<DropDownType | null>(items[0]);
		return (
			<CustomAutoCompleteSelect
				label="Gestionnaire"
				items={items}
				value={value}
				noOptionsText="Aucun résultat"
				onChange={(_event, next) => {
					onChange(next);
					setValue(next);
				}}
			/>
		);
	};
	await render(<Example />);
	await fireEvent.press(screen.getByRole('button', { name: 'Gestionnaire' }));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.reset }));
	expect(onChange).toHaveBeenCalledWith(null);
	expect(screen.getByText(translations.fr.common.selectValue)).toBeOnTheScreen();
	expect(screen.queryByRole('radio')).toBeNull();
});

it('renders the required marker without changing the accessible selection label', async () => {
	await render(
		<CustomAutoCompleteSelect label="Utilisateur" required items={[]} value={null} noOptionsText="Aucun résultat" />,
	);
	expect(screen.getByText('Utilisateur *')).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: 'Utilisateur' })).toBeOnTheScreen();
});

describe('CustomAutocompleteSelect', () => {
	const items: DropDownType[] = [
		{ value: '1', code: 'Alice' },
		{ value: '2', code: 'Bob' },
	];
	it('preserves renderOption(props, option) and onChange(event, value)', async () => {
		const onChange = jest.fn();
		const event = { nativeEvent: { target: 1 } };
		await render(
			<CustomAutoCompleteSelect
				label="User"
				items={items}
				value={null}
				noOptionsText="None"
				onChange={onChange}
				renderOption={({ key, ...props }, option) => (
					<Pressable key={key} {...props}>
						<Text>{option.code}</Text>
					</Pressable>
				)}
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'User' }));
		await fireEvent.press(screen.getByRole('radio', { name: 'Bob' }), event);
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ nativeEvent: expect.objectContaining(event.nativeEvent) }),
			items[1],
		);
	});
	it('renders label and initial value', async () => {
		await render(
			<CustomAutoCompleteSelect
				id="test"
				label="User"
				noOptionsText="Aucun utilisateur trouvé"
				items={items}

				value={items[0]}
				onChange={() => {}}
			/>,
		);

		expect(screen.getByLabelText('User')).toBeOnTheScreen();
		expect(screen.getByText('Alice')).toBeOnTheScreen();
	});

	it('shows options when opened and calls onChange on selection', async () => {
		const handleChange = jest.fn();
		await render(
			<CustomAutoCompleteSelect
				id="test"
				label="User"
				noOptionsText="Aucun utilisateur trouvé"
				items={items}

				value={null}
				onChange={handleChange}
			/>,
		);

		const input = screen.getByRole('button', { name: 'User' });
		await fireEvent.press(input); // open the dropdown

		const option = screen.getByText('Bob');
		await fireEvent.press(option);

		expect(handleChange).toHaveBeenCalledTimes(1);
		// Preserve the original event/newValue argument positions.
		const [, newValue] = handleChange.mock.calls[0];
		expect(newValue).toEqual(items[1]);
	});

	it('renders start and end icons when provided', async () => {
		const StartIcon = () => <Text testID="start-icon">S</Text>;
		const EndIcon = () => <Text testID="end-icon">E</Text>;

		await render(
			<CustomAutoCompleteSelect
				id="test"
				label="User"
				noOptionsText="Aucun utilisateur trouvé"
				items={items}

				value={null}
				startIcon={<StartIcon />}
				endIcon={<EndIcon />}
				onChange={() => {}}
			/>,
		);

		expect(screen.getByTestId('start-icon')).toBeOnTheScreen();
		expect(screen.getByTestId('end-icon')).toBeOnTheScreen();
	});

	it('disables interaction when disabled prop is true', async () => {
		const handleChange = jest.fn();
		await render(
			<CustomAutoCompleteSelect
				id="test"
				label="User"
				noOptionsText="Aucun utilisateur trouvé"
				items={items}

				value={null}
				disabled
				onChange={handleChange}
			/>,
		);

		const input = screen.getByRole('button', { name: 'User' });
		await fireEvent.press(input);
		// dropdown should not open
		expect(screen.queryByText('Alice')).not.toBeOnTheScreen();
		expect(handleChange).not.toHaveBeenCalled();
	});
	it('renders noOptionsText when there are no items', async () => {
		await render(
			<CustomAutoCompleteSelect
				id="test"
				label="User"
				noOptionsText="Aucun utilisateur trouvé"
				items={[]} // empty list

				value={null}
				onChange={() => {}}
			/>,
		);
		// open the dropdown
		const input = screen.getByRole('button', { name: 'User' });
		await fireEvent.press(input);
		// expect the noOptionsText to be shown
		expect(screen.getByText('Aucun utilisateur trouvé')).toBeOnTheScreen();
	});
});
