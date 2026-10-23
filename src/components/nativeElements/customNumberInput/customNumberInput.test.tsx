import { createRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomNumberInput from './customNumberInput';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

it('preserves decimal keyboard drafts and rejects nonnumeric input', async () => {
	const onChangeText = jest.fn();
	await render(<CustomNumberInput label="Quantity" value="" onChangeText={onChangeText} />);
	const input = screen.getByLabelText('Quantity');
	expect(input).toHaveProp('keyboardType', 'decimal-pad');
	await fireEvent.changeText(input, '1,');
	expect(onChangeText).toHaveBeenLastCalledWith('1,');
	await fireEvent.changeText(input, '1.25');
	expect(onChangeText).toHaveBeenLastCalledWith('1.25');
	await fireEvent.changeText(input, '');
	expect(onChangeText).toHaveBeenLastCalledWith('');
	await fireEvent.changeText(input, '1.2.3');
	await fireEvent.changeText(input, '-1');
	await fireEvent.changeText(input, 'abc');
	expect(onChangeText).toHaveBeenCalledTimes(3);
});

it('steps fractional quantities without floating-point tails or losing the comma separator', async () => {
	const Field = () => {
		const [value, setValue] = useState('1,001');
		return <CustomNumberInput label="Quantity" value={value} onChangeText={setValue} min={0.01} />;
	};
	await render(<Field />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }));
	expect(screen.getByLabelText('Quantity')).toHaveProp('value', '2,001');
	await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') }));
	expect(screen.getByLabelText('Quantity')).toHaveProp('value', '1,001');
	await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') }));
	expect(screen.getByLabelText('Quantity')).toHaveProp('value', '0,01');
	expect(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') })).toBeDisabled();
});

it('bounds discount buttons without hiding typed validation errors', async () => {
	const onChangeText = jest.fn();
	const view = await render(<CustomNumberInput label="Discount" value="99,5" onChangeText={onChangeText} max={100} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Discount') }));
	expect(onChangeText).toHaveBeenLastCalledWith('100');
	await view.rerender(<CustomNumberInput label="Discount" value="100" onChangeText={onChangeText} max={100} />);
	expect(screen.getByRole('button', { name: t.common.increaseValue('Discount') })).toBeDisabled();
	await fireEvent.changeText(screen.getByLabelText('Discount'), '101');
	expect(onChangeText).toHaveBeenLastCalledWith('101');
	await view.rerender(
		<CustomNumberInput label="Discount" value="0" onChangeText={onChangeText} error helperText="Invalid value" />,
	);
	expect(screen.getByRole('button', { name: t.common.decreaseValue('Discount') })).toBeDisabled();
	expect(screen.getByRole('alert')).toHaveTextContent('Invalid value');
});

it('starts empty values and trailing decimal drafts from a finite number', async () => {
	const onChangeText = jest.fn();
	const view = await render(<CustomNumberInput label="Quantity" value="" onChangeText={onChangeText} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }));
	expect(onChangeText).toHaveBeenLastCalledWith('1');
	await view.rerender(<CustomNumberInput label="Quantity" value="2," onChangeText={onChangeText} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }));
	expect(onChangeText).toHaveBeenLastCalledWith('3');
});

it('keeps disabled and read-only inputs locked, and forwards the ref and blur handler', async () => {
	const onChangeText = jest.fn();
	const onBlur = jest.fn();
	const ref = createRef<TextInputInstance>();
	const view = await render(
		<CustomNumberInput ref={ref} label="Quantity" value="5" onChangeText={onChangeText} onBlur={onBlur} disabled />,
	);
	expect(typeof ref.current?.focus).toBe('function');
	expect(screen.getByLabelText('Quantity')).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') }));
	await fireEvent.changeText(screen.getByLabelText('Quantity'), '8');
	expect(onChangeText).not.toHaveBeenCalled();
	await view.rerender(<CustomNumberInput label="Quantity" value="5" onChangeText={onChangeText} readOnly />);
	expect(screen.getByRole('button', { name: t.common.increaseValue('Quantity') })).toBeDisabled();
	expect(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') })).toBeDisabled();
	await view.rerender(<CustomNumberInput label="Quantity" value="5" onChangeText={onChangeText} onBlur={onBlur} />);
	await fireEvent(screen.getByLabelText('Quantity'), 'blur', { nativeEvent: { text: '5' } });
	expect(onBlur).toHaveBeenCalledTimes(1);
});
