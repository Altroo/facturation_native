import { useState } from 'react';
import CustomTextInput, { type CustomTextInputProps } from '@/components/nativeElements/customTextInput/customTextInput';
import { formatNumberWithSpaces, parseFormattedNumber } from '@/utils/helpers';

type Props = Omit<CustomTextInputProps, 'value' | 'onChangeText'> & {
	value: string | number | null | undefined;
	onChangeText: (value: string) => void;
	decimals?: number;
};

const FormattedNumberInput = (props: Props) => {
	const { value, onChangeText, decimals = 2, onBlur, onFocus, ...inputProps } = props;
	const [isFocused, setIsFocused] = useState(false);
	const [editValue, setEditValue] = useState({ draft: '', value: '' });
	// Match the web: group amounts outside editing, and keep the keyboard draft
	// intact while typing so decimal separators and cursor position stay natural.
	const rawValue = value === null || value === undefined ? '' : String(value);
	// Native quantity fields also have step buttons. If one changes the parent
	// value while the input is focused, show that new value rather than an old draft.
	const displayValue = isFocused
		? rawValue === editValue.value
			? editValue.draft
			: rawValue
		: formatNumberWithSpaces(value, decimals);
	return (
		<CustomTextInput
			{...inputProps}
			keyboardType={props.keyboardType ?? 'decimal-pad'}
			value={displayValue}
			onChangeText={(text) => {
				const parsed = parseFormattedNumber(/[.,]$/.test(text) ? `${text}0` : text);
				const next = parsed === null ? text : String(parsed);
				setEditValue({ draft: text, value: next });
				onChangeText(next);
			}}
			onFocus={(event) => {
				const raw = value === null || value === undefined ? '' : String(value);
				const parsed = parseFormattedNumber(raw);
				setEditValue({ draft: parsed === null ? raw : String(parsed), value: raw });
				setIsFocused(true);
				onFocus?.(event);
			}}
			onBlur={(event) => {
				setIsFocused(false);
				setEditValue({ draft: '', value: '' });
				onBlur?.(event);
			}}
		/>
	);
};

export default FormattedNumberInput;
