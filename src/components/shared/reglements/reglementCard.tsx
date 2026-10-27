import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ReglementClass } from '@/models/classes';
import { useLanguage } from '@/utils/hooks';
import { formatDate, formatNumberWithSpaces } from '@/utils/helpers';
import { CLIENTS_VIEW, FACTURE_CLIENT_VIEW, REGLEMENTS_VIEW } from '@/utils/routes';
import { colors } from '@/utils/themes';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import DocumentStatus from '@/components/shared/documentStatus/documentStatus';
import TextButton from '@/components/nativeElements/buttons/textButton/textButton';

type Props = {
	payment: ReglementClass;
	companyId: number;
	invoiceContext?: boolean;
	disabled?: boolean;
	selection?: ComponentProps<typeof ListCard>['selection'];
	actions?: ComponentProps<typeof ListCard>['actions'];
};

// The payment list and invoice history share the same card. Invoice history
// omits the invoice/client already identified by the enclosing detail page.
const ReglementCard = (props: Props) => {
	const { t } = useLanguage();
	const payment = props.payment;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	const scopedRoute = (
		route: ReturnType<typeof REGLEMENTS_VIEW | typeof FACTURE_CLIENT_VIEW | typeof CLIENTS_VIEW>,
	) => ({
		...route,
		params: { ...route.params, company_id: String(props.companyId) },
	});
	return (
		<ListCard
			testID={`invoice-payment-${payment.id}`}
			disabled={props.disabled}
			selection={props.selection}
			actions={props.actions}
			accessibilityLabel={`${t.reglements.detailsTitle}: ${payment.libelle || payment.facture_client_numero}`}
			onPress={() => router.push(scopedRoute(REGLEMENTS_VIEW(payment.id)))}
			header={
				<View className="min-w-0 gap-1">
					<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
						{payment.libelle || payment.facture_client_numero || t.common.noData}
					</Text>
					<Text
						className={`font-poppins-semibold text-lg ${payment.statut === 'Valide' ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}
					>
						{formatNumberWithSpaces(payment.montant, 2)} {payment.devise || 'MAD'}
					</Text>
				</View>
			}
		>
			<DocumentStatus statut={payment.statut} />
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				{!props.invoiceContext && (
					<>
						<InfoRow
							dense
							icon={icon('receipt-long')}
							label={t.reglements.colNumeroFacture}
							value={
								<TextButton
									buttonText={payment.facture_client_numero || t.common.noData}
									disabled={props.disabled}
									onClick={(event) => {
										event.stopPropagation();
										router.push(scopedRoute(FACTURE_CLIENT_VIEW(payment.facture_client)));
									}}
								/>
							}
						/>
						<InfoRow
							dense
							icon={icon('person-outline')}
							label={t.reglements.colClient}
							value={
								payment.client !== null && payment.client > 0 && payment.client_name ? (
									<TextButton
										buttonText={payment.client_name}
										disabled={props.disabled}
										onClick={(event) => {
											event.stopPropagation();
											router.push(scopedRoute(CLIENTS_VIEW(payment.client!)));
										}}
									/>
								) : (
									payment.client_name
								)
							}
						/>
					</>
				)}
				<InfoRow
					dense
					icon={icon('event')}
					label={t.reglements.fieldDateReglement}
					value={formatDate(payment.date_reglement, false)}
				/>
				<InfoRow
					dense
					icon={icon('payments')}
					label={t.reglements.fieldModeReglement}
					value={payment.mode_reglement_name}
				/>
				{!!payment.observations && (
					<InfoRow dense icon={icon('notes')} label={t.reglements.fieldObservations} value={payment.observations} />
				)}
			</View>
		</ListCard>
	);
};

export default ReglementCard;
