import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomMenu from '@/components/nativeElements/customMenu/customMenu';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';

type Props = {
	onEdit?: () => void;
	onArchive?: () => void;
	onDelete?: () => void;
	onSuspend?: () => void;
	disabled?: boolean;
};

const ListCardActions = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const danger = mode === 'dark' ? colors.dangerDarkForeground : colors.danger;
	return (
		<CustomMenu
			label={t.common.moreActions}
			disabled={props.disabled}
			actions={[
				...(props.onEdit
					? [
							{
								label: t.common.edit,
								onClick: props.onEdit,
								icon: <MaterialIcons name="edit" size={22} color={colors.brand} />,
							},
						]
					: []),
				...(props.onArchive
					? [
							{
								label: t.common.archive,
								onClick: props.onArchive,
								color: colors.warning,
								icon: <MaterialIcons name="archive" size={22} color={colors.warning} />,
							},
						]
					: []),
				...(props.onSuspend
					? [
							{
								label: t.companies.suspendBtn,
								onClick: props.onSuspend,
								color: danger,
								destructive: true,
								icon: <MaterialIcons name="block" size={22} color={danger} />,
							},
						]
					: []),
				...(props.onDelete
					? [
							{
								label: t.common.delete,
								onClick: props.onDelete,
								color: danger,
								destructive: true,
								icon: <MaterialIcons name="delete-outline" size={22} color={danger} />,
							},
						]
					: []),
			]}
		/>
	);
};

export default ListCardActions;
