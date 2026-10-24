import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import type { DocumentData } from '@/types/companyDocumentsTypes';

type Props = {
	document: Pick<DocumentData, 'nombre_paiements' | 'total_paye' | 'reste_a_payer' | 'statut_paiement' | 'devise'>;
	dense?: boolean;
};

const InvoicePaymentSummary = (props: Props) => {
	const { t } = useLanguage();
	const rawStatus = props.document.statut_paiement || 'Non payée';
	const status =
		rawStatus === 'Payée'
			? t.facturesClient.paymentStatusPaid
			: rawStatus === 'Partiellement payée'
				? t.facturesClient.paymentStatusPartial
				: t.facturesClient.paymentStatusUnpaid;
	const tone = rawStatus === 'Payée' ? 'success' : rawStatus === 'Partiellement payée' ? 'warning' : 'neutral';
	const currency = props.document.devise || 'MAD';
	return (
		<>
			<InfoRow
				dense={props.dense}
				icon={<MaterialIcons name="account-balance-wallet" size={18} color={colors.slate[400]} />}
				label={t.facturesClient.colStatutPaiement}
				value={<CustomBadge tone={tone} label={status} />}
			/>
			<InfoRow
				dense={props.dense}
				icon={<MaterialIcons name="payments" size={18} color={colors.slate[400]} />}
				label={t.facturesClient.colNombrePaiements}
				value={props.document.nombre_paiements ?? 0}
			/>
			<InfoRow
				dense={props.dense}
				icon={<MaterialIcons name="check-circle-outline" size={18} color={colors.slate[400]} />}
				label={t.facturesClient.colTotalPaye}
				value={`${formatNumberWithSpaces(props.document.total_paye ?? 0, 2)} ${currency}`}
				valueTone="success"
			/>
			<InfoRow
				dense={props.dense}
				icon={<MaterialIcons name="pending-actions" size={18} color={colors.slate[400]} />}
				label={t.facturesClient.colResteAPayer}
				value={`${formatNumberWithSpaces(props.document.reste_a_payer ?? 0, 2)} ${currency}`}
				valueTone="danger"
			/>
		</>
	);
};

export default InvoicePaymentSummary;
