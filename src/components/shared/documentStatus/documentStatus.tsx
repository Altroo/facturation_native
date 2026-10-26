import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import { getStatutLabel } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

type Props = { statut: string };

const DocumentStatus = (props: Props) => {
	const { t } = useLanguage();
	const accepted = props.statut === 'Accepté' || props.statut === 'Facturé' || props.statut === 'Valide';
	const rejected = props.statut === 'Refusé' || props.statut === 'Annulé';
	return (
		<CustomBadge
			tone={
				accepted
					? 'success'
					: rejected
						? 'danger'
						: props.statut === 'Expiré'
							? 'warning'
							: props.statut === 'Brouillon'
								? 'neutral'
								: 'info'
			}
			label={getStatutLabel(props.statut, t)}
			icon={
				<MaterialIcons
					name={accepted ? 'check-circle' : rejected ? 'cancel' : props.statut === 'Envoyé' ? 'send' : 'schedule'}
					size={16}
					color={accepted ? colors.success : rejected ? colors.danger : colors.brand}
				/>
			}
		/>
	);
};

export default DocumentStatus;
