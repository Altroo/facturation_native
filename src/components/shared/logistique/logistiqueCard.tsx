import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { LogistiqueOrder } from '@/types/logistiqueTypes';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import DocumentStatus from '@/components/shared/documentStatus/documentStatus';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import { useLanguage } from '@/utils/hooks';
import { formatDate, formatNumberWithSpaces } from '@/utils/helpers';
import { colors } from '@/utils/themes';

type Props = {
	order: LogistiqueOrder;
	summary?: boolean;
	selection?: ComponentProps<typeof ListCard>['selection'];
	actions?: ComponentProps<typeof ListCard>['actions'];
};

// Tracking and supplier history use the same card. Supplier history shows the
// web's reference, workflow status and planned date without repeating its owner.
const LogistiqueCard = (props: Props) => {
	const { t } = useLanguage();
	const order = props.order;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	return (
		<ListCard
			testID={`logistique-order-${order.id}`}
			header={
				<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">{order.numero_commande}</Text>
			}
			selection={props.selection}
			actions={props.actions}
		>
			<DocumentStatus statut={order.statut_global} />
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				{!props.summary && (
					<InfoRow dense icon={icon('business')} label={t.logistique.colFournisseur} value={order.fournisseur} />
				)}
				<InfoRow
					dense
					icon={icon('event')}
					label={t.logistique.colDatePrevue}
					value={order.date_prevue ? formatDate(order.date_prevue, false) : undefined}
				/>
				{!props.summary && (
					<>
						<InfoRow
							dense
							icon={icon('payments')}
							label={t.logistique.colPaiement}
							value={<DocumentStatus statut={order.statut_paiement} />}
						/>
						<InfoRow
							dense
							icon={icon('description')}
							label={t.logistique.fieldStatutTI}
							value={order.statut_titre_importation}
						/>
						<InfoRow
							dense
							icon={icon('request-quote')}
							label={t.logistique.colCoutTotal}
							value={`${formatNumberWithSpaces(order.cout_total, 2)} ${order.devise || 'MAD'}`}
						/>
						<InfoRow
							dense
							icon={icon('warning-amber')}
							label={t.logistique.colAlerts}
							value={
								order.alerts?.length ? (
									<View className="gap-2">
										{order.alerts.map((alert) => (
											<CustomBadge key={alert} label={alert} tone="warning" />
										))}
									</View>
								) : (
									t.logistique.noAlerts
								)
							}
						/>
					</>
				)}
			</View>
		</ListCard>
	);
};

export default LogistiqueCard;
