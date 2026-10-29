import { createRef } from 'react';
import type { TextInputInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import CustomTextInput from './customTextInput';
import AiAssistantControl from '@/components/shared/aiAssistantControl/aiAssistantControl';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/components/shared/aiAssistantControl/aiAssistantControl', () => ({
	__esModule: true,
	default: jest.fn(() => null),
}));

describe('CustomTextInput', () => {
	it('connects eligible native field identifiers to the same assistant without bypassing Formik', async () => {
		jest.mocked(AiAssistantControl).mockClear();
		const onChangeText = jest.fn();
		await render(
			<CustomTextInput
				nativeID="designation"
				label="Designation"
				value="Source"
				maxLength={120}
				aiContext="article"
				onChangeText={onChangeText}
			/>,
		);
		expect(AiAssistantControl).toHaveBeenCalled();
		const props = jest.mocked(AiAssistantControl).mock.calls[0][0];
		expect(props).toMatchObject({ value: 'Source', context: 'article', maxLength: 120 });
		props.onApply('Suggestion');
		expect(onChangeText).toHaveBeenCalledWith('Suggestion');
	});

	it.each([
		{ nativeID: 'email', keyboardType: 'email-address' as const },
		{ nativeID: 'designation', disabled: true },
		{ nativeID: 'designation', readOnly: true },
		{ nativeID: 'designation', secureTextEntry: true },
		{ nativeID: 'designation', ai: false },
		{ nativeID: 'designation', keyboardType: 'numeric' as const },
	])('excludes identifiers, locked fields, passwords and explicit opt-outs: %j', async (props) => {
		jest.mocked(AiAssistantControl).mockClear();
		await render(<CustomTextInput {...props} value="Source" onChangeText={jest.fn()} />);
		expect(AiAssistantControl).not.toHaveBeenCalled();
	});

	it('shows the original required marker without changing the input accessible name', async () => {
		await render(<CustomTextInput label="Email" required value="" />);
		expect(screen.getByText('Email *')).toBeOnTheScreen();
		expect(screen.getByLabelText('Email')).toHaveProp('value', '');
	});

	it('labels the input and forwards editing, blur and native input options', async () => {
		const onChangeText = jest.fn();
		const onBlur = jest.fn();
		await render(
			<CustomTextInput
				label="Email"
				value=""
				placeholder="Email professionnel"
				keyboardType="email-address"
				maxLength={120}
				onChangeText={onChangeText}
				onBlur={onBlur}
			/>,
		);
		const input = screen.getByLabelText('Email');
		expect(screen.getByPlaceholderText('Email professionnel')).toBe(input);
		expect(input).toHaveProp('keyboardType', 'email-address');
		expect(input).toHaveProp('maxLength', 120);
		await fireEvent.changeText(input, 'user@example.invalid');
		await fireEvent(input, 'blur', { nativeEvent: { text: 'user@example.invalid' } });
		expect(onChangeText).toHaveBeenCalledWith('user@example.invalid');
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it('keeps boolean error separate from helperText and restores normal helper feedback after correction', async () => {
		const view = await render(<CustomTextInput label="Email" value="invalid" error helperText="Email invalide" />);
		expect(screen.getByRole('alert')).toHaveTextContent('Email invalide');
		expect(screen.getByLabelText('Email')).toHaveProp('value', 'invalid');
		await view.rerender(
			<CustomTextInput
				label="Email"
				value="valid@example.invalid"
				error={false}
				helperText="Utilisez votre email professionnel"
			/>,
		);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByText('Utilisez votre email professionnel')).toBeOnTheScreen();
	});

	it('prevents editing with disabled and keeps original startIcon/endIcon accessories visible', async () => {
		const onChangeText = jest.fn();
		await render(
			<CustomTextInput
				label="Identifiant"
				value="USER-1"
				disabled
				onChangeText={onChangeText}
				startIcon={<Text>Account icon</Text>}
				endIcon={<Text>Compte vérifié</Text>}
			/>,
		);
		const input = screen.getByLabelText('Identifiant');
		expect(input).toHaveProp('editable', false);
		expect(input).toHaveProp('accessibilityState', { disabled: true });
		await fireEvent.changeText(input, 'OTHER');
		expect(onChangeText).not.toHaveBeenCalled();
		expect(screen.getByText('Account icon')).toBeOnTheScreen();
		expect(screen.getByText('Compte vérifié')).toBeOnTheScreen();
		expect(input).toHaveProp('value', 'USER-1');
	});

	it('supports multiline content without replacing native input options', async () => {
		await render(
			<CustomTextInput label="Adresse" value={'Rue 1\nCasablanca'} multiline numberOfLines={3} textAlign="right" />,
		);
		const input = screen.getByLabelText('Adresse');
		expect(input).toHaveProp('multiline', true);
		expect(input).toHaveProp('numberOfLines', 3);
		expect(input).toHaveProp('textAlign', 'right');
		expect(input).toHaveProp('value', 'Rue 1\nCasablanca');
	});

	it('keeps addresses to two visible lines and remarks to four without truncating their values', async () => {
		await render(
			<>
				<CustomTextInput label="Adresse" multiline numberOfLines={2} value={'Rue 1\nImmeuble A\nCasablanca'} />
				<CustomTextInput label="Remarque" multiline numberOfLines={4} value="Instructions de livraison" />
			</>,
		);
		const address = screen.getByLabelText('Adresse');
		const remark = screen.getByLabelText('Remarque');
		expect(address).toHaveProp('numberOfLines', 2);
		expect(remark).toHaveProp('numberOfLines', 4);
		expect(address).toHaveProp('scrollEnabled', true);
		expect(address).toHaveProp('value', 'Rue 1\nImmeuble A\nCasablanca');
		const addressHeight = address.props.style
			.flat()
			.find((entry: { height?: number } | undefined) => entry?.height)?.height;
		const remarkHeight = remark.props.style
			.flat()
			.find((entry: { height?: number } | undefined) => entry?.height)?.height;
		expect(addressHeight).toBeGreaterThan(48);
		expect(addressHeight).toBeLessThan(remarkHeight);
	});

	it('passes its ref to the input element', async () => {
		const ref = createRef<TextInputInstance>();
		await render(<CustomTextInput ref={ref} id="custom-input" value="" onChangeText={() => {}} />);
		expect(ref.current).not.toBeNull();
		expect(typeof ref.current?.focus).toBe('function');
	});

	it('renders with label and placeholder', async () => {
		await render(
			<CustomTextInput
				id="custom-input"

				value=""
				label="Username"
				placeholder="Enter username"
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByLabelText('Username')).toBeOnTheScreen();
		expect(screen.getByPlaceholderText('Enter username')).toBeOnTheScreen();
	});

	it('displays helper text when provided', async () => {
		await render(
			<CustomTextInput
				id="custom-input"

				value=""
				label="Username"
				helperText="Required field"
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByText('Required field')).toBeOnTheScreen();
	});

	it('renders as disabled when disabled is true', async () => {
		await render(
			<CustomTextInput
				id="custom-input"

				value=""
				label="Username"
				disabled
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByLabelText('Username')).toBeDisabled();
	});

	it('calls onChange when input changes', async () => {
		const handleChange = jest.fn();

		await render(<CustomTextInput id="custom-input" value="" label="Username" onChangeText={handleChange} />);

		const input = screen.getByLabelText('Username');
		await fireEvent.changeText(input, 'Al');

		expect(handleChange).toHaveBeenCalled();
	});

	it('renders with error state when error is true', async () => {
		await render(
			<CustomTextInput
				id="custom-input"

				value=""
				label="Username"
				error
				helperText="Invalid input"
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByText('Invalid input')).toBeOnTheScreen();
		expect(screen.getByRole('alert')).toHaveTextContent('Invalid input');
	});
});
