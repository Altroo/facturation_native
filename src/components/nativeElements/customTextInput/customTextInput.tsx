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
import { colors, inputTextStyle } from '@/utils/themes';
import AiAssistantControl from '@/components/shared/aiAssistantControl/aiAssistantControl';
import { isAiTextField } from '@/utils/helpers';

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
	compact?: boolean;
	hideLockIcon?: boolean;
	ai?: boolean;
	aiContext?: string;
};

const CustomTextInput = (props: CustomTextInputProps) => {
	const {
		label,
		required,
		error,
		helperText,
		startIcon,
		endIcon,
		disabled,
		cssClass,
		compact,
		hideLockIcon,
		ai,
		aiContext,
		style,
		...restOfProps
	} = props;
	const { mode: theme } = useColorMode();
	const { fontScale } = useWindowDimensions();
	const lines = props.numberOfLines ?? 4;
	// Bound the visible area, rather than truncating the address or remark.
	// Longer content scrolls inside the input; larger system fonts still fit.
	const multilineStyle = props.multiline
		? { textAlignVertical: 'top' as const, lineHeight: 24, height: Math.ceil(lines * 24 * fontScale + 24) }
		: undefined;
	const scrollableValue = disabled && !props.multiline;
	const showAssistant =
		ai !== false &&
		!disabled &&
		!props.readOnly &&
		!props.secureTextEntry &&
		!!props.onChangeText &&
		(!props.keyboardType || props.keyboardType === 'default') &&
		isAiTextField(props.id ?? props.nativeID ?? '', props.multiline ? 'textarea' : 'text');
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
				'min-h-12 min-w-0 overflow-hidden text-ink dark:text-white ' +
				(compact ? 'px-2 py-2 ' : 'px-3 py-3 ') +
				(scrollableValue ? 'grow shrink-0 ' : 'flex-1 ')
			}
			style={[inputTextStyle, multilineStyle, style]}
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
				// The autocomplete provider treats bubbling touch-end events as outside
				// taps and blurs its last controller. Don't let an editing tap dismiss
				// Android's keyboard just as this field (or its step buttons) receives it.
				onTouchEnd={disabled || props.readOnly ? undefined : (event) => event.stopPropagation()}
				className={
					'min-w-0 flex-row items-center overflow-hidden rounded-xl border ' +
					(error ? 'border-red-500 ' : 'border-slate-300 dark:border-slate-600 ') +
					(disabled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-panel')
				}
			>
				{startIcon && (
					<View className={(compact ? 'pl-2 ' : 'pl-3 ') + (props.multiline ? 'self-start pt-3' : '')}>
						{startIcon}
					</View>
				)}
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
				{!endIcon && disabled && !hideLockIcon && (
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
			{showAssistant && (
				<AiAssistantControl
					value={props.value ?? ''}
					context={aiContext ?? 'form'}
					maxLength={props.maxLength}
					onApply={(value) => props.onChangeText?.(value)}
				/>
			)}
		</View>
	);
};

CustomTextInput.displayName = 'CustomTextInput';
export default CustomTextInput;
