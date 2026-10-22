import { useEffect, useRef, useState, type FC } from 'react';
import { Text, Image, Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Image as ExpoImage, type ImageRef } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CropZoom, type CropZoomRefType } from 'react-native-zoom-toolkit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
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
	error?: string;
	disabled?: boolean;
	avatar?: boolean;
};

const CustomSquareImageUploading: FC<CustomSquareImageUploadingProps> = (props: CustomSquareImageUploadingProps) => {
	const { image, croppedImage, onChange, onCrop, cssClasse, label, error, disabled, avatar = false } = props;
	const { t } = useLanguage();
	const { onError } = useToast();
	const { width, height } = useWindowDimensions();
	const cropperRef = useRef<CropZoomRefType>(null);
	const operation = useRef(0);
	const inFlight = useRef(false);
	const pendingSource = useRef<'camera' | 'library' | null>(null);
	const [busy, setBusy] = useState(false);
	const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isNewUpload, setIsNewUpload] = useState(false);
	const [draftImage, setDraftImage] = useState<string | null>(null);
	const [source, setSource] = useState<ImageRef | null>(null);
	const [cropError, setCropError] = useState('');
	const [cropViewport, setCropViewport] = useState<{ width: number; height: number } | null>(null);
	const name = label ?? t.common.addImage;
	// Logos and stamps start with the whole original visible. A forced landscape
	// ratio would crop square logos before the user has moved or zoomed anything.
	const ratio = avatar || !source ? 1 : source.width / source.height;
	const cropWidth = Math.max(
		1,
		Math.min((cropViewport?.width ?? width) - 32, Math.max(1, (cropViewport?.height ?? height - 260) - 32) * ratio),
	);
	const cropSize = { width: cropWidth, height: cropWidth / ratio };

	useEffect(
		() => () => {
			operation.current += 1;
			pendingSource.current = null;
		},
		[],
	);

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
			const loaded = await ExpoImage.loadAsync(raw);
			if (current !== operation.current) return;
			setSource(loaded);
			setDraftImage(raw);
			setIsNewUpload(true);
			setCropError('');
			setIsEditing(true);
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
			// Expo Image loads both an existing server URL and a local data URI.
			const loaded = await ExpoImage.loadAsync(uri);
			if (current !== operation.current) return;
			setSource(loaded);
			setDraftImage(uri);
			setIsNewUpload(false);
			setCropError('');
			setIsEditing(true);
		} catch {
			if (current === operation.current) onError(t.common.genericError);
		} finally {
			if (current === operation.current) {
				inFlight.current = false;
				setBusy(false);
			}
		}
	};
	const handleClose = () => {
		if (inFlight.current) return;
		operation.current += 1;
		setIsEditing(false);
		setSource(null);
		setDraftImage(null);
		setCropError('');
	};
	const handleCrop = async () => {
		if (disabled || inFlight.current || !source || !draftImage || !cropperRef.current) return;
		inFlight.current = true;
		setBusy(true);
		setCropError('');
		const current = operation.current;
		let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
		try {
			context = ImageManipulator.manipulate(source);
			const result = cropperRef.current.crop();
			if (result.resize) context.resize(result.resize);
			if (result.context.flipHorizontal) context.flip('horizontal');
			if (result.context.flipVertical) context.flip('vertical');
			if (result.context.rotationAngle) context.rotate(result.context.rotationAngle);
			context.crop(result.crop);
			const rendered = await context.renderAsync();
			try {
				const cropped = await rendered.saveAsync({ format: SaveFormat.PNG, base64: true });
				if (current !== operation.current) return;
				if (!cropped.base64 || cropped.width <= 0 || cropped.height <= 0) {
					setCropError(t.common.genericError);
					onError(t.common.genericError);
					return;
				}
				// Confirm before committing. Cancelling keeps both current form values,
				// including when replacing an existing image.
				if (isNewUpload) onChange(draftImage);
				onCrop('data:image/png;base64,' + cropped.base64);
				setIsEditing(false);
				setSource(null);
				setDraftImage(null);
			} finally {
				rendered.release();
			}
		} catch {
			if (current === operation.current) {
				setCropError(t.common.genericError);
				onError(t.common.genericError);
			}
		} finally {
			context?.release();
			if (current === operation.current) {
				inFlight.current = false;
				setBusy(false);
			}
		}
	};
	const handleClear = () => {
		if (disabled || inFlight.current) return;
		handleClose();
		setPreviewOpen(false);
		setIsNewUpload(false);
		onChange(null);
		onCrop(null);
	};
	const preview =
		typeof croppedImage === 'string' && croppedImage ? croppedImage : typeof image === 'string' ? image : '';
	const fullImage = typeof image === 'string' && image ? image : preview;
	return (
		<View className={['gap-4', cssClasse].filter(Boolean).join(' ')}>
			{!!label && <Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">{label}</Text>}
			<View
				className="items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5
			dark:border-slate-600 dark:bg-slate-800"
			>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t.common.display + ' ' + name}
					disabled={!preview}
					onPress={() => setPreviewOpen(true)}
					className={
						'overflow-hidden border border-slate-200 bg-white dark:border-slate-600 dark:bg-panel ' +
						(avatar ? 'rounded-full' : 'rounded-2xl')
					}
					style={avatar ? { width: 136, height: 136 } : { width: '100%', aspectRatio: 36 / 25 }}
				>
					{preview ? (
						<Image
							accessibilityLabel={name}
							source={{ uri: preview }}
							style={{ width: '100%', height: '100%' }}
							resizeMode={avatar ? 'cover' : 'contain'}
						/>
					) : (
						<View className="flex-1 items-center justify-center">
							<MaterialIcons name={avatar ? 'person-outline' : 'image'} size={46} color={colors.slate[400]} />
						</View>
					)}
				</Pressable>
				{!!preview && (
					<View className="flex-row items-center gap-5">
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.display}
							onPress={() => setPreviewOpen(true)}
							className="min-h-11 items-center justify-center"
						>
							<MaterialIcons name="zoom-in" size={24} color={colors.brand} />
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.clickToEditCrop}
							disabled={disabled || busy}
							onPress={() => void handleEditClick()}
							className="min-h-11 items-center justify-center"
						>
							<MaterialIcons name="crop" size={24} color={colors.brand} />
						</Pressable>
						<Pressable
							testID="clear-button"
							accessibilityRole="button"
							accessibilityLabel={t.common.delete + ' ' + name}
							disabled={disabled || busy}
							onPress={handleClear}
							className="min-h-11 items-center justify-center"
						>
							<MaterialIcons name="highlight-off" size={24} color={colors.danger} />
						</Pressable>
					</View>
				)}
				<PrimaryLoadingButton
					buttonText={preview ? (avatar ? t.common.editPhoto : t.common.replaceImage) : t.common.addImage}
					inverted={!!preview}
					loading={busy}
					onClick={handleImageUploadClick}
					active={!disabled}
					startIcon={<MaterialIcons name="add-photo-alternate" size={20} color={colors.brand} />}
				/>
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
			{isEditing && source && (
				<Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
					<SafeAreaProvider>
						<GestureHandlerRootView style={{ flex: 1 }}>
							<SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[900] }}>
								<Text accessibilityRole="header" className="px-6 py-5 font-poppins-semibold text-lg text-white">
									{t.common.clickToEditCrop}
								</Text>
								<View
									testID="image-crop-viewport"
									className="flex-1 items-center justify-center"
									onLayout={({ nativeEvent: { layout } }) => {
										// Measure the space left after the safe area, heading and
										// buttons, including rotation and larger text settings.
										setCropViewport((current) =>
											current?.width === layout.width && current.height === layout.height
												? current
												: { width: layout.width, height: layout.height },
										);
									}}
								>
									<View
										testID="image-crop-frame"
										style={{
											width: cropSize.width,
											height: cropSize.height,
											overflow: 'hidden',
											borderWidth: 1,
											borderColor: colors.white,
										}}
									>
										<CropZoom
											ref={cropperRef}
											cropSize={cropSize}
											resolution={{ width: source.width * source.scale, height: source.height * source.scale }}
											panMode="clamp"
											scaleMode="clamp"
										>
											<ExpoImage source={source} contentFit="fill" style={{ width: '100%', height: '100%' }} />
										</CropZoom>
									</View>
								</View>
								<View className="gap-3 p-6">
									{!!cropError && (
										<Text accessibilityRole="alert" className="font-sans text-sm text-red-300">
											{cropError}
										</Text>
									)}
									<PrimaryLoadingButton
										buttonText={t.common.confirm}
										loading={busy}
										active={!disabled}
										onClick={() => void handleCrop()}
									/>
									<PrimaryLoadingButton
										buttonText={t.common.cancel}
										loading={false}
										inverted
										active={!busy}
										onClick={handleClose}
									/>
								</View>
							</SafeAreaView>
						</GestureHandlerRootView>
					</SafeAreaProvider>
				</Modal>
			)}
		</View>
	);
};

export default CustomSquareImageUploading;
