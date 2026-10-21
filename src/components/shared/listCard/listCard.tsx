import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import CustomCheckbox from '@/components/nativeElements/customCheckbox/customCheckbox';

type Props = {
	children: ReactNode;
	selection?: ComponentProps<typeof CustomCheckbox>;
	actions?: ReactNode;
	testID?: string;
};

const ListCard = (props: Props) => (
	<View className="py-2">
		<View
			testID={props.testID}
			className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel"
		>
			{props.selection && <CustomCheckbox {...props.selection} />}
			{props.children}
			{props.actions}
		</View>
	</View>
);

export default ListCard;
