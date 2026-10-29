import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';
import CustomMenu from './customMenu';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
	'@react-native/jest-preset/jest/MockNativeMethods',
).default;
beforeEach(() => {
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(280, 180, 44, 44));
});
afterEach(() => jest.restoreAllMocks());

describe('CustomMenu', () => {
	it('allows the shared writing assistant to supply its action icon', async () => {
		await render(
			<CustomMenu
				label="Assistant"
				icon={<Text>Assistant icon</Text>}
				actions={[{ label: 'Translate', onClick: jest.fn() }]}
			/>,
		);
		expect(screen.getByText('Assistant icon')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Assistant' }));
		expect(screen.getByRole('menuitem', { name: 'Translate' })).toBeOnTheScreen();
	});

	it('shows an anchored menu and waits for iOS dismissal before executing its action once', async () => {
		jest.replaceProperty(Platform, 'OS', 'ios');
		const onClick = jest.fn();
		await render(<CustomMenu label="Actions" actions={[{ label: 'Archive', onClick }]} />);
		expect(screen.queryByRole('menuitem')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: 'Actions' }));
		expect(screen.getByTestId('custom-menu-panel')).toHaveStyle({ top: 228 });
		const modal = screen.getByTestId('custom-menu');
		await fireEvent.press(screen.getByRole('menuitem', { name: 'Archive' }));
		expect(onClick).not.toHaveBeenCalled();
		await act(() => modal.props.onDismiss());
		await act(() => modal.props.onDismiss());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('menuitem')).toBeNull();
	});

	it('opens above a low trigger, stays inside the screen and dismisses without executing an action', async () => {
		nativeMethods.measureInWindow.mockImplementation((callback) => callback(2, 1300, 44, 44));
		const onClick = jest.fn();
		await render(<CustomMenu label="Actions" actions={[{ label: 'Delete', onClick, destructive: true }]} />);
		await fireEvent.press(screen.getByRole('button', { name: 'Actions' }));
		const panel = screen.getByTestId('custom-menu-panel');
		await fireEvent(panel, 'layout', { nativeEvent: { layout: { height: 110, width: 240 } } });
		// The menu must fit even if the measured card has moved below the viewport.
		expect(panel).toHaveStyle({ left: 12 });
		await fireEvent.press(screen.getByTestId('custom-menu-backdrop', { includeHiddenElements: true }));
		expect(screen.queryByRole('menuitem')).toBeNull();
		expect(onClick).not.toHaveBeenCalled();
	});

	it('executes Android actions after closing and blocks disabled items', async () => {
		jest.replaceProperty(Platform, 'OS', 'android');
		const onClick = jest.fn();
		await render(
			<CustomMenu
				label="Actions"
				actions={[
					{ label: 'Edit', onClick },
					{ label: 'Delete', onClick, disabled: true },
				]}
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Actions' }));
		await fireEvent.press(screen.getByRole('menuitem', { name: 'Delete' }));
		expect(onClick).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('menuitem', { name: 'Edit' }));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole('menuitem')).toBeNull();
	});

	it('does not open when disabled and renders no trigger without available actions', async () => {
		const { rerender } = await render(
			<CustomMenu label="Actions" disabled actions={[{ label: 'Edit', onClick: jest.fn() }]} />,
		);
		await fireEvent.press(screen.getByRole('button', { name: 'Actions' }));
		expect(screen.queryByRole('menuitem')).toBeNull();
		await rerender(<CustomMenu label="Actions" actions={[]} />);
		expect(screen.queryByRole('button')).toBeNull();
	});
});
