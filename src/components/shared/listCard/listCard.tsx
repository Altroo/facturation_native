import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import CustomCheckbox from '@/components/nativeElements/customCheckbox/customCheckbox';
import { useColorMode } from '@/providers/themeProvider';
import { cardShadows, listSpacing, surfaceStyles } from '@/utils/themes';

type Props = {
	children: ReactNode;
	header?: ReactNode;
	selection?: ComponentProps<typeof CustomCheckbox>;
	actions?: ReactNode;
	testID?: string;
	onPress?: () => void;
	accessibilityLabel?: string;
	disabled?: boolean;
};

const ListCard = (props: Props) => {
	const { mode } = useColorMode();
	return (
		<View style={{ paddingVertical: listSpacing / 2 }}>
			<View testID={props.testID} className="gap-3 p-4" style={[surfaceStyles[mode], cardShadows[mode]]}>
				{!props.header && (props.selection || props.actions) && (
					<View className="-my-1 flex-row items-center justify-between gap-3">
						<View className="min-w-0 flex-1">{props.selection && <CustomCheckbox {...props.selection} compact />}</View>
						{props.actions}
					</View>
				)}
				{!!props.header && (
					<View className="flex-row items-center">
						{props.selection && <CustomCheckbox {...props.selection} compact />}
						<View className="min-h-11 min-w-0 flex-1 justify-center">
							{props.onPress ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={props.accessibilityLabel}
									accessibilityState={{ disabled: !!props.disabled }}
									disabled={props.disabled}
									onPress={props.onPress}
									className="active:opacity-75"
								>
									{props.header}
								</Pressable>
							) : (
								props.header
							)}
						</View>
						{props.actions}
					</View>
				)}
				{props.onPress ? (
					<Pressable
						accessible={!props.header}
						accessibilityRole={props.header ? undefined : 'button'}
						accessibilityLabel={props.header ? undefined : props.accessibilityLabel}
						accessibilityState={{ disabled: !!props.disabled }}
						disabled={props.disabled}
						onPress={props.onPress}
						className="gap-3 active:opacity-75"
					>
						{props.children}
					</Pressable>
				) : (
					props.children
				)}
			</View>
		</View>
	);
};

export default ListCard;
