import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { format } from 'date-fns';
import type { FilterItem, FilterModel } from 'expo-flash-datagrid';
import CustomFilterPanel, { filterHasValue } from './customFilterPanel';
import { getServerFilterOperators } from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons', () => ({ MaterialIcons: 'Icon' }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		language: 'fr',
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
	}),
	useToast: () => ({ onError: jest.fn() }),
}));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
const t = translations.fr;
const change = jest.fn();
const columns = [
	{ field: 'name', headerName: 'Name' },
	{ field: 'created', headerName: 'Created', type: 'date' as const },
	{ field: 'active', headerName: 'Active', type: 'boolean' as const },
];
const Panel = ({ initial, disabled = false }: { initial: FilterModel; disabled?: boolean }) => {
	const [model, setModel] = useState(initial);
	return (
		<CustomFilterPanel
			columns={columns}
			filterModel={model}
			disabled={disabled}
			filterOperatorsByType={getServerFilterOperators()}
			onChange={(next) => {
				change(next);
				setModel(next);
			}}
		/>
	);
};
beforeEach(() => jest.clearAllMocks());

it('keeps column and operator choices noneditable and disables the single date operator', async () => {
	await render(<Panel initial={{ items: [{ id: 'f', field: 'created', operator: 'between', value: '' }] }} />);
	expect(screen.queryByRole('combobox')).toBeNull();
	expect(screen.getByRole('button', { name: t.dataGrid.operatorLabel })).toBeDisabled();
	expect(screen.getByText(t.filterPanel.between)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	expect(screen.getByRole('radio', { name: 'Created' })).toBeChecked();
	expect(screen.queryByRole('textbox')).toBeNull();
});

it('disables removing the first empty row until it has a value', async () => {
	await render(<Panel initial={{ items: [{ id: 'f', field: 'name', operator: 'contains', value: '' }] }} />);
	const remove = screen.getByRole('button', { name: t.dataGrid.removeFilter });
	expect(remove).toBeDisabled();
	await fireEvent.press(remove);
	expect(change).not.toHaveBeenCalled();
	await fireEvent.changeText(screen.getByPlaceholderText(t.common.value), 'A value');
	expect(screen.getByRole('button', { name: t.dataGrid.removeFilter })).toBeEnabled();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.removeFilter }));
	expect(change.mock.calls.at(-1)[0].items).toEqual([]);
});

it('shows AND/OR on the second row and preserves OR when adding another row', async () => {
	await render(
		<Panel
			initial={{
				items: [
					{ id: '1', field: 'name', operator: 'contains', value: 'First' },
					{ id: '2', field: 'active', operator: 'is', value: false },
				],
			}}
		/>,
	);
	await fireEvent.press(screen.getByRole('button', { name: t.filterPanel.logicOperator }));
	await fireEvent.press(screen.getByRole('radio', { name: t.filterPanel.or }));
	expect(change.mock.calls.at(-1)[0].logicOperator).toBe('or');
	await fireEvent.press(screen.getByRole('button', { name: t.common.addFilter }));
	expect(change.mock.calls.at(-1)[0].logicOperator).toBe('or');
	expect(screen.getAllByText(t.filterPanel.or)).toHaveLength(2);
	await fireEvent.press(screen.getAllByRole('button', { name: t.dataGrid.removeFilter }).at(-1)!);
	expect(change.mock.calls.at(-1)[0].items).toHaveLength(2);
});

it('closes a calendar when its filter becomes disabled and keeps it closed after re-enabling', async () => {
	const initial = { items: [{ id: 'f', field: 'created', operator: 'between', value: '' }] };
	const view = await render(<Panel initial={initial} />);
	await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
	expect(screen.getByTestId('date-picker-' + t.dateRange.from)).toBeOnTheScreen();
	await view.rerender(<Panel initial={initial} disabled />);
	expect(screen.queryByTestId('date-picker-' + t.dateRange.from)).toBeNull();
	await view.rerender(<Panel initial={initial} />);
	expect(screen.queryByTestId('date-picker-' + t.dateRange.from)).toBeNull();
	expect(change).not.toHaveBeenCalled();
});

it('recognizes false, zero and valueless filters while excluding unfinished values', () => {
	for (const value of [false, 0, 'value']) expect(filterHasValue({ field: 'a', operator: 'equals', value })).toBe(true);
	for (const value of [undefined, null, '', ' '])
		expect(filterHasValue({ field: 'a', operator: 'equals', value })).toBe(false);
	expect(filterHasValue({ field: 'a', operator: 'isEmpty' })).toBe(true);
});

