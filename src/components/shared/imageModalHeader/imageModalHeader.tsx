import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	title: string;
	onClose: () => void;
	disabled?: boolean;
};

const ImageModalHeader = (props: Props) => {
	const { t } = useLanguage();
	return (
		<View className="flex-row items-center justify-between gap-4 px-5 py-3">
			<Text accessibilityRole="header" className="flex-1 font-poppins-medium text-base text-white">
				{props.title}
			</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t.common.close}
				accessibilityState={{ disabled: !!props.disabled }}
				disabled={props.disabled}
				onPress={props.onClose}
				className={
					'h-12 w-12 items-center justify-center rounded-full bg-slate-800 ' + (props.disabled ? 'opacity-50' : '')
				}
			>
				<MaterialIcons name="close" size={24} color={colors.white} />
			</Pressable>
		</View>
	);
};

export default ImageModalHeader;
