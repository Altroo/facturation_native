import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useGetReglementsListQuery } from '@/store/services/reglement';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import { REGLEMENTS_ADD } from '@/utils/routes';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ReglementCard from '@/components/shared/reglements/reglementCard';
import EmptyState from '@/components/shared/emptyState/emptyState';
import QueryError from '@/components/shared/queryError/queryError';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';

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
						<ReglementCard
							key={payment.id}
							payment={payment}
							companyId={props.companyId}
							invoiceContext
							disabled={!props.token}
						/>
					))}
				</View>
			)}
		</SectionCard>
	);
};

export default InvoicePaymentsSection;