it('adds unique filters, combines with AND, removes and clears them', async () => {
	await render(
		<Panel initial={{ items: [{ id: 'filter-1', field: 'name', operator: 'contains', value: 'Existing' }] }} />,
	);
	await fireEvent.press(screen.getByLabelText(t.common.addFilter));
	const model: FilterModel = change.mock.calls.at(-1)[0];
	expect(new Set(model.items.map((item) => item.id)).size).toBe(2);
	expect(model.logicOperator).toBe('and');
	expect(screen.getByText(t.filterPanel.and)).toBeOnTheScreen();
	expect(screen.queryByText(t.filterPanel.or)).toBeNull();
	await fireEvent.press(screen.getAllByLabelText(t.dataGrid.removeFilter)[0]);
	expect(change.mock.calls.at(-1)[0].items).toHaveLength(1);
	await fireEvent.press(screen.getByLabelText(t.common.clearAllFilters));
	expect(change.mock.calls.at(-1)[0].items).toEqual([]);
});

it('clears a text value when its field becomes a boolean and preserves false', async () => {
	await render(<Panel initial={{ items: [{ id: 'f', field: 'name', operator: 'contains', value: 'Old text' }] }} />);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
	await fireEvent.press(screen.getByText('Active'));
	expect(change.mock.calls.at(-1)[0].items[0]).toEqual({ id: 'f', field: 'active', operator: 'is', value: true });
	await fireEvent.press(screen.getByRole('button', { name: t.common.value }));
	await fireEvent.press(screen.getByText(t.common.no));
	expect(change.mock.calls.at(-1)[0].items[0].value).toBe(false);
});

it('hides the value for empty operators and resets it when returning to text', async () => {
	await render(<Panel initial={{ items: [{ id: 'f', field: 'name', operator: 'contains', value: 'Old' }] }} />);
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.operatorLabel }));
	await fireEvent.press(screen.getByText(t.filterPanel.isEmpty));
	expect(screen.queryByPlaceholderText(t.common.value)).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.operatorLabel }));
	await fireEvent.press(screen.getByText(t.filterPanel.contains));
	expect(screen.getByPlaceholderText(t.common.value).props.value).toBe('');
});

it.each(['ios', 'android'] as const)(
	'preserves local calendar dates and ignores dismissals on %s',
	async (platform) => {
		const os = jest.replaceProperty(Platform, 'OS', platform);
		try {
			await render(<Panel initial={{ items: [{ id: 'f', field: 'created', operator: 'between', value: '' }] }} />);
			await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
			await fireEvent(screen.getByTestId('date-picker-' + t.dateRange.from), 'dismiss');
			expect(change).not.toHaveBeenCalled();
			expect(screen.queryByTestId('date-picker-' + t.dateRange.from)).toBeNull();
			await fireEvent.press(screen.getByRole('button', { name: t.dateRange.from }));
			const date = new Date(2026, 4, 6, 0, 0, 0);
			await fireEvent(
				screen.getByTestId('date-picker-' + t.dateRange.from),
				'valueChange',
				{ nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } },
				date,
			);
			if (platform === 'ios') {
				expect(change).not.toHaveBeenCalled();
				expect(screen.getByTestId('date-picker-' + t.dateRange.from)).toBeOnTheScreen();
				await fireEvent.press(screen.getByLabelText(t.dataGrid.done));
			}
			expect(screen.queryByTestId('date-picker-' + t.dateRange.from)).toBeNull();
			expect(change.mock.calls.at(-1)[0].items[0].value).toEqual({
				from: '2026-05-06',
				to: format(new Date(), 'yyyy-MM-dd'),
			});
		} finally {
			os.restore();
		}
	},
);

it('allows more than ten filters like the original web panel', async () => {
	const items = Array.from({ length: 10 }, (_, index) => ({
		id: String(index),
		field: 'name',
		operator: 'contains',
		value: String(index),
	}));
	await render(<Panel initial={{ items }} />);
	await fireEvent.press(screen.getByLabelText(t.common.addFilter));
	expect(change.mock.calls.at(-1)[0].items).toHaveLength(11);
});

it('disables changes while a mutation is pending', async () => {
	const items = Array.from({ length: 10 }, (_, index) => ({
		id: String(index),
		field: 'name',
		operator: 'contains',
		value: String(index),
	}));
	await render(<Panel initial={{ items }} disabled />);
	await fireEvent.press(screen.getByLabelText(t.common.addFilter));
	await fireEvent.press(screen.getAllByLabelText(t.dataGrid.removeFilter)[0]);
	await fireEvent.changeText(screen.getAllByPlaceholderText(t.common.value)[0], 'Blocked');
	expect(change).not.toHaveBeenCalled();
	expect(screen.getByLabelText(t.common.addFilter)).toBeDisabled();
});

