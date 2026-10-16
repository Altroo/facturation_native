import { useState, type FC, type Key } from 'react';
import { Text, TextInput, Pressable, ScrollView, View, type PressableProps } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import type { CustomAutoCompleteSelectProps as Props } from '@/types/uiTypes';
import type { DropDownType } from '@/types/accountTypes';

const CustomAutoCompleteSelect: FC<Props> = ({
	id,
	label,
	items,
	value,
	onChange,
	disabled,
	startIcon,
	endIcon,
	noOptionsText,
	onBlur,
	error,
	helperText,
	required,
	cssClass,
	renderOption: renderOptionProp,
}) => {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const { t } = useLanguage();
	const defaultRenderOption = (props: PressableProps & { key: Key }, option: DropDownType) => {
		const { key, ...rest } = props;
		return (
			<Pressable key={key} {...rest}>
				<Text className="font-sans text-ink dark:text-slate-100 flex-1 text-sm">
					{option.code}
					{option.archived ? ' (' + t.common.archived + ')' : ''}
				</Text>
				{value?.value === option.value && <MaterialIcons name="check-circle" size={22} color="#0274d7" />}
			</Pressable>
		);
	};
	const { mode } = useColorMode();
	const showSearch = items.length > 5;
	const close = () => {
		setOpen(false);
		setInputValue('');
	};
	const options = showSearch
		? items.filter((option) => option.code.toLowerCase().includes(inputValue.toLowerCase()))
		: items;
	return (
		<View className={'gap-2 ' + (cssClass ?? '')}>
			<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
				{label}
				{required ? ' *' : ''}
			</Text>
			<Pressable
				nativeID={id}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled: !!disabled, expanded: open && !disabled }}
				disabled={disabled}
				onPress={() => (open ? close() : setOpen(true))}
				className={
					'min-h-12 flex-row items-center gap-3 rounded-xl border bg-white p-3 dark:bg-panel ' +
					(error ? 'border-red-500 ' : 'border-slate-300 dark:border-slate-600 ') +
					(disabled ? 'opacity-50' : '')
				}
			>
				{startIcon}
				<Text className={'font-sans flex-1 text-sm ' + (value ? 'text-ink dark:text-slate-100' : 'text-slate-400')}>
					{value ? value.code + (value.archived ? ' (' + t.common.archived + ')' : '') : t.common.selectValue}
				</Text>
				{endIcon || <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color="#94a3b8" />}
			</Pressable>
			{!!helperText && (
				<Text
					accessibilityRole={error ? 'alert' : undefined}
					className={
						error
							? 'font-sans text-xs text-red-600 dark:text-red-300'
							: 'font-sans text-xs text-slate-500 dark:text-slate-400'
					}
				>
					{helperText}
				</Text>
			)}
			{open && !disabled && (
				<View
					testID="autocomplete-options"
					className="gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-panel"
				>
					{showSearch && (
						<TextInput
							accessibilityLabel={t.common.search}
							value={inputValue}
							onChangeText={setInputValue}
							onBlur={onBlur}
							editable={!disabled}
							placeholder={t.common.search}
							placeholderTextColor={mode === 'dark' ? '#94a3b8' : '#64748b'}
							autoCapitalize="none"
							autoCorrect={false}
							className="min-h-12 rounded-xl border border-slate-300 px-4 py-3 font-sans text-base text-ink dark:border-slate-600 dark:text-white"
						/>
					)}
					<ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
						{!options.length && (
							<Text className="font-sans dark:text-slate-100 py-6 text-center text-slate-400">{noOptionsText}</Text>
						)}
						{options.map((option) =>
							(renderOptionProp || defaultRenderOption)(
								{
									key: option.value,
									accessibilityRole: 'radio',
									accessibilityState: { checked: value?.value === option.value },
									disabled,
									onPress: (event) => {
										onChange?.(event, option);
										close();
									},
									className:
										'min-h-14 flex-row items-center justify-between gap-3 border-b border-slate-100 py-4 dark:border-slate-700',
								},
								option,
							),
						)}
					</ScrollView>

					{!!value && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.reset}
							onPress={(event) => {
								onChange?.(event, null);
								close();
							}}
							className="min-h-11 justify-center border-t border-slate-200 px-3 py-3 dark:border-slate-600"
						>
							<Text className="font-poppins-medium text-brand dark:text-blue-300">{t.common.reset}</Text>
						</Pressable>
					)}
				</View>
			)}
		</View>
	);
};

export default CustomAutoCompleteSelect;
