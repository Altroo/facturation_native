import { useState } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomSwitch from './customSwitch';

it('keeps the parent in control of the value', async () => {
	const Field = () => {
		const [value, setValue] = useState(false);
		return <CustomSwitch label="Active" value={value} onValueChange={setValue} />;
	};
	await render(<Field />);
	expect(screen.getByRole('switch', { name: 'Active' })).not.toBeChecked();
	await fireEvent(screen.getByRole('switch', { name: 'Active' }), 'valueChange', true);
	expect(screen.getByRole('switch', { name: 'Active' })).toBeChecked();
});

it.each([
	{ platform: 'android', value: false },
	{ platform: 'android', value: true },
	{ platform: 'ios', value: false },
	{ platform: 'ios', value: true },
] as const)('keeps the disabled $platform switch at $value without allowing changes', async ({ platform, value }) => {
	const platformSetting = jest.replaceProperty(Platform, 'OS', platform);
	try {
		const onValueChange = jest.fn();
		await render(
			<CustomSwitch label="Stock" value={value} disabled onValueChange={onValueChange} helperText="Read only" />,
		);
		const control = screen.getByRole('switch', { name: 'Stock' });
		expect(control).toBeDisabled();
		if (value) expect(control).toBeChecked();
		else expect(control).not.toBeChecked();
		await fireEvent.press(control);
		expect(onValueChange).not.toHaveBeenCalled();
		expect(screen.getByText('Read only')).toBeOnTheScreen();
	} finally {
		platformSetting.restore();
	}
});