describe('filterHasValue utility function', () => {
	test('returns true for isEmpty operator (value-less)', () => {
		const item: FilterItem = {
			id: '1',
			field: 'name',
			operator: 'isEmpty',
			value: '',
		};
		expect(filterHasValue(item)).toBe(true);
	});

	test('returns true for isNotEmpty operator (value-less)', () => {
		const item: FilterItem = {
			id: '1',
			field: 'name',
			operator: 'isNotEmpty',
			value: '',
		};
		expect(filterHasValue(item)).toBe(true);
	});

	test('returns true for non-empty string value', () => {
		const item: FilterItem = {
			id: '1',
			field: 'name',
			operator: 'contains',
			value: 'test',
		};
		expect(filterHasValue(item)).toBe(true);
	});

	test('returns false for empty string value', () => {
		const item: FilterItem = {
			id: '1',
			field: 'name',
			operator: 'contains',
			value: '',
		};
		expect(filterHasValue(item)).toBe(false);
	});

	test('returns false for whitespace-only string value', () => {
		const item: FilterItem = {
			id: '1',
			field: 'name',
			operator: 'contains',
			value: '   ',
		};
		expect(filterHasValue(item)).toBe(false);
	});

	test('returns true for date range with from value', () => {
		const item: FilterItem = {
			id: '1',
			field: 'date',
			operator: 'dateRange',
			value: { from: '2026-01-01' },
		};
		expect(filterHasValue(item)).toBe(true);
	});

	test('returns true for date range with to value', () => {
		const item: FilterItem = {
			id: '1',
			field: 'date',
			operator: 'dateRange',
			value: { to: '2026-12-31' },
		};
		expect(filterHasValue(item)).toBe(true);
	});

	test('returns false for empty date range', () => {
		const item: FilterItem = {
			id: '1',
			field: 'date',
			operator: 'dateRange',
			value: {},
		};
		expect(filterHasValue(item)).toBe(false);
	});
});

describe('CustomFilterPanel component', () => {
	test('renders empty state initially', async () => {
		await render(<Panel initial={{ items: [], logicOperator: 'and' }} />);
		expect(screen.getByRole('button', { name: /ajouter un filtre/i })).toBeOnTheScreen();
		expect(screen.queryByText(/filtre\(s\) actif\(s\)/)).toBeNull();
	});
	test('adds a new filter when add button is clicked', async () => {
		await render(<Panel initial={{ items: [], logicOperator: 'and' }} />);
		await fireEvent.press(screen.getByRole('button', { name: /ajouter un filtre/i }));
		expect(change).toHaveBeenCalledTimes(1);
		expect(change.mock.calls[0][0].items).toEqual([{ id: 'filter-1', field: 'name', operator: 'contains', value: '' }]);
	});
	test('disables add button when a filter has no value', async () => {
		await render(<Panel initial={{ items: [{ id: '1', field: 'name', operator: 'contains', value: '' }] }} />);
		expect(screen.getByRole('button', { name: /ajouter un filtre/i })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: /ajouter un filtre/i }));
		expect(change).not.toHaveBeenCalled();
	});
	test('enables add button when all filters have values', async () => {
		await render(<Panel initial={{ items: [{ id: '1', field: 'name', operator: 'contains', value: 'test' }] }} />);
		expect(screen.getByRole('button', { name: /ajouter un filtre/i })).not.toBeDisabled();
	});
	test('updates filter value when text input changes', async () => {
		await render(<Panel initial={{ items: [{ id: '1', field: 'name', operator: 'contains', value: '' }] }} />);
		await fireEvent.changeText(screen.getByPlaceholderText('Valeur'), 'new value');
		expect(change.mock.calls[0][0].items[0].value).toBe('new value');
	});
	test('changes filter operator when operator selector changes', async () => {
		await render(<Panel initial={{ items: [{ id: '1', field: 'name', operator: 'contains', value: 'test' }] }} />);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.operatorLabel }));
		await fireEvent.press(screen.getByText(t.filterPanel.equals));
		expect(change.mock.calls[0][0].items[0]).toMatchObject({ operator: 'equals', value: 'test' });
	});
	test('hides value input for isEmpty operator', async () => {
		await render(<Panel initial={{ items: [{ id: '1', field: 'name', operator: 'isEmpty', value: '' }] }} />);
		expect(screen.queryByPlaceholderText('Valeur')).toBeNull();
	});
	test('filters out non-filterable columns', async () => {
		await render(
			<CustomFilterPanel
				columns={[
					...columns,
					{ field: 'actions', headerName: 'Actions', filterable: false },
					{ field: 'secret', headerName: 'Hidden', filterable: false },
				]}
				filterModel={{ items: [{ id: '1', field: 'name', operator: 'contains', value: 'test' }] }}
				onChange={change}
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
		expect(screen.queryByText('Actions')).toBeNull();
		expect(screen.queryByText('Hidden')).toBeNull();
		expect(screen.getByText('Created')).toBeOnTheScreen();
	});
	test('handles empty columns array', async () => {
		await render(<CustomFilterPanel columns={[]} filterModel={{ items: [] }} onChange={change} />);
		expect(screen.getByRole('button', { name: /ajouter un filtre/i })).toBeDisabled();
	});
});

test('displays active filter count', async () => {
	await render(
		<Panel
			initial={{
				items: [
					{ id: '1', field: 'name', operator: 'contains', value: 'test1' },
					{ id: '2', field: 'active', operator: 'is', value: false },
					{ id: '3', field: 'name', operator: 'contains', value: '' },
				],
			}}
		/>,
	);
	expect(screen.getByText('2 filtre(s) actif(s)')).toBeOnTheScreen();
});
