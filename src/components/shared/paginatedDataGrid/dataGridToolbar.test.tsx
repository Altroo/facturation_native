import { act, fireEvent, render, screen } from '@testing-library/react-native';
import DataGridToolbar from './dataGridToolbar';
import { extractCustomFilterParams, getServerFilterOperators } from './paginatedDataGrid';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;
const props = {
	columns: [{ field: 'reference', headerName: 'Reference' }],
	loadedCount: 1,
	rowCount: 1,
	searchTerm: '',
	setSearchTerm: jest.fn(),
	filterOperatorsByType: getServerFilterOperators(),
	serializeFilters: extractCustomFilterParams,
};

describe('DataGridToolbar', () => {
	it('keeps search and sorting but hides filters for a history whose columns cannot be filtered', async () => {
		await render(
			<DataGridToolbar
				{...props}
				columns={props.columns.map((column) => ({ ...column, filterable: false }))}
				sorting={{ ordering: '', sortModel: [], onSortModelChange: jest.fn() }}
			/>,
		);
		expect(screen.queryByRole('button', { name: t.dataGrid.toolbarFilters })).toBeNull();
		expect(screen.getByRole('button', { name: t.common.search })).toBeEnabled();
		expect(screen.getByRole('button', { name: t.dataGrid.toolbarSort })).toBeEnabled();
	});

	it('renders embedded controls and a styled count without adding navigation or a virtualized list', async () => {
		await render(<DataGridToolbar {...props} embedded countLabel="1 article" />);
		expect(screen.getByText('1 article')).toBeOnTheScreen();
		expect(screen.queryByText('1 / 1')).toBeNull();
		expect(screen.queryByTestId('bottom-navigation')).toBeNull();
		expect(screen.container.queryAll((node) => typeof node.props.onEndReached === 'function')).toHaveLength(0);
	});

	it('discards a filter draft when closed rather than changing the parent document', async () => {
		const change = jest.fn();
		await render(<DataGridToolbar {...props} embedded onFilterModelChange={change} />);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.changeText(screen.getByLabelText(t.common.value), 'Draft');
		await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
		expect(change).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		expect(screen.getByLabelText(t.common.value)).toHaveProp('value', '');
	});

	it('cancels a pending debounced search when its picker is unmounted', async () => {
		jest.useFakeTimers();
		try {
			const change = jest.fn();
			const view = await render(<DataGridToolbar {...props} setSearchTerm={change} />);
			await fireEvent.press(screen.getByRole('button', { name: t.common.search }));
			await fireEvent.changeText(screen.getByLabelText(t.common.search), 'Desk');
			await view.unmount();
			await act(() => jest.advanceTimersByTime(500));
			expect(change).not.toHaveBeenCalled();
		} finally {
			jest.useRealTimers();
		}
	});
});
