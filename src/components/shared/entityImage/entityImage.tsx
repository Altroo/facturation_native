import { type ComponentProps, useState } from 'react';
import { Image, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ImagePreview from '@/components/nativeElements/modals/imagePreview/imagePreview';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type Props = {
	image?: string | ArrayBuffer | null;
	previewImage?: string | ArrayBuffer | null;
	label: string;
	icon?: IconName;
	avatar?: boolean;
	large?: boolean;
};

const EntityImage = (props: Props) => {
	const { image, previewImage, label, icon = 'business', avatar = false, large = false } = props;
	const [open, setOpen] = useState(false);
	const [failedUri, setFailedUri] = useState<string | null>(null);
	const uri = typeof image === 'string' ? image : '';
	const fullUri = typeof previewImage === 'string' && previewImage ? previewImage : uri;
	const visibleImage = !!uri && failedUri !== uri;
	const size = large ? 88 : 56;
	return (
		<>
			<Pressable
				accessibilityRole={visibleImage ? 'button' : undefined}
				accessibilityLabel={label}
				disabled={!visibleImage}
				onPress={() => setOpen(true)}
				className={
					'items-center justify-center overflow-hidden border border-slate-200 bg-blue-50 dark:border-slate-700 dark:bg-slate-800 ' +
					(avatar ? 'rounded-full' : 'rounded-2xl')
				}
				style={{
					width: size,
					height: size,
				}}
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
							width: size,
							height: size,
						}}
						resizeMode={avatar ? 'cover' : 'contain'}
					/>
				) : (
					<MaterialIcons name={icon} size={large ? 38 : 27} color="#0274d7" />
				)}
			</Pressable>
			{open && <ImagePreview uri={fullUri} label={label} visible onClose={() => setOpen(false)} />}
		</>
	);
};

export default EntityImage;
