import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomCheckbox from './customCheckbox';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it('announces its controlled state and requests the next value on press', async () => {
	const onChange = jest.fn();
	const { rerender } = await render(<CustomCheckbox label="Select record" checked={false} onChange={onChange} />);
	await fireEvent.press(screen.getByRole('checkbox', { name: 'Select record' }));
	expect(onChange).toHaveBeenLastCalledWith(true);
	expect(screen.getByRole('checkbox')).not.toBeChecked();
	await rerender(<CustomCheckbox label="Select record" checked onChange={onChange} />);
	expect(screen.getByRole('checkbox')).toBeChecked();
	await fireEvent.press(screen.getByRole('checkbox'));
	expect(onChange).toHaveBeenLastCalledWith(false);
});

it('keeps a disabled selection visible without allowing changes', async () => {
	const onChange = jest.fn();
	await render(<CustomCheckbox label="Select record" checked disabled onChange={onChange} />);
	expect(screen.getByRole('checkbox')).toBeChecked();
	expect(screen.getByRole('checkbox')).toBeDisabled();
	await fireEvent.press(screen.getByRole('checkbox'));
	expect(onChange).not.toHaveBeenCalled();
});
