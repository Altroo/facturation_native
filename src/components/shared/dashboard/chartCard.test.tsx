import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChartCard from './chartCard';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
	'@react-native/jest-preset/jest/MockNativeMethods',
).default;
beforeEach(() => nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 200, 36, 36)));

describe('ChartCard', () => {
	it('keeps loading, failed requests, and empty results distinct and offers retry', async () => {
		const refetch = jest.fn();
		const view = await render(
			<ChartCard title="Revenue" query={{ refetch, isLoading: true }} empty>
				<Text>Chart</Text>
			</ChartCard>,
		);
		expect(screen.getByLabelText(translations.fr.common.loading)).toBeOnTheScreen();
		expect(screen.queryByText('Chart')).not.toBeOnTheScreen();
		await view.rerender(<ChartCard title="Revenue" query={{ refetch, isError: true }} empty />);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		expect(refetch).toHaveBeenCalledTimes(1);
		await view.rerender(<ChartCard title="Revenue" query={{ refetch }} empty emptyMessage="No revenue" />);
		expect(screen.getByText('No revenue')).toBeOnTheScreen();
	});

	it('explains the same business definition as the web without occupying permanent chart space', async () => {
		await render(
			<ChartCard
				title="Receivables"
				query={{ refetch: jest.fn(), currentData: [] }}
				infoTooltip="Active invoices less valid payments"
			>
				<Text>Chart</Text>
			</ChartCard>,
		);
		expect(screen.queryByText('Active invoices less valid payments')).not.toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Receivables' }));
		await fireEvent(screen.getByTestId('custom-tooltip-panel'), 'layout', { nativeEvent: { layout: { height: 60 } } });
		expect(screen.getByTestId('custom-tooltip')).toHaveProp('transparent', true);
		expect(screen.getByText('Active invoices less valid payments')).toBeOnTheScreen();
		await fireEvent.press(screen.getByTestId('custom-tooltip-backdrop', { includeHiddenElements: true }));
		expect(screen.queryByText('Active invoices less valid payments')).toBeNull();
		expect(screen.getByText('Chart')).toBeOnTheScreen();
	});
});
