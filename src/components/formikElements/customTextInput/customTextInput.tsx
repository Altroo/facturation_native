import type { ReactNode, Ref } from 'react';
import { useColorMode } from '@/providers/themeProvider';
import { ScrollView, Text, TextInput, View, type TextInputProps, type TextInputInstance } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

export type CustomTextInputProps = Omit<TextInputProps, 'editable'> & {
	ref?: Ref<TextInputInstance>;
	label?: string;
	required?: boolean;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	cssClass?: string;
};

const CustomTextInput = (props: CustomTextInputProps) => {
	const { label, required, error, helperText, startIcon, endIcon, disabled, cssClass, style, ...restOfProps } = props;
	const { mode: theme } = useColorMode();
	const scrollableValue = disabled && !props.multiline;
	const input = (
		<TextInput
			{...restOfProps}
			editable={!disabled}
			accessibilityLabel={props.accessibilityLabel ?? label}
			accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
			placeholderTextColor={theme === 'dark' ? colors.slate[400] : colors.slate[500]}
			lineBreakModeIOS={props.lineBreakModeIOS ?? (props.multiline ? 'wordWrapping' : 'clip')}
			className={
				'min-h-12 min-w-0 px-4 py-3 font-sans text-base text-ink dark:text-white ' +
				(scrollableValue ? 'grow shrink-0 ' : 'flex-1 ') +
				(props.multiline ? 'min-h-28' : '')
			}
			style={[props.multiline ? { textAlignVertical: 'top' } : undefined, style]}
		/>
	);
	return (
		<View className={'gap-2 ' + (cssClass ?? '')}>
			{!!label && (
				<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
					{label}
					{required ? ' *' : ''}
				</Text>
			)}
			<View
				className={
					'flex-row items-center rounded-xl border ' +
					(error ? 'border-red-500 ' : 'border-slate-300 dark:border-slate-600 ') +
					(disabled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-panel')
				}
			>
				{startIcon && <View className="pl-3">{startIcon}</View>}
				{scrollableValue ? (
					<ScrollView
						horizontal
						className="min-w-0 flex-1"
						contentContainerStyle={{ flexGrow: 1 }}
						showsHorizontalScrollIndicator={false}
						keyboardShouldPersistTaps="handled"
					>
						{input}
					</ScrollView>
				) : (
					input
				)}
				{endIcon}
				{!endIcon && (
					<View className="w-7 justify-center">
						{disabled && <MaterialIcons name="lock-outline" size={16} color={colors.slate[400]} />}
					</View>
				)}
			</View>
			{!!helperText && (
				<Text
					accessibilityRole={error ? 'alert' : undefined}
					className={
						'font-sans text-xs leading-5 ' +
						(error ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400')
					}
				>
					{helperText}
				</Text>
			)}
		</View>
	);
};

CustomTextInput.displayName = 'CustomTextInput';
export default CustomTextInput;
