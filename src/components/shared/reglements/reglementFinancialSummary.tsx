import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReglementClass } from '@/models/classes';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = { payment: ReglementClass; showPayment?: boolean };

const ReglementFinancialSummary = (props: Props) => {
	const { t } = useLanguage();
	const payment = props.payment;
	const amount = (value: number | undefined) => `${formatNumberWithSpaces(value ?? 0, 2)} ${payment.devise || 'MAD'}`;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	return (
		<SectionCard title={t.reglements.infoFinancieres} icon="account-balance-wallet">
			<InfoRow
				dense
				icon={icon('receipt-long')}
				label={t.reglements.montantFacture}
				value={amount(payment.montant_facture)}
			/>
			<InfoRow
				dense
				icon={icon('payments')}
				label={t.reglements.totalReglements}
				value={amount(payment.total_reglements_facture)}
				valueTone="success"
			/>
			<InfoRow
				dense
				icon={icon('account-balance-wallet')}
				label={t.reglements.resteAPayer}
				value={amount(payment.reste_a_payer)}
				valueTone={Number(payment.reste_a_payer) > 0 ? 'danger' : undefined}
			/>
			{props.showPayment && (
				<InfoRow
					dense
					icon={icon('paid')}
					label={t.reglements.ceReglement}
					value={amount(payment.montant)}
					valueTone={payment.statut === 'Valide' ? 'success' : 'danger'}
				/>
			)}
		</SectionCard>
	);
};

export default ReglementFinancialSummary;
