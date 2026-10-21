import type { ReactNode } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	title: string;
	body: string;
	confirmText: string;
	onConfirm: () => void;
	onClose: () => void;
	loading?: boolean;
	action?: 'delete' | 'suspend' | 'archive';
	children?: ReactNode;
};

const ConfirmationModal = (props: Props) => {
	const { t } = useLanguage();
	const archive = props.action === 'archive';
	const handleClose = () => {
		if (!props.loading) props.onClose();
	};
	return (
		<ActionModals
			title={props.title}
			body={props.body}
			titleIcon={
				<MaterialIcons
					name={archive ? 'archive' : 'warning-amber'}
					size={30}
					color={archive ? colors.brand : colors.danger}
				/>
			}
			titleIconColor={archive ? undefined : colors.dangerBackground}
			maxWidth="xs"
			fullWidth
			onClose={handleClose}
			actions={[
				{
					text: t.common.cancel,
					active: false,
					onClick: handleClose,
					icon: <MaterialIcons name="close" size={20} color={colors.slate[500]} />,
					color: colors.slate[500],
					disabled: props.loading,
				},
				{
					text: props.confirmText,
					active: true,
					onClick: props.onConfirm,
					icon: (
						<MaterialIcons
							name={archive ? 'archive' : props.action === 'suspend' ? 'block' : 'delete-outline'}
							size={20}
							color={colors.white}
						/>
					),
					color: archive ? colors.brand : colors.danger,
					loading: props.loading,
					disabled: props.loading,
				},
			]}
		>
			{props.children}
		</ActionModals>
	);
};

export default ConfirmationModal;
