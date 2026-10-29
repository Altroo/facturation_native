import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomTextInput, {
	type CustomTextInputProps,
} from '@/components/nativeElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	numberInput: CustomTextInputProps;
	yearInput?: CustomTextInputProps;
	reset?: { loading: boolean; disabled: boolean; onPress: () => void };
};

// Keep the compact number/year row and full-width reset action identical in
// every document form. Credit-note numbering stays read-only on the backend.
const CompanyDocumentNumberFields = (props: Props) => {
	const { t } = useLanguage();
	return (
		<>
			<View className="flex-row items-start gap-3">
				<View className="min-w-0 flex-1">
					<CustomTextInput
						{...props.numberInput}
						label={t.documentForm.fieldNumeroLabel}
						keyboardType={props.numberInput.keyboardType ?? 'default'}
						compact
						startIcon={<MaterialIcons name="tag" size={20} color={colors.slate[400]} />}
					/>
				</View>
				{props.yearInput && (
					<View className="w-20">
						<CustomTextInput
							{...props.yearInput}
							label={t.documentForm.fieldAnneeLabel}
							keyboardType={props.yearInput.keyboardType ?? 'number-pad'}
							compact
							startIcon={<MaterialIcons name="event" size={20} color={colors.slate[400]} />}
						/>
					</View>
				)}
			</View>
			{props.reset && (
				<PrimaryLoadingButton
					buttonText={t.documentForm.resetNumero}
					loading={props.reset.loading}
					active={!props.reset.disabled && !props.reset.loading}
					inverted
					startIcon={<MaterialIcons name="refresh" size={20} color={colors.slate[400]} />}
					onClick={props.reset.onPress}
				/>
			)}
		</>
	);
};

export default CompanyDocumentNumberFields;
