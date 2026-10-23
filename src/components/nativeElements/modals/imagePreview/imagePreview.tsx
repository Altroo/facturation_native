import { Image, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ImageModalHeader from '@/components/shared/imageModalHeader/imageModalHeader';
import { colors } from '@/utils/themes';

type Props = {
	uri: string;
	label: string;
	visible: boolean;
	onClose: () => void;
};

const ImagePreview = (props: Props) => {
	const { uri, label, visible, onClose } = props;
	return (
		<Modal visible={visible} animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen">
			{/* A full-screen modal measures its own insets, independently of the
			    underlying navigator. Otherwise, the status bar can cover Close. */}
			<SafeAreaProvider>
				<SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[900] }}>
					<ImageModalHeader title={label} onClose={onClose} />
					<Image source={{ uri }} accessibilityLabel={label} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
				</SafeAreaView>
			</SafeAreaProvider>
		</Modal>
	);
};

export default ImagePreview;
