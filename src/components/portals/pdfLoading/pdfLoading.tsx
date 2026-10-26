import { useSyncExternalStore } from 'react';
import { Platform, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { getPdfLoading, subscribePdfLoading } from '@/utils/apiHelpers';
import { useColorMode } from '@/providers/themeProvider';
import { colors, surfaceStyles } from '@/utils/themes';

const getServerSnapshot = () => false;

// A root overlay keeps all document pages in sync without another provider.
// It does not present a native Modal, leaving iOS Quick Look free to open.
const PdfLoading = () => {
	const loading = useSyncExternalStore(subscribePdfLoading, getPdfLoading, getServerSnapshot);
	const { mode } = useColorMode();
	if (!loading) return null;
	const content = (
		<View
			testID="pdf-loading-overlay"
			accessibilityViewIsModal
			className="absolute inset-0 items-center justify-center bg-black/40"
			style={{ zIndex: 2000, elevation: 24 }}
		>
			<View className="min-w-40 overflow-hidden" style={surfaceStyles[mode]}>
				<ApiProgress
					backdropColor={mode === 'dark' ? colors.panel : colors.white}
					cssStyle={{ flex: 0, padding: 24 }}
				/>
			</View>
		</View>
	);
	return Platform.OS === 'ios' ? (
		<FullWindowOverlay unstable_accessibilityContainerViewIsModal>{content}</FullWindowOverlay>
	) : (
		content
	);
};

export default PdfLoading;
