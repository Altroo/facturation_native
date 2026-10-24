import { useState } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CustomDateInput from './customDateInput';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@react-native-community/datetimepicker', () => 'DatePicker');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		language: 'fr',
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
	}),
}));
jest.mock('@/components/nativeElements/modals/bottomSheet/bottomSheet', () => {
	const { View, Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	return function Sheet(props: { title: string; children: React.ReactNode; onClose: () => void }) {
		return (
			<View testID="date-sheet">
				<Text>{props.title}</Text>
				{props.children}
				<Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={props.onClose}>
					<Text>Fermer</Text>
				</Pressable>
			</View>
		);
	};
});
const change = jest.fn();

it('shows a date validation error without committing a picker draft', async () => {
	await render(<CustomDateInput label="Date" value="" onChange={change} error helperText="Date required" />);
	expect(screen.getByText('Date required')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	await fireEvent(screen.getByTestId('date-picker-Date'), 'valueChange', {}, new Date(2026, 0, 2, 12));
	expect(change).not.toHaveBeenCalled();
});
const Field = (props: { initialValue?: string; minimumDate?: string; maximumDate?: string }) => {
	const [value, setValue] = useState(props.initialValue ?? '');
	return (
		<CustomDateInput
			label="Date"
			value={value}
			minimumDate={props.minimumDate}
			maximumDate={props.maximumDate}
			onChange={(selected) => {
				setValue(selected);
				change(selected);
			}}
		/>
	);
};
beforeEach(() => {
	change.mockReset();
	jest.replaceProperty(Platform, 'OS', 'ios');
});
afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

it('keeps the iOS picker outside a narrow field, follows dark mode, and returns a local calendar date', async () => {
	await render(<Field />);
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	expect(screen.getByTestId('date-sheet')).toBeOnTheScreen();
	expect(screen.getByTestId('date-picker-Date')).toHaveProp('themeVariant', 'dark');
	await fireEvent(screen.getByTestId('date-picker-Date'), 'valueChange', {}, new Date(2026, 0, 2, 12));
	expect(change).not.toHaveBeenCalled();
	expect(screen.queryByText('02/01/2026')).toBeNull();
	expect(screen.getByText(translations.fr.common.selectValue)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.done }));
	expect(change).toHaveBeenCalledTimes(1);
	expect(change).toHaveBeenCalledWith('2026-01-02');
	expect(screen.queryByTestId('date-sheet')).toBeNull();
	expect(screen.getByText('02/01/2026')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: `${translations.fr.common.reset} (Date)` }));
	expect(change).toHaveBeenLastCalledWith('');
});

it('confirms the initially displayed date when the iOS wheel has not moved', async () => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date(2026, 9, 21, 12));
	await render(<Field />);
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	expect(screen.getByTestId('date-picker-Date')).toHaveProp('value', new Date(2026, 9, 21, 12));
	expect(change).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.done }));
	expect(change).toHaveBeenCalledWith('2026-10-21');
	expect(screen.getByText('21/10/2026')).toBeOnTheScreen();
	expect(screen.queryByTestId('date-sheet')).toBeNull();
});

it('reopens on the committed date and can confirm it without moving the wheel', async () => {
	await render(<Field initialValue="2026-01-02" />);
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	expect(screen.getByTestId('date-picker-Date')).toHaveProp('value', new Date(2026, 0, 2, 12));
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.done }));
	expect(change).toHaveBeenCalledWith('2026-01-02');
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	expect(screen.getByTestId('date-picker-Date')).toHaveProp('value', new Date(2026, 0, 2, 12));
});

it.each(['', '2026-01-02'])(
	'discards an unconfirmed iOS date and restores the saved value %j on reopening',
	async (initialValue) => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 9, 21, 12));
		await render(<Field initialValue={initialValue} />);
		await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
		await fireEvent(screen.getByTestId('date-picker-Date'), 'valueChange', {}, new Date(2026, 3, 7, 12));
		await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
		expect(change).not.toHaveBeenCalled();
		expect(screen.queryByText('07/04/2026')).toBeNull();
		expect(screen.queryByTestId('date-sheet')).toBeNull();
		expect(screen.getByText(initialValue ? '02/01/2026' : translations.fr.common.selectValue)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
		expect(screen.getByTestId('date-picker-Date')).toHaveProp(
			'value',
			initialValue ? new Date(2026, 0, 2, 12) : new Date(2026, 9, 21, 12),
		);
	},
);

it('uses the Android dialog directly and leaves the value unchanged on cancellation', async () => {
	jest.replaceProperty(Platform, 'OS', 'android');
	await render(<Field />);
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	expect(screen.queryByTestId('date-sheet')).toBeNull();
	await fireEvent(screen.getByTestId('date-picker-Date'), 'dismiss');
	expect(change).not.toHaveBeenCalled();
	expect(screen.queryByTestId('date-picker-Date')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
	await fireEvent(screen.getByTestId('date-picker-Date'), 'valueChange', {}, new Date(2026, 0, 3, 12));
	expect(change).toHaveBeenCalledWith('2026-01-03');
	expect(screen.queryByTestId('date-picker-Date')).toBeNull();
});

it('does not open a disabled field and safely handles an invalid external value', async () => {
	await render(<CustomDateInput label="Date" value="invalid" onChange={change} disabled />);
	expect(screen.getByRole('button', { name: 'Date' })).toBeDisabled();
	expect(screen.getByText(translations.fr.common.selectValue)).toBeOnTheScreen();
	expect(change).not.toHaveBeenCalled();
});

describe.each(['ios', 'android'] as const)('%s date limits', (platform) => {
	it('disables dates outside the supplied range and allows an inclusive boundary', async () => {
		jest.replaceProperty(Platform, 'OS', platform);
		await render(<Field initialValue="2026-01-03" minimumDate="2026-01-02" maximumDate="2026-01-04" />);
		await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
		const picker = screen.getByTestId('date-picker-Date');
		expect(picker).toHaveProp('minimumDate', new Date(2026, 0, 2, 12));
		expect(picker).toHaveProp('maximumDate', new Date(2026, 0, 4, 12));
		await fireEvent(picker, 'valueChange', {}, new Date(2026, 0, 2, 12));
		if (platform === 'ios') {
			expect(change).not.toHaveBeenCalled();
			await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.done }));
		}
		expect(change).toHaveBeenCalledWith('2026-01-02');
	});

	it.each([
		{ minimumDate: '2027-01-02', maximumDate: undefined, expected: '2027-01-02' },
		{ minimumDate: undefined, maximumDate: '2025-01-02', expected: '2025-01-02' },
	])('starts an empty field inside its allowed range: $expected', async ({ minimumDate, maximumDate, expected }) => {
		jest.replaceProperty(Platform, 'OS', platform);
		jest.useFakeTimers();
		jest.setSystemTime(new Date(2026, 9, 21, 12));
		await render(<Field minimumDate={minimumDate} maximumDate={maximumDate} />);
		await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
		expect(screen.getByTestId('date-picker-Date')).toHaveProp('value', new Date(expected + 'T12:00:00'));
		if (platform === 'ios') await fireEvent.press(screen.getByRole('button', { name: translations.fr.dataGrid.done }));
		else await fireEvent(screen.getByTestId('date-picker-Date'), 'valueChange', {}, new Date(expected + 'T12:00:00'));
		expect(change).toHaveBeenCalledWith(expected);
	});
});
