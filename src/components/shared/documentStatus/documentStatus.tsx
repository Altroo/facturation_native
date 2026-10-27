import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import { getStatutLabel } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

type Props = { statut: string };

const DocumentStatus = (props: Props) => {
	const { t } = useLanguage();
	const accepted = ['Accepté', 'Facturé', 'Valide', 'Validé', 'Clôturé'].includes(props.statut);
	const rejected = ['Refusé', 'Annulé', 'Bloqué', 'En retard'].includes(props.statut);
	const warning = ['Expiré', 'À lancer', 'En attente externe', 'À clôturer', 'En attente'].includes(props.statut);
	const neutral = ['Brouillon', 'Non demandé', 'À préparer'].includes(props.statut);
	return (
		<CustomBadge
			tone={accepted ? 'success' : rejected ? 'danger' : warning ? 'warning' : neutral ? 'neutral' : 'info'}
			label={getStatutLabel(props.statut, t)}
			icon={
				<MaterialIcons
					name={accepted ? 'check-circle' : rejected ? 'cancel' : props.statut === 'Envoyé' ? 'send' : 'schedule'}
					size={16}
					color={
						accepted
							? colors.success
							: rejected
								? colors.danger
								: warning
									? colors.warning
									: neutral
										? colors.slate[400]
										: colors.brand
					}
				/>
			}
		/>
	);
};

export default DocumentStatus;
