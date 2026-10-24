import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import type { TypeRemiseType } from '@/types/devisTypes';

type Props = {
	type: TypeRemiseType;
	value: number;
	devise: string;
	disabled: boolean;
	error?: string;
	onApply: () => void;
	onRemove: () => void;
};

// Reuse the native discount row inside the totals card rather than creating
// another card with large Apply/Remove buttons on each document form.
const CompanyDocumentRemiseControls = (props: Props) => {
	const { t } = useLanguage();
	const icon = (name: 'sell' | 'edit' | 'add' | 'close') => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	return (
		<>
			<View className="flex-row items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
				<MaterialIcons name="sell" size={20} color={colors.brand} />
				<View className="min-w-0 flex-1 gap-1">
					<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">
						{t.documentForm.remiseGlobaleSection}
					</Text>
					<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
						{props.type
							? `${formatNumberWithSpaces(props.value, 2)} ${props.type === 'Pourcentage' ? '%' : props.devise}`
							: t.globalRemiseModal.typeNone}
					</Text>
				</View>
				<PrimaryLoadingButton
					buttonText={t.documentForm.applyGlobalRemise}
					loading={false}
					active={!props.disabled}
					iconOnly
					inverted
					startIcon={icon(props.type ? 'edit' : 'add')}
					onClick={props.onApply}
				/>
				{!!props.type && (
					<PrimaryLoadingButton
						buttonText={t.documentForm.removeGlobalRemise}
						loading={false}
						active={!props.disabled}
						iconOnly
						inverted
						danger
						startIcon={icon('close')}
						onClick={props.onRemove}
					/>
				)}
			</View>
			{!!props.error && <Text className="font-sans text-xs text-red-600 dark:text-red-300">{props.error}</Text>}
		</>
	);
};

export default CompanyDocumentRemiseControls;
