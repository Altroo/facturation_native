import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format } from 'date-fns';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
	minimumDate?: string;
	maximumDate?: string;
};

const parseDate = (value?: string) => {
	const date = new Date(value + 'T12:00:00');
	return Number.isFinite(date.getTime()) ? date : undefined;
};

const CustomDateInput = (props: Props) => {
	const { t, language } = useLanguage();
	const { mode } = useColorMode();
	const [draftDate, setDraftDate] = useState<Date | null>(null);
	if (props.disabled && draftDate !== null) setDraftDate(null);
	const open = draftDate !== null;
	const date = parseDate(props.value);
	const minimumDate = parseDate(props.minimumDate);
	const maximumDate = parseDate(props.maximumDate);
	const constrainDate = (selected: Date) => {
		if (minimumDate && selected < minimumDate) return minimumDate;
		if (maximumDate && selected > maximumDate) return maximumDate;
		return selected;
	};
	const confirmDate = (selected: Date) => {
		// Keep a local calendar date; converting through UTC can shift the day.
		props.onChange(format(constrainDate(selected), 'yyyy-MM-dd'));
		setDraftDate(null);
	};
	const picker = (
		<DateTimePicker
			testID={'date-picker-' + props.label}
			value={constrainDate(draftDate ?? date ?? new Date())}
			minimumDate={minimumDate}
			maximumDate={maximumDate}
			mode="date"
			display={Platform.OS === 'ios' ? 'spinner' : 'default'}
			themeVariant={mode}
			locale={language}
			onValueChange={(_event, selected) => {
				// The iOS wheel emits changes while scrolling. Keep them temporary
				// until "Terminé". Android emits this event after its dialog confirms.
				if (Platform.OS === 'ios') setDraftDate(constrainDate(selected));
				else confirmDate(selected);
			}}
			onDismiss={() => setDraftDate(null)}
		/>
	);
	return (
		<View className="gap-2">
			{Platform.OS === 'web' ? (
				<CustomTextInput
					label={props.label}
					startIcon={<MaterialIcons name="calendar-today" size={20} color={colors.slate[400]} />}
					placeholder="YYYY-MM-DD"
					value={props.value}
					onChangeText={props.onChange}
					disabled={props.disabled}
					error={props.error}
					helperText={props.helperText}
				/>
			) : (
				<>
					<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{props.label}</Text>
					<View
						className={
							'min-h-12 flex-row items-center rounded-xl border bg-white dark:bg-panel ' +
							(props.error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600')
						}
					>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={props.label}
							accessibilityState={{ disabled: !!props.disabled, expanded: open }}
							disabled={props.disabled}
							onPress={() => {
								// Seed the draft on every opening. Confirming without moving the
								// wheel must still save the date initially displayed by the picker.
								// Today can fall outside the other field's limit. Start within
								// that range so confirming the default always gives a valid date.
								setDraftDate(open ? null : constrainDate(date ?? new Date()));
							}}
							className="min-h-12 min-w-0 flex-1 flex-row items-center gap-2 px-2"
						>
							<MaterialIcons name="calendar-today" size={20} color={colors.slate[400]} />
							<Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-sm text-ink dark:text-slate-100">
								{date ? format(date, 'dd/MM/yyyy') : t.common.selectValue}
							</Text>
						</Pressable>
						{!!props.value && (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={`${t.common.reset} (${props.label})`}
								disabled={props.disabled}
								onPress={() => props.onChange('')}
								className="min-h-12 min-w-11 items-center justify-center"
							>
								<MaterialIcons name="close" size={20} color={colors.slate[400]} />
							</Pressable>
						)}
					</View>
					{!!props.helperText && (
						<Text
							className={
								props.error
									? 'font-sans text-xs text-red-600 dark:text-red-300'
									: 'font-sans text-xs text-slate-500 dark:text-slate-400'
							}
						>
							{props.helperText}
						</Text>
					)}
				</>
			)}
			{open &&
				!props.disabled &&
				Platform.OS !== 'web' &&
				(Platform.OS === 'ios' ? (
					// The spinner needs the full phone width, even when the field sits
					// beside another field. Reuse our modal rather than overflowing it.
					<BottomSheet
						visible
						title={props.label}
						onClose={() => setDraftDate(null)}
						testID={'date-sheet-' + props.label}
					>
						{picker}
						<PrimaryLoadingButton
							buttonText={t.dataGrid.done}
							loading={false}
							active
							inverted
							onClick={() => {
								if (draftDate) confirmDate(draftDate);
							}}
						/>
					</BottomSheet>
				) : (
					picker
				))}
		</View>
	);
};

export default CustomDateInput;
