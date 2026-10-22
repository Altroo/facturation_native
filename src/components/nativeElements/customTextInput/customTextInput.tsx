import type { ReactNode, Ref } from 'react';
import { useColorMode } from '@/providers/themeProvider';
import {
	ScrollView,
	Text,
	TextInput,
	View,
	useWindowDimensions,
	type TextInputProps,
	type TextInputInstance,
} from 'react-native';
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
	const { fontScale } = useWindowDimensions();
	const lines = props.numberOfLines ?? 4;
	// Bound the visible area, rather than truncating the address or remark.
	// Longer content scrolls inside the input; larger system fonts still fit.
	const multilineStyle = props.multiline
		? { textAlignVertical: 'top' as const, lineHeight: 24, height: Math.ceil(lines * 24 * fontScale + 24) }
		: undefined;
	const scrollableValue = disabled && !props.multiline;
	// Clip native text at the input bounds so long values cannot cover icons or
	// neighbouring fields. Keep the complete value and native scrolling intact.
	const input = (
		<TextInput
			{...restOfProps}
			editable={!disabled}
			accessibilityLabel={props.accessibilityLabel ?? label}
			accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
			placeholderTextColor={theme === 'dark' ? colors.slate[400] : colors.slate[500]}
			lineBreakModeIOS={props.lineBreakModeIOS ?? (props.multiline ? 'wordWrapping' : 'clip')}
			numberOfLines={props.multiline ? lines : props.numberOfLines}
			scrollEnabled={props.scrollEnabled ?? true}
			className={
				'min-h-12 min-w-0 overflow-hidden px-4 py-3 font-sans text-base text-ink dark:text-white ' +
				(scrollableValue ? 'grow shrink-0 ' : 'flex-1 ')
			}
			style={[multilineStyle, style]}
		/>
	);
	return (
		<View className={'min-w-0 gap-2 ' + (cssClass ?? '')}>
			{!!label && (
				<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
					{label}
					{required ? ' *' : ''}
				</Text>
			)}
			<View
				className={
					'min-w-0 flex-row items-center overflow-hidden rounded-xl border ' +
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
				{!endIcon && disabled && (
					<View className="w-7 justify-center">
						<MaterialIcons name="lock-outline" size={16} color={colors.slate[400]} />
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
