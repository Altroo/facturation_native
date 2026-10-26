import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { ValidatePricesHelper, getRemiseTypeItemsList, parseNumber } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import type { TypeRemiseType } from '@/types/devisTypes';

type Props = {
	currentType: TypeRemiseType;
	currentValue: number;
	devise: string;
	maximum: number;
	onApply: (type: TypeRemiseType, value: number) => void;
	onClose: () => void;
};

const GlobalRemiseModal = (props: Props) => {
	const { t } = useLanguage();
	const [type, setType] = useState(props.currentType);
	const [value, setValue] = useState(String(props.currentValue));
	const [error, setError] = useState('');
	const items = getRemiseTypeItemsList(t, props.devise);
	const apply = () => {
		const amount = parseNumber(value);
		const message = type
			? amount === null || amount < 0.01
				? t.globalRemiseModal.errorMin
				: ValidatePricesHelper.validateGlobalRemise(amount, type, props.maximum)
			: null;
		if (message) {
			setError(message);
			return;
		}
		props.onApply(type, type ? amount! : 0);
		props.onClose();
	};
	return (
		<BottomSheet
			visible
			title={t.globalRemiseModal.title}
			titleIcon={<MaterialIcons name="sell" size={22} color={colors.brand} />}
			testID="global-remise-modal"
			onClose={props.onClose}
		>
			<CustomDropDownSelect
				compact
				label={t.globalRemiseModal.typeLabel}
				startIcon={<MaterialIcons name="sell" size={20} color={colors.slate[400]} />}
				items={items}
				value={type}
				getOptionLabel={(value) => items.find((item) => item.value === value)?.code ?? value}
				onChange={(value) => {
					setType(value as TypeRemiseType);
					setError('');
				}}
			/>
			{!!type && (
				<CustomNumberInput
					compact
					max={type === 'Pourcentage' ? 100 : props.maximum}
					startIcon={
						<MaterialIcons name={type === 'Pourcentage' ? 'percent' : 'payments'} size={20} color={colors.slate[400]} />
					}
					label={
						type === 'Pourcentage'
							? t.globalRemiseModal.valuePercentLabel
							: t.globalRemiseModal.valueAmountLabel(props.devise)
					}
					keyboardType="decimal-pad"
					value={value}
					onChangeText={(next) => {
						setValue(next);
						setError('');
					}}
					error={!!error}
					helperText={
						error || (type === 'Pourcentage' ? t.globalRemiseModal.helperPercent : t.globalRemiseModal.helperAmount)
					}
				/>
			)}
			<PrimaryLoadingButton buttonText={t.globalRemiseModal.applyBtn} loading={false} active onClick={apply} />
		</BottomSheet>
	);
};

export default GlobalRemiseModal;
