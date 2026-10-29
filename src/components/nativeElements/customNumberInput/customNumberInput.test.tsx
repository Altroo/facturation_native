import { createRef, useState } from 'react';
import { Platform, type TextInputInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomNumberInput from './customNumberInput';
import { translations } from '@/translations';
import {
	AutocompleteDropdown,
	AutocompleteDropdownContextProvider,
	type IAutocompleteDropdownRef,
} from 'react-native-autocomplete-dropdown';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

describe('CustomNumberInput', () => {
	it.each([false, true])(
		'keeps field taps away from autocomplete outside-blur handling, formatted=%s',
		async (formatted) => {
			const controller = createRef<IAutocompleteDropdownRef>();
			await render(
				<AutocompleteDropdownContextProvider>
					<AutocompleteDropdown controller={controller} dataSet={null} />
					<CustomNumberInput formatted={formatted} label="Quantity" value="12" onChangeText={jest.fn()} />
				</AutocompleteDropdownContextProvider>,
			);
			const blur = jest.spyOn(controller.current!, 'blur');
			const close = jest.spyOn(controller.current!, 'close');
			const event = { stopPropagation: jest.fn() };
			await fireEvent(screen.getByLabelText('Quantity'), 'touchEnd', event);
			expect(blur).not.toHaveBeenCalled();
			expect(close).not.toHaveBeenCalled();
			expect(event.stopPropagation).toHaveBeenCalledTimes(1);
			await fireEvent(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }), 'touchEnd', event);
			expect(event.stopPropagation).toHaveBeenCalledTimes(2);
			expect(blur).not.toHaveBeenCalled();
			// Only the editable row is protected. Labels and other outside taps still
			// reach the provider and close its previous suggestions.
			await fireEvent(screen.getByText('Quantity'), 'touchEnd', event);
			expect(blur).toHaveBeenCalledTimes(1);
			expect(close).toHaveBeenCalledTimes(1);
		},
	);

	it.each([false, true])('keeps the same native input while focusing and editing, formatted=%s', async (formatted) => {
		const ref = createRef<TextInputInstance>();
		const onBlur = jest.fn();
		const Field = () => {
			const [value, setValue] = useState('12');
			const [focused, setFocused] = useState(false);
			return (
				<CustomNumberInput
					ref={ref}
					formatted={formatted}
					label="Quantity"
					value={value}
					onChangeText={setValue}
					onFocus={() => setFocused(true)}
					onBlur={onBlur}
					helperText={focused ? 'Editing' : undefined}
				/>
			);
		};
		await render(<Field />);
		const input = ref.current;
		await fireEvent(screen.getByLabelText('Quantity'), 'focus', { nativeEvent: { text: '12' } });
		expect(ref.current).toBe(input);
		expect(screen.getByLabelText('Quantity')).toHaveProp('keyboardType', 'decimal-pad');
		await fireEvent.changeText(screen.getByLabelText('Quantity'), '123');
		expect(ref.current).toBe(input);
		expect(screen.getByLabelText('Quantity')).toHaveProp('value', '123');
		expect(onBlur).not.toHaveBeenCalled();
	});

	it('keeps formatted quantities in sync with step buttons while focused', async () => {
		const Field = () => {
			const [value, setValue] = useState('999.25');
			return <CustomNumberInput formatted label="Quantity" value={value} onChangeText={setValue} />;
		};
		await render(<Field />);
		await fireEvent(screen.getByLabelText('Quantity'), 'focus', { nativeEvent: { text: '999.25' } });
		await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue('Quantity') }));
		expect(screen.getByLabelText('Quantity')).toHaveProp('value', '1000.25');
		await fireEvent(screen.getByLabelText('Quantity'), 'blur', { nativeEvent: { text: '1000.25' } });
		expect(screen.getByLabelText('Quantity')).toHaveProp('value', '1\u00a0000,25');
		await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Quantity') }));
		expect(screen.getByLabelText('Quantity')).toHaveProp('value', '999,25');
	});

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
		const view = await render(
			<CustomNumberInput label="Discount" value="99,5" onChangeText={onChangeText} max={100} />,
		);
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

	it.each(['ios', 'android'] as const)(
		'supports signed Stock adjustments on %s while preserving the minus draft',
		async (platform) => {
			const platformSpy = jest.replaceProperty(Platform, 'OS', platform);
			const onChangeText = jest.fn();
			await render(<CustomNumberInput label="Adjustment" value="-1,25" min={-1000} onChangeText={onChangeText} />);
			expect(screen.getByLabelText('Adjustment')).toHaveProp(
				'keyboardType',
				platform === 'ios' ? 'numbers-and-punctuation' : 'numeric',
			);
			await fireEvent.changeText(screen.getByLabelText('Adjustment'), '-');
			expect(onChangeText).toHaveBeenLastCalledWith('-');
			await fireEvent.changeText(screen.getByLabelText('Adjustment'), '-2,125');
			expect(onChangeText).toHaveBeenLastCalledWith('-2,125');
			await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Adjustment') }));
			expect(onChangeText).toHaveBeenLastCalledWith('-2,25');
			platformSpy.restore();
		},
	);

	it('keeps the three-decimal receipt minimum when stepping down', async () => {
		const onChangeText = jest.fn();
		await render(<CustomNumberInput label="Receipt" value="1" min={0.001} onChangeText={onChangeText} />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.decreaseValue('Receipt') }));
		expect(onChangeText).toHaveBeenLastCalledWith('0.001');
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
});
