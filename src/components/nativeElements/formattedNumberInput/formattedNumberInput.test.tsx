import { createRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FormattedNumberInput from './formattedNumberInput';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));

describe('FormattedNumberInput', () => {
	it('groups large amounts when not editing, including values refreshed by the parent', async () => {
		const view = await render(<FormattedNumberInput label="Amount" value="300000000" onChangeText={jest.fn()} />);
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '300\u00a0000\u00a0000,00');
		await view.rerender(<FormattedNumberInput label="Amount" value="1234.125" decimals={3} onChangeText={jest.fn()} />);
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '1\u00a0234,125');
	});

	it('accepts pasted grouped amounts and sends unformatted values to the parent', async () => {
		const onChange = jest.fn();
		const Field = () => {
			const [value, setValue] = useState('0');
			return (
				<FormattedNumberInput
					label="Amount"
					value={value}
					onChangeText={(next) => {
						setValue(next);
						onChange(next);
					}}
				/>
			);
		};
		await render(<Field />);
		await fireEvent(screen.getByLabelText('Amount'), 'focus', { nativeEvent: { text: '0' } });
		await fireEvent.changeText(screen.getByLabelText('Amount'), '300 000 000,50');
		expect(onChange).toHaveBeenLastCalledWith('300000000.5');
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '300 000 000,50');
		await fireEvent(screen.getByLabelText('Amount'), 'blur', { nativeEvent: { text: '300 000 000,50' } });
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '300\u00a0000\u00a0000,50');
	});

	it('preserves a trailing decimal separator and empty drafts while editing', async () => {
		const onChange = jest.fn();
		const Field = () => {
			const [value, setValue] = useState('12');
			return (
				<FormattedNumberInput
					label="Amount"
					value={value}
					onChangeText={(next) => {
						setValue(next);
						onChange(next);
					}}
				/>
			);
		};
		await render(<Field />);
		await fireEvent(screen.getByLabelText('Amount'), 'focus', { nativeEvent: { text: '12' } });
		await fireEvent.changeText(screen.getByLabelText('Amount'), '12,');
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '12,');
		expect(onChange).toHaveBeenLastCalledWith('12');
		await fireEvent.changeText(screen.getByLabelText('Amount'), '12,5');
		expect(onChange).toHaveBeenLastCalledWith('12.5');
		await fireEvent.changeText(screen.getByLabelText('Amount'), '');
		expect(onChange).toHaveBeenLastCalledWith('');
		await fireEvent(screen.getByLabelText('Amount'), 'blur', { nativeEvent: { text: '' } });
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '');
	});

	it.each([',', '.'])('keeps the %s separator visible while sending finite decimal prices', async (separator) => {
		const onChange = jest.fn();
		const Field = () => {
			const [value, setValue] = useState('');
			return (
				<FormattedNumberInput
					label="Price"
					value={value}
					onChangeText={(next) => {
						setValue(next);
						onChange(next);
					}}
				/>
			);
		};
		await render(<Field />);
		await fireEvent(screen.getByLabelText('Price'), 'focus', { nativeEvent: { text: '' } });
		for (const [text, expected] of [
			['833', '833'],
			[`833${separator}`, '833'],
			[`833${separator}3`, '833.3'],
			[`833${separator}33`, '833.33'],
		]) {
			await fireEvent.changeText(screen.getByLabelText('Price'), text);
			expect(screen.getByLabelText('Price')).toHaveProp('value', text);
			expect(onChange).toHaveBeenLastCalledWith(expected);
		}
	});

	it('forwards refs, focus and Formik blur handlers without changing the input design', async () => {
		const ref = createRef<TextInputInstance>();
		const onFocus = jest.fn();
		const onBlur = jest.fn();
		await render(
			<FormattedNumberInput
				ref={ref}
				label="Amount"
				value="1000"
				onChangeText={jest.fn()}
				onFocus={onFocus}
				onBlur={onBlur}
			/>,
		);
		expect(typeof ref.current?.focus).toBe('function');
		await fireEvent(screen.getByLabelText('Amount'), 'focus', { nativeEvent: { text: '1000' } });
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '1000');
		await fireEvent(screen.getByLabelText('Amount'), 'blur', { nativeEvent: { text: '1000' } });
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('Amount')).toHaveProp('value', '1\u00a0000,00');
	});
});
