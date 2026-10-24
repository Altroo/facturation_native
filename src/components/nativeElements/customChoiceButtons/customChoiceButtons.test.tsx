import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomChoiceButtons from './customChoiceButtons';

const items = [
	{ value: 'fr', label: 'Français' },
	{ value: 'en', label: 'English' },
	{ value: 'nl', label: 'Néerlandais' },
] as const;

it('shows every choice immediately and switches the single selected value in one press', async () => {
	const Harness = () => {
		const [value, setValue] = useState<'fr' | 'en' | 'nl'>('fr');
		return <CustomChoiceButtons label="Language" items={items} value={value} onChange={setValue} columns={3} />;
	};
	await render(<Harness />);
	expect(screen.getAllByRole('radio')).toHaveLength(3);
	expect(screen.getByRole('radio', { name: 'Français' })).toBeChecked();
	await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
	expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
	expect(screen.getByRole('radio', { name: 'Français' })).not.toBeChecked();
});

it('prevents selection while disabled', async () => {
	const onChange = jest.fn();
	await render(<CustomChoiceButtons label="Language" items={items} value="fr" onChange={onChange} disabled />);
	for (const button of screen.getAllByRole('radio')) {
		expect(button).toBeDisabled();
		await fireEvent.press(button);
	}
	expect(onChange).not.toHaveBeenCalled();
});

it('keeps the selection accessible when its visible label is hidden', async () => {
	const onChange = jest.fn();
	await render(
		<CustomChoiceButtons label="Language" items={items} value="fr" onChange={onChange} columns={3} compact hideLabel />,
	);
	expect(screen.queryByText('Language')).not.toBeOnTheScreen();
	expect(screen.getByRole('radio', { name: 'Français' })).toBeChecked();
	expect(screen.getByRole('radio', { name: 'Français' })).toHaveProp('accessibilityHint', 'Language');
	await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
	expect(onChange).toHaveBeenCalledWith('en');
});

it('supports the existing language-only modal immediate actions without a selected value', async () => {
	const onChange = jest.fn();
	await render(<CustomChoiceButtons label="Language" items={items} onChange={onChange} columns={3} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Néerlandais' }));
	expect(onChange).toHaveBeenCalledWith('nl');
});
