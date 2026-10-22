import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorMode } from '@/providers/themeProvider';
import { colors, listSpacing, navigationShadows } from '@/utils/themes';

type Props = {
	children: ReactNode;
};

// Keep this beside the page's flex-1 scroll view. It reserves its actual height,
// including the home indicator, so the final field or section cannot sit behind it.
const PageActionBar = (props: Props) => {
	const { mode } = useColorMode();
	return (
		<SafeAreaView
			testID="page-action-bar"
			edges={['bottom', 'left', 'right']}
			style={[
				navigationShadows[mode],
				{
					flexShrink: 0,
					backgroundColor: mode === 'dark' ? colors.panel : colors.white,
					borderTopLeftRadius: Platform.OS === 'android' ? 16 : 24,
					borderTopRightRadius: Platform.OS === 'android' ? 16 : 24,
					borderTopWidth: 1,
					borderColor: mode === 'dark' ? colors.slate[600] : colors.slate[200],
				},
			]}
		>
			<View style={{ paddingHorizontal: listSpacing, paddingVertical: 12 }}>{props.children}</View>
		</SafeAreaView>
	);
};

export default PageActionBar;
