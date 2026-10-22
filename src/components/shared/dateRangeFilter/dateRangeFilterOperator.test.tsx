import { useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DateRangeFilterInput, { createDateRangeFilterOperator } from './dateRangeFilterOperator';
import type { DateRangeFilterValue } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
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
	const MockBottomSheet = (props: { title: string; children: ReactNode; onClose: () => void }) => (
		<View>
			<Text>{props.title}</Text>
			{props.children}
			<Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={props.onClose}>
				<Text>Fermer</Text>
			</Pressable>
		</View>
	);
	return MockBottomSheet;
});
const t = translations.fr;
const change = jest.fn();
const Example = (props: { initial?: DateRangeFilterValue; disabled?: boolean }) => {
	const [value, setValue] = useState(props.initial ?? {});
	return (
		<DateRangeFilterInput
			value={value}
			disabled={props.disabled}
			onChange={(next) => {
				change(next);
				setValue(next);
			}}
		/>
	);
};

beforeEach(() => {
	jest.useFakeTimers();
	jest.setSystemTime(new Date(2026, 9, 21, 12));
	jest.replaceProperty(Platform, 'OS', 'ios');
	change.mockClear();
});
afterEach(() => {
	jest.restoreAllMocks();
	jest.useRealTimers();
});

it('starts the upper bound at today and commits both dates only after confirming', async () => {
	await render(<Example />);
	expect(screen.getByText('21/10/2026')).toBeOnTheScreen();
	expect(change).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	expect(screen.getByTestId('date-picker-' + t.dateRange.from)).toHaveProp('maximumDate', new Date(2026, 9, 21, 12));
	await fireEvent(screen.getByTestId('date-picker-' + t.dateRange.from), 'valueChange', {}, new Date(2026, 8, 1, 12));
	expect(change).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(change).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-10-21' });
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.to }));
	expect(screen.getByTestId('date-picker-' + t.dateRange.to)).toHaveProp('minimumDate', new Date(2026, 8, 1, 12));
	expect(screen.getByTestId('date-picker-' + t.dateRange.to)).toHaveProp('maximumDate', new Date(2026, 9, 21, 12));
});

it('confirms today without moving the wheel and discards later cancelled changes', async () => {
	await render(<Example />);
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(change).toHaveBeenLastCalledWith({ from: '2026-10-21', to: '2026-10-21' });
	change.mockClear();
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	await fireEvent(screen.getByTestId('date-picker-' + t.dateRange.from), 'valueChange', {}, new Date(2026, 0, 1, 12));
	await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
	expect(change).not.toHaveBeenCalled();
	expect(screen.getAllByText('21/10/2026')).toHaveLength(2);
});

it.each(['ios', 'android'] as const)('prevents inverted and future dates on %s', async (platform) => {
	jest.replaceProperty(Platform, 'OS', platform);
	await render(<Example initial={{ from: '2026-09-01', to: '2026-10-01' }} />);
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	const picker = screen.getByTestId('date-picker-' + t.dateRange.from);
	expect(picker).toHaveProp('maximumDate', new Date(2026, 9, 1, 12));
	await fireEvent(picker, 'valueChange', {}, new Date(2026, 10, 1, 12));
	if (platform === 'ios') await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(change).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-01' });
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.to }));
	await fireEvent(screen.getByTestId('date-picker-' + t.dateRange.to), 'valueChange', {}, new Date(2026, 10, 1, 12));
	if (platform === 'ios') await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.done }));
	expect(change).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-21' });
});

it('allows an explicitly cleared upper bound without restoring a hidden default', async () => {
	await render(<Example initial={{ from: '2026-09-01', to: '2026-10-01' }} />);
	await fireEvent.press(screen.getByRole('button', { name: `${t.common.reset} (${t.dateRange.to})` }));
	expect(change).toHaveBeenLastCalledWith({ from: '2026-09-01', to: '' });
	expect(screen.getByText(t.common.selectValue)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	expect(screen.getByTestId('date-picker-' + t.dateRange.from)).toHaveProp('maximumDate', new Date(2026, 9, 21, 12));
});

it('uses custom labels for the client statement and reflects a changed range', async () => {
	const view = await render(
		<DateRangeFilterInput value={{ from: '2026-09-01' }} onChange={change} fromLabel="Du" toLabel="Au" />,
	);
	expect(screen.getByRole('button', { name: 'Du' })).toBeOnTheScreen();
	expect(screen.getByRole('button', { name: 'Au' })).toBeOnTheScreen();
	await view.rerender(
		<DateRangeFilterInput
			value={{ from: '2026-08-01', to: '2026-08-31' }}
			onChange={change}
			fromLabel="Du"
			toLabel="Au"
		/>,
	);
	expect(screen.getByText('01/08/2026')).toBeOnTheScreen();
	expect(screen.getByText('31/08/2026')).toBeOnTheScreen();
	expect(change).not.toHaveBeenCalled();
});

it('offers one translated server range operator', () => {
	expect(createDateRangeFilterOperator('entre')).toEqual([
		{ value: 'between', label: 'entre', requiresValue: true, apply: expect.any(Function) },
	]);
});
