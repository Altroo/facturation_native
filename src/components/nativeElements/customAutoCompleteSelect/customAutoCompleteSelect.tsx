import { useContext, useEffect, useRef, useState, type FC, type Key, type ReactNode } from 'react';
import {
	Keyboard,
	Text,
	Pressable,
	View,
	useWindowDimensions,
	type PressableProps,
	type GestureResponderEvent,
	type TextInputProps,
} from 'react-native';
import { AutocompleteDropdown, type IAutocompleteDropdownRef } from 'react-native-autocomplete-dropdown';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import type { DropDownType } from '@/types/accountTypes';
import { KeyboardSuggestionsContext } from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import { colors, inputTextStyle } from '@/utils/themes';

export type Props = {
	id?: string;
	label: string;
	labelActions?: ReactNode;
	required?: boolean;
	items: Array<DropDownType>;
	value: DropDownType | null;
	noOptionsText: string;
	// Preserve the original event/value callback with the real native press event.
	onChange?: (event: GestureResponderEvent, newValue: DropDownType | null) => void;
	onBlur?: TextInputProps['onBlur'];
	helperText?: string;
	error?: boolean;
	disabled?: boolean;
	cssClass?: string;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	renderOption?: (props: PressableProps & { key: Key }, option: DropDownType) => ReactNode;
};

const CustomAutoCompleteSelect: FC<Props> = (props: Props) => {
	const {
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
	} = props;
	const controller = useRef<IAutocompleteDropdownRef | null>(null);
	const onSuggestionsSpaceChange = useContext(KeyboardSuggestionsContext);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState<string | null>(null);
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const { height } = useWindowDimensions();
	const suggestionsHeight = Math.max(48, Math.min(240, height * 0.25, Math.max(items.length, 1) * 56));
	const dark = mode === 'dark';
	const expanded = open && !disabled;

	useEffect(() => {
		if (!disabled) return;
		controller.current?.close();
		controller.current?.blur();
	}, [disabled]);

	const options = items
		.filter((option) => option.code.toLowerCase().includes((inputValue ?? '').toLowerCase()))
		.map((option) => ({ id: option.value, title: option.code }));
	const close = () => {
		controller.current?.close();
		controller.current?.blur();
		onSuggestionsSpaceChange?.(0);
		setInputValue(null);
		Keyboard.dismiss();
	};
	const defaultRenderOption = (props: PressableProps & { key: Key }, option: DropDownType) => {
		const { key, ...rest } = props;
		return (
			<Pressable key={key} {...rest}>
				<Text className="font-sans text-ink dark:text-slate-100 flex-1 text-sm">
					{option.code}
					{option.archived ? ' (' + t.common.archived + ')' : ''}
				</Text>
				<View className="h-6 w-6 items-center justify-center">
					{value?.value === option.value && <MaterialIcons name="check-circle" size={22} color={colors.brand} />}
				</View>
			</Pressable>
		);
	};
	return (
		<View className={'gap-2 ' + (cssClass ?? '')}>
			{/* Field actions live beside the label so long names retain the input's width. */}
			<View className="flex-row items-center justify-between gap-2">
				<Text className="min-w-0 flex-1 text-ink dark:text-slate-100 font-poppins-medium text-sm">
					{label}
					{required ? ' *' : ''}
				</Text>
				{props.labelActions}
			</View>
			<View
				pointerEvents={disabled ? 'none' : 'auto'}
				onTouchEnd={(event) => event.stopPropagation()}
				style={{ opacity: disabled ? 0.5 : 1 }}
			>
				<AutocompleteDropdown
					controller={controller}
					dataSet={disabled ? null : options}
					useFilter={false}
					theme={mode}
					editable={!disabled}
					clearOnFocus={false}
					showChevron={false}
					showClear={false}
					enableLoadingIndicator={false}
					inputHeight={48}
					// Keep results below when the form can scroll to reserve their space.
					direction={onSuggestionsSpaceChange ? 'down' : undefined}
					suggestionsListMaxHeight={suggestionsHeight}
					onFocus={() => {
						if (!disabled) onSuggestionsSpaceChange?.(suggestionsHeight + 8);
					}}
					onOpenSuggestionsList={(next) => {
						setOpen(next);
						onSuggestionsSpaceChange?.(next ? suggestionsHeight + 8 : 0);
						if (!next) setInputValue(null);
					}}
					onBlur={(event) => {
						controller.current?.close();
						onSuggestionsSpaceChange?.(0);
						setInputValue(null);
						onBlur?.(event);
					}}
					LeftComponent={startIcon ? <View className="pl-3 pr-2">{startIcon}</View> : undefined}
					inputContainerStyle={{
						alignItems: 'center',
						borderRadius: 12,
						borderWidth: 1,
						borderColor: error ? colors.dangerBorder : dark ? colors.slate[600] : colors.slate[300],
						backgroundColor: dark ? colors.panel : colors.white,
					}}
					textInputProps={{
						nativeID: id,
						accessibilityRole: 'combobox',
						accessibilityLabel: label,
						accessibilityState: { disabled: !!disabled, expanded },
						value: inputValue ?? (value ? value.code + (value.archived ? ' (' + t.common.archived + ')' : '') : ''),
						onChangeText: (text) => {
							if (disabled) return;
							setInputValue(text);
							if (!open) void controller.current?.open();
						},
						placeholder: t.common.selectValue,
						placeholderTextColor: dark ? colors.slate[400] : colors.slate[500],
						selectTextOnFocus: true,
						autoCapitalize: 'none',
						autoCorrect: false,
						style: {
							...inputTextStyle,
							color: dark ? colors.slate[100] : colors.ink,
							paddingLeft: startIcon ? 0 : 12,
							paddingRight: value && expanded ? 88 : 44,
						},
					}}
					suggestionsListContainerStyle={{
						borderRadius: 12,
						borderWidth: 1,
						borderColor: dark ? colors.slate[600] : colors.slate[200],
						backgroundColor: dark ? colors.panel : colors.white,
					}}
					EmptyResultComponent={
						<Text className="font-sans py-4 text-center text-slate-400 dark:text-slate-100">{noOptionsText}</Text>
					}
					flatListProps={{
						keyboardShouldPersistTaps: 'handled',
						keyboardDismissMode: 'none',
						renderItem: ({ item }) => {
							const option = items.find((entry) => entry.value === item.id);
							if (!option) return null;
							return (
								<>
									{(renderOptionProp || defaultRenderOption)(
										{
											key: option.value,
											accessibilityRole: 'radio',
											accessibilityState: { checked: value?.value === option.value },
											disabled,
											onPress: (event) => {
												onChange?.(event, option);
												close();
											},
											className: 'min-h-11 flex-row items-center justify-between gap-3 px-3 py-3',
										},
										option,
									)}
								</>
							);
						},
					}}
				/>
				{value && open && !disabled && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.common.reset}
						onPress={(event) => {
							onChange?.(event, null);
							close();
						}}
						className="absolute right-11 top-0 h-12 w-11 items-center justify-center"
					>
						<MaterialIcons name="close" size={20} color={colors.slate[400]} />
					</Pressable>
				)}
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={label}
					accessibilityState={{ disabled: !!disabled, expanded }}
					disabled={disabled}
					onPress={() => {
						if (open) close();
						else {
							onSuggestionsSpaceChange?.(suggestionsHeight + 8);
							controller.current?.focus();
							void controller.current?.open();
						}
					}}
					className="absolute right-0 top-0 h-12 w-11 items-center justify-center"
				>
					{endIcon || (
						<MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={colors.slate[400]} />
					)}
				</Pressable>
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

export default CustomAutoCompleteSelect;
