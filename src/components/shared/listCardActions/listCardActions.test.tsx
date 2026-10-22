import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ListCardActions from './listCardActions';
import { translations } from '@/translations';
import { colors } from '@/utils/themes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
	const nativeMethods = jest.requireActual<{ default: { measureInWindow: jest.Mock } }>(
		'@react-native/jest-preset/jest/MockNativeMethods',
	).default;
	nativeMethods.measureInWindow.mockImplementation((callback) => callback(200, 200, 44, 44));
});

it('only exposes available actions in a compact menu and dispatches the chosen callback', async () => {
	const onEdit = jest.fn();
	const onDelete = jest.fn();
	const { rerender } = await render(<ListCardActions />);
	expect(screen.queryByRole('button')).toBeNull();
	await rerender(<ListCardActions onEdit={onEdit} onDelete={onDelete} />);
	expect(screen.queryByRole('menuitem')).toBeNull();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.moreActions }));
	expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
		translations.fr.common.edit,
		translations.fr.common.delete,
	]);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: translations.fr.common.edit }));
	await act(() => modal.props.onDismiss());
	expect(onEdit).toHaveBeenCalledTimes(1);
	expect(onDelete).not.toHaveBeenCalled();
});

it.each(['archive', 'unarchive'] as const)('uses orange for %s and places destructive actions last', async (action) => {
	const onArchive = jest.fn();
	const archiveAction = action === 'archive' ? { onArchive } : { onUnarchive: onArchive };
	await render(<ListCardActions onEdit={jest.fn()} {...archiveAction} onDelete={jest.fn()} />);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.moreActions }));
	expect(screen.getAllByRole('menuitem').map((item) => item.props.accessibilityLabel)).toEqual([
		translations.fr.common.edit,
		translations.fr.common[action],
		translations.fr.common.delete,
	]);
	expect(screen.getByText(translations.fr.common[action])).toHaveStyle({ color: colors.warning });
	expect(screen.getByText(translations.fr.common.delete)).toHaveStyle({ color: colors.danger });
	expect(screen.container.queryAll((node) => node.props.name === action)[0]).toHaveProp('color', colors.warning);
	const modal = screen.getByTestId('custom-menu');
	await fireEvent.press(screen.getByRole('menuitem', { name: translations.fr.common[action] }));
	await act(() => modal.props.onDismiss());
	expect(onArchive).toHaveBeenCalledTimes(1);
});

it('blocks its trigger while the page is busy', async () => {
	const onEdit = jest.fn();
	await render(<ListCardActions onEdit={onEdit} disabled />);
	const button = screen.getByRole('button', { name: translations.fr.common.moreActions });
	expect(button).toBeDisabled();
	await fireEvent.press(button);
	expect(screen.queryByRole('menuitem')).toBeNull();
	expect(onEdit).not.toHaveBeenCalled();
});
