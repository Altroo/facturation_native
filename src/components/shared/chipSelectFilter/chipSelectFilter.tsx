import { useState, type ComponentProps } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';
import { colors, surfaceStyles } from '@/utils/themes';
import { useColorMode } from '@/providers/themeProvider';

type Props = {
	label: string;
	icon?: ComponentProps<typeof MaterialIcons>['name'];
	options: Array<{ id: number; nom: string }>;
	selectedIds: number[];
	onChange: (ids: number[]) => void;
	placeholder: string;
	disabled?: boolean;
};

const ChipSelectFilter = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const selectedOptions = props.options.filter((option) => props.selectedIds.includes(option.id));
	// This search narrows selector choices only. The list sends selected IDs to Django.
	const options = props.options.filter((option) =>
		option.nom.toLocaleLowerCase().includes(inputValue.trim().toLocaleLowerCase()),
	);

	return (
		<View className="gap-2">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={props.label}
				accessibilityState={{ disabled: !!props.disabled, expanded: open }}
				disabled={props.disabled}
				onPress={() => {
					setInputValue('');
					setOpen(true);
				}}
				className="min-h-12 flex-row items-center gap-3 px-3 py-2"
				style={surfaceStyles[mode]}
			>
				<MaterialIcons name={props.icon ?? 'location-on'} size={20} color={colors.brand} />
				<Text className="flex-1 font-sans text-sm text-ink dark:text-slate-100">
					{selectedOptions.length ? selectedOptions.map((option) => option.nom).join(', ') : props.placeholder}
				</Text>
				<MaterialIcons name="expand-more" size={22} color={colors.slate[400]} />
			</Pressable>
			<BottomSheet
				visible={open && !props.disabled}
				title={props.label}
				onClose={() => setOpen(false)}
				testID="chip-select-filter"
			>
				<CustomTextInput
					accessibilityLabel={t.common.search}
					placeholder={t.common.search}
					value={inputValue}
					onChangeText={setInputValue}
					autoCorrect={false}
				/>
				{!!props.selectedIds.length && (
					<Pressable accessibilityRole="button" onPress={() => props.onChange([])} className="min-h-11 justify-center">
						<Text className="font-poppins-medium text-brand dark:text-blue-300">{t.shared.clearSelection}</Text>
					</Pressable>
				)}
				<FlatList
					data={options}
					keyExtractor={(option) => String(option.id)}
					style={{ flexGrow: 0, flexShrink: 1 }}
					keyboardShouldPersistTaps="handled"
					ListEmptyComponent={
						<Text className="py-4 font-sans text-slate-500 dark:text-slate-400">{t.common.noOptions}</Text>
					}
					renderItem={({ item }) => {
						const checked = props.selectedIds.includes(item.id);
						return (
							<Pressable
								accessibilityRole="checkbox"
								accessibilityLabel={item.nom}
								accessibilityState={{ checked }}
								onPress={() =>
									props.onChange(
										checked ? props.selectedIds.filter((id) => id !== item.id) : [...props.selectedIds, item.id],
									)
								}
								className="min-h-12 flex-row items-center gap-3 border-b border-slate-100 py-3 dark:border-slate-700"
							>
								<MaterialIcons
									name={checked ? 'check-box' : 'check-box-outline-blank'}
									size={24}
									color={checked ? colors.brand : colors.slate[400]}
								/>
								<Text className="flex-1 font-sans text-base text-ink dark:text-slate-100">{item.nom}</Text>
							</Pressable>
						);
					}}
				/>
			</BottomSheet>
		</View>
	);
};

export default ChipSelectFilter;
