import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
	label: string;
	icon?: ReactNode;
};

const CustomBadge = (props: Props) => (
	<View className="flex-row items-center gap-1.5 self-start rounded-full bg-blue-50 px-3 py-1.5 dark:bg-slate-800">
		{props.icon}
		<Text className="shrink font-poppins-medium text-xs text-brand dark:text-blue-300">{props.label}</Text>
	</View>
);

export default CustomBadge;
