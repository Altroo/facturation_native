import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Native from 'react-native';
import CustomTooltip from './customTooltip';

jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
	'@react-native/jest-preset/jest/MockNativeMethods',
).default;

beforeEach(() => {
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 200, 36, 36));
});
afterEach(() => jest.restoreAllMocks());

describe('CustomTooltip', () => {
	it('opens beside its trigger without permanently showing the description', async () => {
		await render(
			<CustomTooltip label="Revenue information" title="Revenue for the selected period">
				<Native.Text>i</Native.Text>
			</CustomTooltip>,
		);
		expect(screen.queryByText('Revenue for the selected period')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: 'Revenue information' }));
		const panel = screen.getByTestId('custom-tooltip-panel');
		await fireEvent(panel, 'layout', { nativeEvent: { layout: { height: 60 } } });
		expect(panel).toHaveStyle({ top: 132, left: 16, width: 300, opacity: 1 });
		expect(screen.getByRole('button', { name: 'Revenue information', expanded: true })).toBeOnTheScreen();
		expect(screen.getByText('Revenue for the selected period')).toBeOnTheScreen();
		await fireEvent.press(screen.getByTestId('custom-tooltip-backdrop', { includeHiddenElements: true }));
		expect(screen.queryByText('Revenue for the selected period')).toBeNull();
	});

	it('flips below a trigger near the status bar and stays inside the screen', async () => {
		const windowWidth = Native.Dimensions.get('window').width;
		nativeMethods.measureInWindow.mockImplementation((callback) => callback(windowWidth - 30, 20, 36, 36));
		await render(
			<CustomTooltip label="Information" title="Business definition">
				<Native.Text>i</Native.Text>
			</CustomTooltip>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Information' }));
		await fireEvent(screen.getByTestId('custom-tooltip-panel'), 'layout', { nativeEvent: { layout: { height: 80 } } });
		expect(screen.getByTestId('custom-tooltip-panel')).toHaveStyle({ top: 64, left: windowWidth - 316, width: 300 });
	});

	it('closes on Android back or the accessibility escape gesture', async () => {
		await render(
			<CustomTooltip label="Information" title="Business definition">
				<Native.Text>i</Native.Text>
			</CustomTooltip>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Information' }));
		await fireEvent(screen.getByTestId('custom-tooltip'), 'requestClose');
		expect(screen.queryByText('Business definition')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: 'Information' }));
		await fireEvent(screen.getByTestId('custom-tooltip-panel'), 'accessibilityEscape');
		expect(screen.queryByText('Business definition')).toBeNull();
	});
});
