import { useEffect, useRef, useState, type FC } from 'react';
import { ActivityIndicator, Text, Image, Platform, Pressable, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import ImagePreview from '@/components/nativeElements/modals/imagePreview/imagePreview';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import { useLanguage, useToast } from '@/utils/hooks';
import { colors } from '@/utils/themes';

export type CustomSquareImageUploadingProps = {
	image: string | ArrayBuffer | null;
	croppedImage?: string | ArrayBuffer | null;
	onChange: (image: string | ArrayBuffer | null) => void;
	onCrop: (data: string | null) => void;
	cssClasse?: string;
	label?: string;
	hideLabel?: boolean;
	error?: string;
	disabled?: boolean;
	avatar?: boolean;
	avatarSize?: number;
};

const CustomSquareImageUploading: FC<CustomSquareImageUploadingProps> = (props: CustomSquareImageUploadingProps) => {
	const { image, croppedImage, onChange, onCrop, cssClasse, label, error, disabled, avatar = false } = props;
	const { t } = useLanguage();
	const { onError } = useToast();
	const operation = useRef(0);
	const inFlight = useRef(false);
	const pendingSource = useRef<'camera' | 'library' | null>(null);
	const [busy, setBusy] = useState(false);
	const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const name = label ?? t.common.addImage;
	const avatarSize = props.avatarSize ?? 136;

	useEffect(
		() => () => {
			operation.current += 1;
			pendingSource.current = null;
		},
		[],
	);

	const handleCrop = async (uri: string, isNewUpload: boolean, current: number) => {
		let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
		try {
			// Normalize remote URLs, orientation and data URIs to a local PNG before
			// opening the native editor. Both platforms then use the same pixels.
			const source = await ExpoImage.loadAsync(uri);
			if (current !== operation.current) return;
			context = ImageManipulator.manipulate(source);
			const rendered = await context.renderAsync();
			let normalized;
			try {
				normalized = await rendered.saveAsync({ format: SaveFormat.PNG });
			} finally {
				rendered.release();
			}
			if (current !== operation.current) return;
			// Load the native module only when needed. Missing native modules and
			// unsupported browser cropping are handled by the same error toast.
			const { default: cropper } = await import('react-native-image-crop-picker');
			// Avatars use one size for both dimensions to keep a square crop.
			const avatarCropSize = normalized.width;
			const selection = await cropper.openCropper({
				path: normalized.uri,
				mediaType: 'photo',
				...(avatar ? { width: avatarCropSize, height: avatarCropSize } : {}),
				freeStyleCropEnabled: !avatar,
				cropperToolbarTitle: t.common.cropImage,
				cropperChooseText: t.common.save,
				cropperCancelText: t.common.close,
				cropperChooseColor: colors.brand,
				cropperCancelColor: colors.white,
				cropperToolbarColor: colors.slate[900],
				cropperToolbarWidgetColor: colors.white,
				cropperActiveWidgetColor: colors.brand,
				cropperRotateButtonsHidden: true,
				enableRotationGesture: false,
				hideBottomControls: true,
			});
			if (current !== operation.current) return;
			const rect = selection.cropRect;
			if (
				!rect ||
				![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
				rect.x < 0 ||
				rect.y < 0 ||
				rect.width <= 0 ||
				rect.height <= 0 ||
				rect.x + rect.width > normalized.width ||
				rect.y + rect.height > normalized.height
			) {
				onError(t.common.genericError);
				return;
			}
			// Android's editor writes JPEG. Use its confirmed rectangle on the
			// original pixels to preserve transparency in company logos and stamps.
			context.crop({ originX: rect.x, originY: rect.y, width: rect.width, height: rect.height });
			const cropped = await context.renderAsync();
			try {
				const result = await cropped.saveAsync({ format: SaveFormat.PNG, base64: true });
				if (current !== operation.current) return;
				if (!result.base64 || result.width <= 0 || result.height <= 0) {
					onError(t.common.genericError);
					return;
				}
				// Cancel never changes the form. Commit the original and crop only
				// after the native editor's save action has completed successfully.
				if (isNewUpload) onChange(uri);
				onCrop('data:image/png;base64,' + result.base64);
			} finally {
				cropped.release();
			}
		} catch (error) {
			const cancelled =
				typeof error === 'object' && error !== null && 'code' in error && error.code === 'E_PICKER_CANCELLED';
			if (current === operation.current && !cancelled) onError(t.common.genericError);
		} finally {
			context?.release();
		}
	};

	const handleFileChange = async (imageSource: 'camera' | 'library') => {
		if (disabled || inFlight.current) return;
		inFlight.current = true;
		setBusy(true);
		const current = ++operation.current;
		try {
			if (imageSource === 'camera') {
				const permission = await ImagePicker.requestCameraPermissionsAsync();
				if (current !== operation.current) return;
				if (!permission.granted) {
					onError(t.common.cameraPermissionRequired);
					return;
				}
			}
			const options: ImagePicker.ImagePickerOptions = {
				mediaTypes: ['images'],
				allowsEditing: false,
				quality: 1,
			};
			const result =
				imageSource === 'camera'
					? await ImagePicker.launchCameraAsync(options)
					: await ImagePicker.launchImageLibraryAsync(options);
			if (current !== operation.current || result.canceled) return;
			const asset = result.assets[0];
			if (!asset?.uri) {
				onError(t.common.genericError);
				return;
			}
			let raw: string | null;
			if (Platform.OS === 'web') {
				if (!asset.file) {
					onError(t.common.genericError);
					return;
				}
				raw = await new Promise<string | null>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
					reader.onerror = () => reject(reader.error);
					reader.onabort = () => resolve(null);
					reader.readAsDataURL(asset.file!);
				});
			} else {
				// Picker base64 is re-encoded as JPEG on iOS. Read the original file
				// instead, preserving PNG transparency for logos and stamps.
				const file = new File(asset.uri);
				const base64 = await file.base64();
				const mime = file.type || asset.mimeType;
				if (!base64 || !mime?.startsWith('image/')) {
					if (current === operation.current) onError(t.common.genericError);
					return;
				}
				raw = 'data:' + mime + ';base64,' + base64;
			}
			if (current !== operation.current) return;
			if (!raw) {
				onError(t.common.genericError);
				return;
			}
			await handleCrop(raw, true, current);
		} catch {
			if (current === operation.current) onError(t.common.genericError);
		} finally {
			if (current === operation.current) {
				inFlight.current = false;
				setBusy(false);
			}
		}
	};
	const handleImageUploadClick = () => {
		if (disabled || inFlight.current) return;
		if (Platform.OS === 'web') {
			void handleFileChange('library');
			return;
		}
		setSourceMenuOpen(true);
	};
	const handleSourceSelect = (imageSource: 'camera' | 'library') => {
		if (disabled || inFlight.current || pendingSource.current) return;
		setSourceMenuOpen(false);
		// iOS must finish dismissing this panel before presenting the system picker.
		if (Platform.OS === 'ios') pendingSource.current = imageSource;
		else void handleFileChange(imageSource);
	};
	const handleSourceMenuDismiss = () => {
		const imageSource = pendingSource.current;
		pendingSource.current = null;
		if (imageSource) void handleFileChange(imageSource);
	};
	const handleEditClick = async () => {
		if (disabled || inFlight.current) return;
		const uri = typeof image === 'string' && image ? image : typeof croppedImage === 'string' ? croppedImage : '';
		if (!uri) return;
		inFlight.current = true;
		setBusy(true);
		const current = ++operation.current;
		try {
			await handleCrop(uri, false, current);
		} finally {
			if (current === operation.current) {
				inFlight.current = false;
				setBusy(false);
			}
		}
	};
	const handleClear = () => {
		if (disabled || inFlight.current) return;
		operation.current += 1;
		setPreviewOpen(false);
		onChange(null);
		onCrop(null);
	};
	const preview =
		typeof croppedImage === 'string' && croppedImage ? croppedImage : typeof image === 'string' ? image : '';
	const fullImage = typeof image === 'string' && image ? image : preview;
	return (
		<View className={['gap-4', cssClasse].filter(Boolean).join(' ')}>
			{!!label && !props.hideLabel && (
				<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">{label}</Text>
			)}
			<View className="items-center gap-3">
				<View className={avatar ? 'relative' : 'relative w-full'}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={preview ? t.common.clickToEditCrop : t.common.addImage}
						accessibilityState={{ disabled: !!disabled || busy, busy }}
						disabled={disabled || busy}
						onPress={preview ? () => void handleEditClick() : handleImageUploadClick}
						className={
							'items-center justify-center overflow-hidden border bg-white dark:bg-panel ' +
							(preview ? 'border-slate-200 dark:border-slate-600 ' : 'border-dashed border-brand ') +
							(avatar ? 'rounded-full' : 'rounded-2xl')
						}
						style={avatar ? { width: avatarSize, height: avatarSize } : { width: '100%', aspectRatio: 36 / 25 }}
					>
						{preview ? (
							<Image
								accessibilityLabel={name}
								source={{ uri: preview }}
								style={{ width: '100%', height: '100%' }}
								resizeMode={avatar ? 'cover' : 'contain'}
							/>
						) : (
							<View className="items-center justify-center gap-2 p-3">
								<MaterialIcons name="add-photo-alternate" size={36} color={colors.brand} />
								<Text className="text-center font-poppins-medium text-sm text-brand dark:text-blue-300">
									{t.common.addImage}
								</Text>
							</View>
						)}
						{busy ? (
							<View
								className="absolute inset-0 items-center justify-center bg-white/80 dark:bg-panel/80"
								pointerEvents="none"
							>
								<ActivityIndicator
									accessibilityRole="progressbar"
									accessibilityLabel={t.common.loading}
									color={colors.brand}
								/>
							</View>
						) : (
							!!preview && (
								<View
									className="absolute bottom-2 right-2 rounded-full bg-white/90 p-2 dark:bg-slate-800/90"
									pointerEvents="none"
								>
									<MaterialIcons name="crop" size={20} color={colors.brand} />
								</View>
							)
						)}
					</Pressable>
					{!!preview && (
						<Pressable
							testID="clear-button"
							accessibilityRole="button"
							accessibilityLabel={t.common.delete + ' ' + name}
							disabled={disabled || busy}
							onPress={handleClear}
							className="absolute right-2 top-2 min-h-11 min-w-11 items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90"
						>
							<MaterialIcons name="close" size={24} color={colors.danger} />
						</Pressable>
					)}
				</View>
				{!!preview && (
					<View className="flex-row items-center gap-5">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.display}
							onPress={() => setPreviewOpen(true)}
							className="min-h-11 min-w-11 items-center justify-center"
						>
							<MaterialIcons name="zoom-in" size={24} color={colors.brand} />
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={avatar ? t.common.editPhoto : t.common.replaceImage}
							disabled={disabled || busy}
							onPress={handleImageUploadClick}
							className="min-h-11 min-w-11 items-center justify-center"
						>
							<MaterialIcons name="add-photo-alternate" size={24} color={colors.brand} />
						</Pressable>
					</View>
				)}
			</View>
			{!!error && (
				<Text accessibilityRole="alert" className="font-sans text-xs text-red-600 dark:text-red-300">
					{error}
				</Text>
			)}
			{previewOpen && <ImagePreview uri={fullImage} label={name} visible onClose={() => setPreviewOpen(false)} />}
			<BottomSheet
				testID="image-source-modal"
				visible={sourceMenuOpen}
				title={name}
				subtitle={label ? t.common.addImage : undefined}
				onClose={() => setSourceMenuOpen(false)}
				onDismiss={handleSourceMenuDismiss}
			>
				<View className="flex-row gap-3">
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.takePhoto}
						disabled={disabled || busy}
						onPress={() => handleSourceSelect('camera')}
						className="min-h-32 min-w-0 flex-1 items-center justify-center gap-3 rounded-2xl border border-blue-100
						bg-blue-50 p-4 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
					>
						<MaterialIcons name="photo-camera" size={30} color={colors.brand} />
						<Text className="text-center font-poppins-medium text-sm text-ink dark:text-slate-100">
							{t.common.takePhoto}
						</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.chooseFromGallery}
						disabled={disabled || busy}
						onPress={() => handleSourceSelect('library')}
						className="min-h-32 min-w-0 flex-1 items-center justify-center gap-3 rounded-2xl border border-blue-100
						bg-blue-50 p-4 dark:border-slate-700 dark:bg-slate-800 dark:active:bg-slate-700"
					>
						<MaterialIcons name="photo-library" size={30} color={colors.brand} />
						<Text className="text-center font-poppins-medium text-sm text-ink dark:text-slate-100">
							{t.common.chooseFromGallery}
						</Text>
					</Pressable>
				</View>
			</BottomSheet>
		</View>
	);
};

export default CustomSquareImageUploading;
