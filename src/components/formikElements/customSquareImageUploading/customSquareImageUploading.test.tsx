import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Image as ExpoImage, type ImageRef } from 'expo-image';
import { ImageManipulator } from 'expo-image-manipulator';
import type { CropZoomProps, CropZoomRefType } from 'react-native-zoom-toolkit';
import CustomSquareImageUploading from './customSquareImageUploading';
import { translations } from '@/translations';
import type { CustomSquareImageUploadingProps } from '@/types/uiTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
const mockReadFile = jest.fn();
let mockMime = 'image/jpeg';
jest.mock('expo-file-system', () => ({
	File: jest.fn().mockImplementation(() => ({ type: mockMime, base64: mockReadFile })),
}));
jest.mock('expo-image', () => ({
	Image: Object.assign(jest.requireActual<typeof import('react-native')>('react-native').Image, {
		loadAsync: jest.fn(),
	}),
}));
jest.mock('react-native-gesture-handler', () => ({
	GestureHandlerRootView: jest.requireActual<typeof import('react-native')>('react-native').View,
}));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
const mockCrop = jest.fn();
jest.mock('react-native-zoom-toolkit', () => {
	const { createElement, forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react');
	return {
		CropZoom: forwardRef<Pick<CropZoomRefType, 'crop'>, CropZoomProps>((props, ref) => {
			useImperativeHandle(ref, () => ({ crop: mockCrop }));
			return createElement('Cropper', { ...props, testID: 'cropper' });
		}),
	};
});
const mockSave = jest.fn();
const mockCropImage = jest.fn();
const mockRender = jest.fn();
const mockRelease = jest.fn();
const mockReleaseRendered = jest.fn();
jest.mock('expo-image-manipulator', () => ({
	SaveFormat: { PNG: 'png' },
	ImageManipulator: {
		manipulate: jest.fn(() => ({
			crop: mockCropImage,
			renderAsync: mockRender,
			release: mockRelease,
		})),
	},
}));
const mockOnError = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
	useToast: () => ({ onError: mockOnError }),
}));
const t = translations.fr;
const original = 'https://example.invalid/original.jpg';
const crop = 'https://example.invalid/crop.jpg';
const source = { width: 600, height: 400, scale: 2 } as ImageRef;
const region = { originX: 120, originY: 80, width: 360, height: 250 };
const props = (): CustomSquareImageUploadingProps => ({
	label: 'Photo de profil',
	image: original,
	croppedImage: crop,
	onChange: jest.fn(),
	onCrop: jest.fn(),
});
const Example = () => {
	const [image, setImage] = useState<string | ArrayBuffer | null>(original);
	const [croppedImage, setCroppedImage] = useState<string | null>(crop);
	return (
		<CustomSquareImageUploading
			label="Photo de profil"
			image={image}
			croppedImage={croppedImage}
			onChange={setImage}
			onCrop={setCroppedImage}
			avatar
		/>
	);
};
const openCrop = async () => {
	await fireEvent.press(screen.getByRole('button', { name: t.common.clickToEditCrop }));
	await screen.findByTestId('cropper');
};
beforeEach(() => {
	jest.clearAllMocks();
	mockReadFile.mockResolvedValue('original-image');
	mockMime = 'image/jpeg';
	jest.mocked(ExpoImage.loadAsync).mockResolvedValue(source);
	mockCrop.mockReturnValue({ crop: region, context: { rotationAngle: 0, flipHorizontal: false, flipVertical: false } });
	mockRender.mockResolvedValue({ saveAsync: mockSave, release: mockReleaseRendered });
	mockSave.mockResolvedValue({ uri: 'file:///cropped.png', base64: 'cropped-image', width: 360, height: 250 });
	jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
		canceled: false,
		assets: [{ uri: 'file:///picked.jpg', base64: 'original-image', width: 1200, height: 800 }],
	});
});
describe('CustomSquareImageUploading original behaviors', () => {
	const mockOnChange = jest.fn();
	const mockOnCrop = jest.fn();
	it('renders upload button when no image is provided', async () => {
		await render(<CustomSquareImageUploading image={null} onChange={mockOnChange} onCrop={mockOnCrop} />);
		expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	});
	it('renders cropped image preview when not editing', async () => {
		await render(
			<CustomSquareImageUploading
				label={t.common.croppedPreview}
				image={original}
				croppedImage={crop}
				onChange={mockOnChange}
				onCrop={mockOnCrop}
			/>,
		);
		expect(screen.getByLabelText(t.common.croppedPreview)).toHaveProp('source', { uri: crop });
	});
	it('calls onChange and onCrop when clear button is clicked', async () => {
		await render(<CustomSquareImageUploading image={original} onChange={mockOnChange} onCrop={mockOnCrop} />);
		await fireEvent.press(screen.getByTestId('clear-button'));
		expect(mockOnChange).toHaveBeenCalledWith(null);
		expect(mockOnCrop).toHaveBeenCalledWith(null);
	});
	it('enters editing mode when the crop action is pressed', async () => {
		await render(
			<CustomSquareImageUploading image={original} croppedImage={crop} onChange={mockOnChange} onCrop={mockOnCrop} />,
		);
		await openCrop();
		expect(screen.getByTestId('cropper')).toBeOnTheScreen();
	});
	it('handles file upload with no files', async () => {
		jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
		await render(<CustomSquareImageUploading image={null} onChange={mockOnChange} onCrop={mockOnCrop} />);
		await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.addImage })));
		expect(mockOnChange).not.toHaveBeenCalled();
		expect(mockOnCrop).not.toHaveBeenCalled();
	});
});
it('supports original props without a native label or cropped image and applies cssClasse', async () => {
	const view = await render(
		<CustomSquareImageUploading image={null} onChange={jest.fn()} onCrop={jest.fn()} cssClasse="my-class" />,
	);
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
	expect(view.toJSON()).toHaveProperty('props.className', 'gap-4 my-class');
});
it('shows validation errors without losing the image or preventing correction', async () => {
	const data = props();
	const view = await render(<CustomSquareImageUploading {...data} error="Image too large" />);
	expect(screen.getByRole('alert')).toHaveTextContent('Image too large');
	expect(screen.getByLabelText('Photo de profil')).toHaveProp('source', { uri: crop });
	expect(screen.getByRole('button', { name: t.common.editPhoto })).not.toBeDisabled();
	await view.rerender(<CustomSquareImageUploading {...data} />);
	expect(screen.queryByRole('alert')).toBeNull();
});
it('previews the cropped image and opens the full original in a dismissible preview', async () => {
	await render(<Example />);
	expect(screen.getByLabelText('Photo de profil')).toHaveProp('source', { uri: crop });
	await fireEvent.press(screen.getByRole('button', { name: t.common.display + ' Photo de profil' }));
	expect(screen.getAllByLabelText('Photo de profil').some((node) => node.props.source?.uri === original)).toBe(true);
	await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
	expect(screen.getByLabelText('Photo de profil')).toHaveProp('source', { uri: crop });
});
it('keeps the picked original separate from the confirmed PNG crop', async () => {
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
	await screen.findByTestId('cropper');
	expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
		mediaTypes: ['images'],
		allowsEditing: false,
		quality: 1,
	});
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
	expect(ExpoImage.loadAsync).toHaveBeenCalledWith('data:image/jpeg;base64,original-image');
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(data.onCrop).toHaveBeenCalledWith('data:image/png;base64,cropped-image'));
	expect(data.onChange).toHaveBeenCalledWith('data:image/jpeg;base64,original-image');
	expect(ImageManipulator.manipulate).toHaveBeenCalledWith(source);
	expect(mockCropImage).toHaveBeenCalledWith(region);
	expect(mockSave).toHaveBeenCalledWith({ format: 'png', base64: true });
	expect(mockReleaseRendered).toHaveBeenCalledTimes(1);
	expect(mockRelease).toHaveBeenCalledTimes(1);
	expect(screen.queryByTestId('cropper')).toBeNull();
});
it.each([
	[true, 1],
	[false, 36 / 25],
] as const)('uses the correct fixed ratio for avatar=%s and pixel resolution', async (avatar, ratio) => {
	await render(<CustomSquareImageUploading {...props()} avatar={avatar} />);
	await openCrop();
	const frame = screen.getByTestId('cropper').props;
	expect(frame.cropSize.width / frame.cropSize.height).toBeCloseTo(ratio);
	expect(frame.resolution).toEqual({ width: 1200, height: 800 });
	expect(frame.panMode).toBe('clamp');
	expect(frame.scaleMode).toBe('clamp');
});
it('recrops the existing original without replacing its raw field or reopening the picker', async () => {
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await openCrop();
	expect(ExpoImage.loadAsync).toHaveBeenCalledWith(original);
	expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(data.onCrop).toHaveBeenCalledWith('data:image/png;base64,cropped-image'));
	expect(data.onChange).not.toHaveBeenCalled();
});
it('preserves original PNG bytes and MIME instead of the picker JPEG conversion', async () => {
	mockMime = 'image/png';
	mockReadFile.mockResolvedValueOnce('transparent-png-bytes');
	jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
		canceled: false,
		assets: [{ uri: 'file:///stamp.png', base64: 'lossy-picker-jpeg', mimeType: 'image/png', width: 100, height: 100 }],
	});
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
	await screen.findByTestId('cropper');
	expect(File).toHaveBeenCalledWith('file:///stamp.png');
	expect(ExpoImage.loadAsync).toHaveBeenCalledWith('data:image/png;base64,transparent-png-bytes');
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(data.onChange).toHaveBeenCalledWith('data:image/png;base64,transparent-png-bytes'));
	expect(data.onCrop).toHaveBeenCalledWith('data:image/png;base64,cropped-image');
});
it.each(['unreadable', 'empty'] as const)(
	'preserves current values after an %s original file read',
	async (failure) => {
		if (failure === 'unreadable') mockReadFile.mockRejectedValueOnce(new Error('Read failed'));
		else mockReadFile.mockResolvedValueOnce('');
		const data = props();
		await render(<CustomSquareImageUploading {...data} />);
		await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto })));
		expect(mockOnError).toHaveBeenCalledWith(t.common.genericError);
		expect(ExpoImage.loadAsync).not.toHaveBeenCalled();
		expect(data.onChange).not.toHaveBeenCalled();
		expect(data.onCrop).not.toHaveBeenCalled();
	},
);
it('uses the original FileReader contract in browser preview without native filesystem access', async () => {
	const platform = jest.replaceProperty(Platform, 'OS', 'web');
	const file = { type: 'image/png' } as globalThis.File;
	const reader = {
		result: 'data:image/png;base64,web-original',
		onload: null as (() => void) | null,
		readAsDataURL: jest.fn(),
	};
	reader.readAsDataURL.mockImplementation(() => reader.onload?.());
	const previousReader = Object.getOwnPropertyDescriptor(globalThis, 'FileReader');
	Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: jest.fn(() => reader) });
	try {
		jest
			.mocked(ImagePicker.launchImageLibraryAsync)
			.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'blob:original', file, width: 100, height: 100 }] });
		const data = props();
		await render(<CustomSquareImageUploading {...data} />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
		await screen.findByTestId('cropper');
		expect(reader.readAsDataURL).toHaveBeenCalledWith(file);
		expect(File).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
		await waitFor(() => expect(data.onChange).toHaveBeenCalledWith(reader.result));
	} finally {
		if (previousReader) Object.defineProperty(globalThis, 'FileReader', previousReader);
		else Reflect.deleteProperty(globalThis, 'FileReader');
		platform.restore();
	}
});
it('clears both original form values with null, then offers upload again', async () => {
	const data = props();
	const view = await render(<CustomSquareImageUploading {...data} />);
	await fireEvent.press(screen.getByTestId('clear-button'));
	expect(data.onChange).toHaveBeenCalledWith(null);
	expect(data.onCrop).toHaveBeenCalledWith(null);
	await view.rerender(<CustomSquareImageUploading {...data} image={null} croppedImage={null} />);
	expect(screen.queryByTestId('clear-button')).toBeNull();
	expect(screen.getByRole('button', { name: t.common.addImage })).toBeOnTheScreen();
});
it.each(['cancel', 'back'] as const)(
	'keeps both previous values when a replacement crop closes via %s',
	async (method) => {
		const data = props();
		await render(<CustomSquareImageUploading {...data} />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
		await screen.findByTestId('cropper');
		if (method === 'cancel') await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
		else
			await fireEvent(
				screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
				'requestClose',
			);
		expect(screen.queryByTestId('cropper')).toBeNull();
		expect(data.onChange).not.toHaveBeenCalled();
		expect(data.onCrop).not.toHaveBeenCalled();
		expect(screen.getByLabelText('Photo de profil')).toHaveProp('source', { uri: crop });
	},
);
it.each([
	{ label: 'missing file', assets: [{ uri: '', width: 100, height: 100 }] },
	{ label: 'empty selection', assets: [] },
])('reports $label without overwriting either value', async ({ assets }) => {
	jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets });
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto })));
	expect(mockOnError).toHaveBeenCalledWith(t.common.genericError);
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
});
it('does not overwrite images when picking is cancelled or unavailable', async () => {
	jest
		.mocked(ImagePicker.launchImageLibraryAsync)
		.mockResolvedValueOnce({ canceled: true, assets: null })
		.mockRejectedValueOnce(new Error('Picker unavailable'));
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto })));
	expect(mockOnError).not.toHaveBeenCalled();
	await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto })));
	expect(mockOnError).toHaveBeenCalledWith(t.common.genericError);
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
});
it('reports an unavailable remote original and leaves the previous preview unchanged', async () => {
	jest.mocked(ExpoImage.loadAsync).mockRejectedValueOnce(new Error('Offline'));
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await act(async () => await fireEvent.press(screen.getByRole('button', { name: t.common.clickToEditCrop })));
	expect(mockOnError).toHaveBeenCalledWith(t.common.genericError);
	expect(screen.queryByTestId('cropper')).toBeNull();
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
});
it('keeps crop errors visible inside the native modal and allows a successful retry', async () => {
	mockSave.mockRejectedValueOnce(new Error('Cannot save'));
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await openCrop();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await screen.findByText(t.common.genericError);
	expect(screen.getByRole('alert')).toBeOnTheScreen();
	expect(mockOnError).toHaveBeenCalledWith(t.common.genericError);
	expect(data.onCrop).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: t.common.confirm })).not.toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(data.onCrop).toHaveBeenCalledTimes(1));
	expect(screen.queryByTestId('cropper')).toBeNull();
});
it('rejects an empty crop result without changing either field', async () => {
	mockSave.mockResolvedValueOnce({ width: 0, height: 0, base64: '' });
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await openCrop();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await screen.findByText(t.common.genericError);
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
});
it('prevents duplicate crop submissions and back dismissal while saving', async () => {
	let finish!: (result: unknown) => void;
	mockSave.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const data = props();
	await render(<CustomSquareImageUploading {...data} />);
	await openCrop();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
	expect(screen.getByRole('button', { name: t.common.cancel })).toBeDisabled();
	await fireEvent(
		screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
		'requestClose',
	);
	expect(screen.getByTestId('cropper')).toBeOnTheScreen();
	await act(async () => finish({ base64: 'one', width: 360, height: 250 }));
	expect(data.onCrop).toHaveBeenCalledTimes(1);
});
it('ignores a crop completing after the form unmounts', async () => {
	let finish!: (result: unknown) => void;
	mockSave.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const data = props();
	const view = await render(<CustomSquareImageUploading {...data} />);
	await openCrop();
	await fireEvent.press(screen.getByRole('button', { name: t.common.confirm }));
	await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
	await view.unmount();
	await act(async () => finish({ base64: 'late', width: 360, height: 250 }));
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
	expect(mockRelease).toHaveBeenCalledTimes(1);
});
it('ignores a picker result after unmount and prevents repeated picker launches', async () => {
	let finish!: (result: ImagePicker.ImagePickerResult) => void;
	jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	const data = props();
	const view = await render(<CustomSquareImageUploading {...data} />);
	await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
	await fireEvent.press(screen.getByRole('button', { name: t.common.editPhoto }));
	expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
	await view.unmount();
	await act(async () =>
		finish({ canceled: false, assets: [{ uri: 'file:///late.jpg', base64: 'late', width: 100, height: 100 }] }),
	);
	expect(ExpoImage.loadAsync).not.toHaveBeenCalled();
	expect(data.onChange).not.toHaveBeenCalled();
	expect(data.onCrop).not.toHaveBeenCalled();
});
it('disables upload, recrop and clear while retaining read-only full preview', async () => {
	const data = props();
	await render(<CustomSquareImageUploading {...data} disabled />);
	expect(screen.getByRole('button', { name: t.common.editPhoto })).toBeDisabled();
	expect(screen.getByRole('button', { name: t.common.clickToEditCrop })).toBeDisabled();
	expect(screen.getByTestId('clear-button')).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: t.common.display + ' Photo de profil' }));
	expect(screen.getByRole('button', { name: t.common.close })).toBeOnTheScreen();
	expect(data.onChange).not.toHaveBeenCalled();
});
