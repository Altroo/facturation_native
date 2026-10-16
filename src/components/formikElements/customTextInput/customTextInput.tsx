import { useColorMode } from '@/providers/themeProvider';
import { Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { CustomTextInputProps as Props } from '@/types/uiTypes';

const CustomTextInput = (props: Props) => {
	const { label, required, error, helperText, startIcon, endIcon, disabled, cssClass, style, ...restOfProps } = props;
	const { mode: theme } = useColorMode();
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
				<TextInput
					{...restOfProps}
					editable={!disabled}
					accessibilityLabel={props.accessibilityLabel ?? label}
					accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
					placeholderTextColor={theme === 'dark' ? '#94a3b8' : '#64748b'}
					className={
						'min-h-12 flex-1 px-4 py-3 font-sans text-base text-ink dark:text-white ' +
						(props.multiline ? 'min-h-28' : '')
					}
					style={[props.multiline ? { textAlignVertical: 'top' } : undefined, style]}
				/>
				{endIcon}
				{disabled && !endIcon && (
					<View className="pr-3">
						<MaterialIcons name="lock-outline" size={16} color="#94a3b8" />
					</View>
				)}
			</View>
			{!!helperText && (
				<Text
					accessibilityRole={error ? 'alert' : undefined}
					className={
						error
							? 'font-sans text-xs text-red-600 dark:text-red-300'
							: 'font-sans text-xs leading-5 text-slate-500 dark:text-slate-400'
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
