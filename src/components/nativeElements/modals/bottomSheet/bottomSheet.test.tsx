import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import BottomSheet from './bottomSheet';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));

it.each(['close', 'backdrop', 'back', 'escape'] as const)(
	'requests dismissal via %s without starting an action',
	async (method) => {
		const onClose = jest.fn();
		const onDismiss = jest.fn();
		await render(
			<BottomSheet visible title="Notifications" testID="example-sheet" onClose={onClose} onDismiss={onDismiss}>
				<Text>Example content</Text>
			</BottomSheet>,
		);
		if (method === 'close') await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		else if (method === 'backdrop')
			await fireEvent.press(screen.getByTestId('example-sheet-backdrop', { includeHiddenElements: true }));
		else if (method === 'back') await fireEvent(screen.getByTestId('example-sheet'), 'requestClose');
		else await fireEvent(screen.getByTestId('example-sheet-panel'), 'accessibilityEscape');
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onDismiss).not.toHaveBeenCalled();
		await fireEvent(screen.getByTestId('example-sheet'), 'dismiss');
		expect(onDismiss).toHaveBeenCalledTimes(1);
	},
);

it('keeps the title, content, and notification height limits while open', async () => {
	const view = await render(
		<BottomSheet
			visible
			title="Notifications"
			testID="example-sheet"
			onClose={jest.fn()}
			style={{ minHeight: 400, maxHeight: 600 }}
		>
			<Text>Example content</Text>
		</BottomSheet>,
	);
	expect(screen.getByRole('header', { name: 'Notifications' })).toBeOnTheScreen();
	expect(screen.getByText('Example content')).toBeOnTheScreen();
	expect(screen.getByTestId('example-sheet-panel')).toHaveStyle({ minHeight: 400, maxHeight: 600 });
	await view.rerender(
		<BottomSheet visible={false} title="Notifications" testID="example-sheet" onClose={jest.fn()}>
			<Text>Example content</Text>
		</BottomSheet>,
	);
	expect(screen.queryByText('Example content')).toBeNull();
});

it('allows fixed-height pickers to stretch content while other sheets remain compact', async () => {
	const view = await render(
		<BottomSheet
			visible
			title="Articles"
			testID="example-sheet"
			onClose={jest.fn()}
			style={{ height: 600 }}
			contentStyle={{ flex: 1 }}
		>
			<Text>Picker content</Text>
		</BottomSheet>,
	);
	expect(screen.getByTestId('example-sheet-content')).toHaveStyle({ flex: 1 });
	await view.rerender(
		<BottomSheet visible title="Actions" testID="example-sheet" onClose={jest.fn()}>
			<Text>Compact content</Text>
		</BottomSheet>,
	);
	expect(screen.getByTestId('example-sheet-content')).not.toHaveStyle({ flex: 1 });
});
