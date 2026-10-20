import type { ReactNode } from 'react';
import { Platform, Switch, Text, View } from 'react-native';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
	startIcon?: ReactNode;
	helperText?: string;
};

const CustomSwitch = (props: Props) => (
	<View className="flex-row items-center gap-3 py-2">
		{props.startIcon && (
			<View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
				{props.startIcon}
			</View>
		)}
		<View className="flex-1 gap-1">
			<Text
				className={
					'font-poppins-medium text-sm ' +
					(props.disabled ? 'text-slate-500 dark:text-slate-400' : 'text-ink dark:text-slate-100')
				}
			>
				{props.label}
			</Text>
			{!!props.helperText && (
				<Text className="font-sans text-xs leading-5 text-slate-500 dark:text-slate-400">{props.helperText}</Text>
			)}
		</View>
		{/* Keep native geometry and an opaque thumb in the read-only state. */}
		<View
			accessible={props.disabled}
			accessibilityRole={props.disabled ? 'switch' : undefined}
			accessibilityLabel={props.disabled ? props.label : undefined}
			accessibilityState={props.disabled ? { disabled: true, checked: props.value } : undefined}
			pointerEvents={props.disabled ? 'none' : 'auto'}
			style={{ alignSelf: Platform.OS === 'ios' ? 'flex-start' : undefined }}
		>
			<Switch
				accessible={!props.disabled}
				accessibilityElementsHidden={props.disabled}
				importantForAccessibility={props.disabled ? 'no-hide-descendants' : 'auto'}
				accessibilityLabel={props.label}
				accessibilityState={{ disabled: false }}
				value={props.value}
				onValueChange={props.disabled ? undefined : props.onValueChange}
				trackColor={
					props.disabled
						? { false: colors.slate[400], true: colors.brandDisabled }
						: { false: colors.slate[300], true: colors.brand }
				}
				thumbColor={props.disabled ? colors.slate[200] : colors.white}
			/>
		</View>
	</View>
);

export default CustomSwitch;
