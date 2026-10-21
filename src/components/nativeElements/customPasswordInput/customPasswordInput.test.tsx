import { createRef } from 'react';
import type { TextInputInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomPasswordInput from './customPasswordInput';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
it('starts masked and uses the original visibility label without changing the password', async () => {
	const onChangeText = jest.fn();
	await render(<CustomPasswordInput label="Mot de passe" value="Secret123!" onChangeText={onChangeText} />);
	const input = screen.getByLabelText('Mot de passe');
	expect(input).toHaveProp('secureTextEntry', true);
	expect(input).toHaveProp('autoCorrect', false);
	expect(input).toHaveProp('autoCapitalize', 'none');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.togglePasswordVisibility }));
	expect(input).toHaveProp('secureTextEntry', false);
	expect(input).toHaveProp('value', 'Secret123!');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.togglePasswordVisibility }));
	expect(input).toHaveProp('secureTextEntry', true);
	expect(onChangeText).not.toHaveBeenCalled();
});
it('forwards native editing and blur, and announces boolean error/helperText', async () => {
	const onChangeText = jest.fn(),
		onBlur = jest.fn();
	await render(
		<CustomPasswordInput
			label="Mot de passe"
			value=""
			onChangeText={onChangeText}
			onBlur={onBlur}
			error
			helperText="Mot de passe requis"
		/>,
	);
	const input = screen.getByLabelText('Mot de passe');
	await fireEvent.changeText(input, 'Example123!');
	await fireEvent(input, 'blur', { nativeEvent: { text: 'Example123!' } });
	expect(onChangeText).toHaveBeenCalledWith('Example123!');
	expect(onBlur).toHaveBeenCalledTimes(1);
	expect(screen.getByRole('alert')).toHaveTextContent('Mot de passe requis');
});
it('uses disabled to prevent native editing', async () => {
	const onChangeText = jest.fn();
	await render(<CustomPasswordInput label="Mot de passe" value="Saved" disabled onChangeText={onChangeText} />);
	const input = screen.getByLabelText('Mot de passe');
	expect(input).toHaveProp('editable', false);
	await fireEvent.changeText(input, 'Other');
	expect(onChangeText).not.toHaveBeenCalled();
	const toggle = screen.getByRole('button', { name: translations.fr.common.togglePasswordVisibility });
	expect(toggle).toBeDisabled();
	await fireEvent.press(toggle);
	expect(input).toHaveProp('secureTextEntry', true);
});

describe('CustomPasswordInput', () => {
	it('passes its ref to the password input', async () => {
		const ref = createRef<TextInputInstance>();
		await render(
			<CustomPasswordInput ref={ref} id="password-input" value="" label="Password" onChangeText={() => {}} />,
		);
		expect(ref.current).not.toBeNull();
		expect(typeof ref.current?.focus).toBe('function');
	});

	it('renders with label and placeholder', async () => {
		await render(
			<CustomPasswordInput
				id="password-input"
				value=""
				label="Password"
				placeholder="Enter password"
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByLabelText('Password')).toBeOnTheScreen();
		expect(screen.getByPlaceholderText('Enter password')).toBeOnTheScreen();
	});

	it('displays helper text when provided', async () => {
		await render(
			<CustomPasswordInput
				id="password-input"
				value=""
				label="Password"
				helperText="Must be at least 8 characters"
				onChangeText={() => {}}
			/>,
		);

		expect(screen.getByText('Must be at least 8 characters')).toBeOnTheScreen();
	});

	it('renders as disabled when disabled is true', async () => {
		await render(
			<CustomPasswordInput id="password-input" value="" label="Password" disabled onChangeText={() => {}} />,
		);

		expect(screen.getByLabelText('Password')).toBeDisabled();
	});

	it('calls onChange when input changes', async () => {
		const handleChange = jest.fn();

		await render(<CustomPasswordInput id="password-input" value="" label="Password" onChangeText={handleChange} />);

		const input = screen.getByLabelText('Password');
		await fireEvent.changeText(input, 'secret');

		expect(handleChange).toHaveBeenCalled();
	});

	it('toggles password visibility when icon is clicked', async () => {
		await render(<CustomPasswordInput id="password-input" value="secret" label="Password" onChangeText={() => {}} />);

		const input = screen.getByLabelText('Password');
		expect(input).toHaveProp('secureTextEntry', true);

		const toggleButton = screen.getByLabelText('Basculer la visibilité du mot de passe');
		await fireEvent.press(toggleButton);

		expect(input).toHaveProp('secureTextEntry', false);
	});
});
