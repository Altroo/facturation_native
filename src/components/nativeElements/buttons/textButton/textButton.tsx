import type { FC, ReactNode } from 'react';
import { Pressable, Text, type GestureResponderEvent } from 'react-native';

type Props = {
	buttonText: string;
	disabled?: boolean;
	onClick: (event: GestureResponderEvent) => void;
	startIcon?: ReactNode;
	cssClass?: string;
};

const TextButton: FC<Props> = (props: Props) => (
	<Pressable
		accessibilityRole="link"
		accessibilityLabel={props.buttonText}
		accessibilityState={{ disabled: !!props.disabled }}
		disabled={props.disabled}
		onPress={props.onClick}
		hitSlop={6}
		className={
			'min-w-0 self-start flex-row items-center gap-2 rounded-md py-1 active:opacity-70 ' + (props.cssClass ?? '')
		}
	>
		{props.startIcon}
		<Text className="shrink font-poppins-semibold text-sm leading-6 text-brand dark:text-blue-300">
			{props.buttonText}
		</Text>
	</Pressable>
);

export default TextButton;
