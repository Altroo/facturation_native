import { type FC } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/formikElements/customAutoCompleteSelect/customAutoCompleteSelect';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import type { AddManagedBySectionProps } from '@/types/companyTypes';

const AddManagedBySection: FC<AddManagedBySectionProps> = ({
	title,
	selectId,
	selectLabel,
	selectItems,
	selectValue,
	onSelectChange,
	selectIcon,
	roleId,
	roleLabel,
	roleOptions,
	roleValue,
	onRoleChange,
	roleIcon,
	onAdd,
	isAddDisabled,
	disabled,
	sx,
}) => {
	const { t } = useLanguage();
	return (
		<View
			accessibilityLabel={title}
			className="mt-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700"
			style={sx}
		>
			<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">{title}</Text>
			<CustomAutoCompleteSelect
				id={selectId}
				label={selectLabel}
				items={selectItems}
				value={selectValue}
				onChange={onSelectChange}
				startIcon={selectIcon}
				noOptionsText={t.common.noResults}
				disabled={disabled}
			/>
			<CustomDropDownSelect
				id={roleId}
				label={roleLabel}
				items={roleOptions}
				value={roleValue}
				onChange={onRoleChange}
				startIcon={roleIcon}
				disabled={disabled}
			/>
			<PrimaryLoadingButton
				buttonText={t.common.add}
				inverted
				onClick={onAdd}
				active={!disabled && !isAddDisabled}
				loading={false}
				startIcon={<MaterialIcons name="add" size={20} color="#0274d7" />}
			/>
		</View>
	);
};

export default AddManagedBySection;
