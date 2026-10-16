import { useEffect, useRef, useState, type FC } from 'react';
import { Text, Image, Modal, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Image as ExpoImage, type ImageRef } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CropZoom, type CropZoomRefType } from 'react-native-zoom-toolkit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ImagePreview from '@/components/htmlElements/modals/imagePreview/imagePreview';
import { useLanguage, useToast } from '@/utils/hooks';
import type { CustomSquareImageUploadingProps as Props } from '@/types/uiTypes';

const CustomSquareImageUploading: FC<Props> = ({
	image,
	croppedImage,
	onChange,
	onCrop,
	cssClasse,
	label,
	error,
	disabled,
	avatar = false,
}) => {
	const { t } = useLanguage();
	const { onError } = useToast();
	const { width, height } = useWindowDimensions();
	const cropperRef = useRef<CropZoomRefType>(null);
	const operation = useRef(0);
	const inFlight = useRef(false);
	const [busy, setBusy] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isNewUpload, setIsNewUpload] = useState(false);
	const [draftImage, setDraftImage] = useState<string | null>(null);
	const [source, setSource] = useState<ImageRef | null>(null);
	const [cropError, setCropError] = useState('');
	const name = label ?? t.common.addImage;
	const ratio = avatar ? 1 : 36 / 25;
	const cropWidth = Math.max(1, Math.min(360, width - 48, Math.max(1, height - 260) * ratio));
	const cropSize = { width: cropWidth, height: cropWidth / ratio };
	useEffect(
		() => () => {
			operation.current += 1;
		},
		[],
	);

	const handleFileChange = async () => {
		if (disabled || inFlight.current) return;
		inFlight.current = true;
		setBusy(true);
		const current = ++operation.current;
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: false,
				quality: 1,
			});
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
			<View className="items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-800">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t.common.display + ' ' + name}
					disabled={!preview}
					onPress={() => setPreviewOpen(true)}
					className={
						'overflow-hidden border border-slate-200 bg-white dark:border-slate-600 dark:bg-panel ' +
						(avatar ? 'rounded-full' : 'rounded-2xl')
					}
					style={{ width: 136, height: 136 }}
				>
					{preview ? (
						<Image
							accessibilityLabel={name}
							source={{ uri: preview }}
							style={{ width: 136, height: 136 }}
							resizeMode={avatar ? 'cover' : 'contain'}
						/>
					) : (
						<View className="flex-1 items-center justify-center">
							<MaterialIcons name={avatar ? 'person-outline' : 'image'} size={46} color="#94a3b8" />
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
							<MaterialIcons name="zoom-in" size={24} color="#0274d7" />
						</Pressable>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.clickToEditCrop}
							disabled={disabled || busy}
							onPress={() => void handleEditClick()}
							className="min-h-11 items-center justify-center"
						>
							<MaterialIcons name="crop" size={24} color="#0274d7" />
						</Pressable>
						<Pressable
							testID="clear-button"
							accessibilityRole="button"
							accessibilityLabel={t.common.delete + ' ' + name}
							disabled={disabled || busy}
							onPress={handleClear}
							className="min-h-11 items-center justify-center"
						>
							<MaterialIcons name="highlight-off" size={24} color="#dc2626" />
						</Pressable>
					</View>
				)}
				<PrimaryLoadingButton
					buttonText={preview ? t.common.editPhoto : t.common.addImage}
					inverted
					loading={busy}
					onClick={() => void handleFileChange()}
					active={!disabled}
					startIcon={<MaterialIcons name="add-photo-alternate" size={20} color="#0274d7" />}
				/>
			</View>
			{!!error && (
				<Text accessibilityRole="alert" className="font-sans text-xs text-red-600 dark:text-red-300">
					{error}
				</Text>
			)}
			{previewOpen && <ImagePreview uri={fullImage} label={name} visible onClose={() => setPreviewOpen(false)} />}
			{isEditing && source && (
				<Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
					<GestureHandlerRootView style={{ flex: 1 }}>
						<SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
							<Text accessibilityRole="header" className="px-6 py-5 font-poppins-semibold text-lg text-white">
								{t.common.clickToEditCrop}
							</Text>
							<View className="flex-1 items-center justify-center">
								<View
									testID="image-crop-frame"
									style={{
										width: cropSize.width,
										height: cropSize.height,
										overflow: 'hidden',
										borderWidth: 1,
										borderColor: '#ffffff',
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
				</Modal>
			)}
		</View>
	);
};

export default CustomSquareImageUploading;
