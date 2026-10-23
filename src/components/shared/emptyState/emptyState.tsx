import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorMode } from '@/providers/themeProvider';
import { colors, surfaceStyles } from '@/utils/themes';

type Props = {
	message: string;
	testID?: string;
};

// A quiet placeholder distinguishes an empty section from a document card.
const EmptyState = (props: Props) => {
	const { mode } = useColorMode();
	return (
		<View
			testID={props.testID}
			className="flex-row items-center justify-center gap-3 px-4 py-6"
			style={[surfaceStyles[mode], { borderStyle: 'dashed' }]}
		>
			<MaterialIcons name="inbox" size={28} color={colors.slate[400]} />
			<Text className="shrink font-poppins-medium text-sm text-slate-500 dark:text-slate-300">{props.message}</Text>
		</View>
	);
};

export default EmptyState;
