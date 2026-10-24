import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useGetReglementsListQuery } from '@/store/services/reglement';
import { useLanguage } from '@/utils/hooks';
import { formatDate, formatNumberWithSpaces, getStatutLabel } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import { REGLEMENTS_ADD } from '@/utils/routes';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EmptyState from '@/components/shared/emptyState/emptyState';
import QueryError from '@/components/shared/queryError/queryError';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';

type Props = {
	companyId: number;
	factureClientId: number;
	token?: string;
	canManagePayments: boolean;
};

const InvoicePaymentsSection = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetReglementsListQuery(
		{ company_id: props.companyId, with_pagination: false, facture_client: props.factureClientId },
		{ skip: !props.token },
	);
	const payments = Array.isArray(query.currentData) ? query.currentData : (query.currentData?.results ?? []);
	return (
		<SectionCard title={t.facturesClient.paymentsSection} icon="payments">
			{props.canManagePayments && (
				<PrimaryLoadingButton
					buttonText={t.facturesClient.addPayment}
					loading={false}
					active={!!props.token}
					onClick={() => router.push(REGLEMENTS_ADD(props.companyId, props.factureClientId))}
					inverted
					startIcon={<MaterialIcons name="add" size={20} color={colors.brand} />}
				/>
			)}
			{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
			{query.isLoading ? (
				<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{t.common.loading}</Text>
			) : !payments.length && !query.isError ? (
				<EmptyState message={t.facturesClient.noPayments} />
			) : (
				<View className="gap-3">
					{payments.map((payment) => (
						<ListCard
							key={payment.id}
							testID={`invoice-payment-${payment.id}`}
							header={
								<View className="min-w-0 gap-1">
									<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
										{payment.libelle || t.common.noData}
									</Text>
									<Text className="font-poppins-semibold text-lg text-emerald-600 dark:text-emerald-400">
										{formatNumberWithSpaces(payment.montant, 2)} {payment.devise || 'MAD'}
									</Text>
								</View>
							}
						>
							<CustomBadge
								label={getStatutLabel(payment.statut, t)}
								tone={payment.statut === 'Valide' ? 'success' : 'danger'}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
								label={t.reglements.fieldDateReglement}
								value={formatDate(payment.date_reglement, false)}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="payments" size={18} color={colors.slate[400]} />}
								label={t.reglements.fieldModeReglement}
								value={payment.mode_reglement_name}
							/>
							<InfoRow
								dense
								icon={<MaterialIcons name="notes" size={18} color={colors.slate[400]} />}
								label={t.reglements.fieldObservations}
								value={payment.observations}
							/>
						</ListCard>
					))}
				</View>
			)}
		</SectionCard>
	);
};

export default InvoicePaymentsSection;
