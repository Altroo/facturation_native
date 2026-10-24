import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	onEdit?: () => void;
	onDelete?: () => void;
	onSuspend?: () => void;
	disabled?: boolean;
	loading?: boolean;
};

// Pages provide only the actions their permissions allow. They keep their own
// navigation, confirmation and API logic; this row owns the common presentation.
const DetailsPageActions = (props: Props) => {
	const { t } = useLanguage();
	const actions = [
		{ label: t.common.delete, icon: 'delete-outline', onClick: props.onDelete, danger: true },
		{ label: t.companies.suspendBtn, icon: 'block', onClick: props.onSuspend, danger: true },
		{ label: t.common.edit, icon: 'edit', onClick: props.onEdit, danger: false },
	] as const;
	const availableActions = actions.filter((action) => action.onClick);
	if (!availableActions.length) return null;
	return (
		<View testID="details-page-actions" className="flex-row items-center gap-3">
			{availableActions.map((action) => (
				<PrimaryLoadingButton
					key={action.icon}
					buttonText={action.label}
					loading={action.danger && !!props.loading}
					active={!props.disabled && !props.loading}
					inverted={action.danger}
					danger={action.danger}
					iconOnly={action.danger && !!props.onEdit}
					cssClass={action.danger && props.onEdit ? undefined : 'flex-1'}
					onClick={action.onClick}
					startIcon={
						<MaterialIcons name={action.icon} size={20} color={action.danger ? colors.danger : colors.brand} />
					}
				/>
			))}
		</View>
	);
};

export default DetailsPageActions;
