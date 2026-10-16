import { useState, type FC } from 'react';
import { Text, Pressable, ScrollView, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import type { CustomDropDownSelectProps as Props } from '@/types/uiTypes';

const CustomDropDownSelect: FC<Props> = (props: Props) => {
	const [open, setOpen] = useState(false);
	const { t } = useLanguage();
	return (
		<View className={'gap-2 ' + (props.cssClass ?? '')}>
			<Text className="text-ink dark:text-slate-100 font-poppins-medium text-sm">
				{props.label}
				{props.required ? ' *' : ''}
			</Text>
			<Pressable
				nativeID={props.id}
				accessibilityRole="button"
				accessibilityLabel={props.label}
				accessibilityState={{ disabled: !!props.disabled, expanded: open && !props.disabled }}
				disabled={props.disabled}
				onPress={() => setOpen((current) => !current)}
				onBlur={props.onBlur}
				className={
					'min-h-12 flex-row items-center gap-3 rounded-xl border bg-white p-3 dark:bg-panel ' +
					(props.error ? 'border-red-500 ' : 'border-slate-300 dark:border-slate-600 ') +
					(props.disabled ? 'opacity-50' : '')
				}
			>
				{props.startIcon}
				<Text
					className={'font-sans flex-1 text-sm ' + (props.value ? 'text-ink dark:text-slate-100' : 'text-slate-400')}
				>
					{props.value || t.common.selectValue}
				</Text>
				{props.endIcon || <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={22} color="#94a3b8" />}
			</Pressable>
			{open && !props.disabled && (
				<View
					testID="dropdown-options"
					className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600 dark:bg-panel"
				>
					<ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
						{!props.items.length && (
							<Text className="font-sans py-4 text-center text-slate-400">{t.common.noOptions}</Text>
						)}
						{props.items.map((item, index) => {
							const isObject = typeof item === 'object' && item !== null && 'value' in item;
							const value = isObject ? item.value : item;
							return (
								<Pressable
									key={index}
									accessibilityRole="radio"
									accessibilityState={{ checked: props.value === value }}
									onPress={() => {
										props.onChange?.(value);
										setOpen(false);
									}}
									className="min-h-11 flex-row items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-700"
								>
									<Text
										className={
											'flex-1 text-sm ' +
											(props.value === value
												? 'font-poppins-medium text-brand dark:text-blue-300'
												: 'font-sans text-ink dark:text-slate-100')
										}
									>
										{value || t.common.selectValue}
									</Text>
									{props.value === value && <MaterialIcons name="check-circle" size={20} color="#0274d7" />}
								</Pressable>
							);
						})}
					</ScrollView>
				</View>
			)}
			{!!props.helperText && (
				<Text
					accessibilityRole={props.error ? 'alert' : undefined}
					className={
						props.error
							? 'font-sans text-xs text-red-600 dark:text-red-300'
							: 'font-sans text-xs text-slate-500 dark:text-slate-400'
					}
				>
					{props.helperText}
				</Text>
			)}
		</View>
	);
};

export default CustomDropDownSelect;
