import { fireEvent, render, screen } from '@testing-library/react-native';
import EntityImage from './entityImage';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/components/nativeElements/modals/imagePreview/imagePreview', () => {
	const { Text, Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
	const MockImagePreview = ({ uri, onClose }: { uri: string; onClose: () => void }) => (
		<Pressable accessibilityRole="button" accessibilityLabel="Close preview" onPress={onClose}>
			<Text>{uri}</Text>
		</Pressable>
	);
	return MockImagePreview;
});

it('opens the original image from its thumbnail and closes its preview', async () => {
	await render(<EntityImage image="file:///cropped.jpg" previewImage="file:///original.jpg" label="Avatar" avatar />);
	await fireEvent.press(screen.getByRole('button', { name: 'Avatar' }));
	expect(screen.getByText('file:///original.jpg')).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: 'Close preview' }));
	expect(screen.queryByText('file:///original.jpg')).toBeNull();
});

it('disables a failed image preview and recovers when a new image arrives', async () => {
	const view = await render(<EntityImage image="file:///missing.jpg" label="Logo" />);
	await fireEvent(screen.container.queryAll((node) => node.type === 'Image')[0]!, 'error');
	expect(screen.queryByRole('button', { name: 'Logo' })).toBeNull();
	await view.rerender(<EntityImage image="file:///replacement.jpg" label="Logo" />);
	expect(screen.getByRole('button', { name: 'Logo' })).toBeOnTheScreen();
});
