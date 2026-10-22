import { type ComponentProps, useState } from 'react';
import { Image, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ImagePreview from '@/components/nativeElements/modals/imagePreview/imagePreview';
import { colors } from '@/utils/themes';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
	image?: string | ArrayBuffer | null;
	previewImage?: string | ArrayBuffer | null;
	label: string;
	icon?: IconName;
	avatar?: boolean;
	large?: boolean;
	size?: number;
	fullWidth?: boolean;
};

const EntityImage = (props: Props) => {
	const { image, previewImage, label, icon = 'business', avatar = false, large = false } = props;
	const [open, setOpen] = useState(false);
	const [failedUri, setFailedUri] = useState<string | null>(null);
	const uri = typeof image === 'string' ? image : '';
	const fullUri = typeof previewImage === 'string' && previewImage ? previewImage : uri;
	const visibleImage = !!uri && failedUri !== uri;
	const size = props.size ?? (large ? 88 : 56);
	return (
		<>
			<Pressable
				accessibilityRole={visibleImage ? 'button' : undefined}
				accessibilityLabel={label}
				disabled={!visibleImage}
				onPress={(event) => {
					event?.stopPropagation();
					setOpen(true);
				}}
				className={
					'items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 ' +
					(props.fullWidth && visibleImage ? 'bg-white dark:bg-panel ' : 'bg-blue-50 dark:bg-slate-800 ') +
					(avatar ? 'rounded-full' : 'rounded-2xl')
				}
				// Documents can fill their section; missing images keep a compact fallback.
				style={
					props.fullWidth && visibleImage ? { width: '100%', aspectRatio: 36 / 25 } : { width: size, height: size }
				}
			>
				{visibleImage ? (
					<Image
						accessibilityRole="image"
						accessibilityLabel={label}
						source={{
							uri,
						}}
						onError={() => setFailedUri(uri)}
						style={{
							width: '100%',
							height: '100%',
						}}
						resizeMode={avatar ? 'cover' : 'contain'}
					/>
				) : (
					<MaterialIcons name={icon} size={size > 56 ? 38 : 27} color={colors.brand} />
				)}
			</Pressable>
			{open && <ImagePreview uri={fullUri} label={label} visible onClose={() => setOpen(false)} />}
		</>
	);
};

export default EntityImage;
