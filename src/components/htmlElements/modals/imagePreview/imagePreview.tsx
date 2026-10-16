import { Text, Image, Modal, Pressable, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/utils/hooks';
import type { ImagePreviewProps } from '@/types/uiTypes';

const ImagePreview = ({ uri, label, visible, onClose }: ImagePreviewProps) => {
	const { t } = useLanguage();
	return (
		<Modal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
			<SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
				<View className="flex-row items-center justify-between gap-4 px-5 py-3">
					<Text className="flex-1 font-poppins-medium text-base text-white">{label}</Text>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.close}
						onPress={onClose}
						className="h-12 w-12 items-center justify-center rounded-full bg-slate-800"
					>
						<MaterialIcons name="close" size={24} color="#fff" />
					</Pressable>
				</View>
				<Image source={{ uri }} accessibilityLabel={label} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
			</SafeAreaView>
		</Modal>
	);
};

export default ImagePreview;
