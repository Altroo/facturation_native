import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import type { Totals } from '@/types/devisTypes';

type Props = {
	totals: Totals;
	devise?: string;
	showDiscountTotal?: boolean;
	showPurchaseTotal?: boolean;
	children?: ReactNode;
};

const FactureDevisTotalsCard = (props: Props) => {
	const { t } = useLanguage();
	const money = (amount: number, currency = props.devise ?? 'MAD') =>
		`${formatNumberWithSpaces(amount, 2)} ${currency}`;
	const showDiscountTotal = props.showDiscountTotal !== false;
	return (
		<SectionCard title={t.totalsCard.title} icon="receipt-long">
			<InfoRow
				dense
				inline
				icon={<MaterialIcons name="receipt-long" size={18} color={colors.slate[400]} />}
				label={t.totalsCard.totalHT}
				value={money(props.totals.totalHT)}
			/>
			{props.showPurchaseTotal !== false && (
				<InfoRow
					dense
					inline
					icon={<MaterialIcons name="shopping-cart" size={18} color={colors.slate[400]} />}
					label={t.totalsCard.totalPrixAchat}
					value={
						props.totals.totalPrixAchatDevise
							? money(props.totals.totalPrixAchat, props.totals.totalPrixAchatDevise)
							: null
					}
				/>
			)}
			<InfoRow
				dense
				inline
				icon={<MaterialIcons name="percent" size={18} color={colors.slate[400]} />}
				label={t.totalsCard.totalTVA}
				value={money(props.totals.totalTVA)}
			/>
			{showDiscountTotal && (
				<InfoRow
					dense
					inline
					icon={<MaterialIcons name="payments" size={18} color={colors.slate[400]} />}
					label={t.totalsCard.totalTTC}
					value={money(props.totals.totalTTC)}
				/>
			)}
			{props.children}
			<View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
				<Text className="min-w-0 flex-1 font-poppins-medium text-xs text-ink dark:text-slate-100">
					{showDiscountTotal ? t.totalsCard.totalTTCApresRemise : t.totalsCard.totalTTC}
				</Text>
				<Text selectable className="shrink font-poppins-semibold text-xl text-brand dark:text-blue-300">
					{money(showDiscountTotal ? props.totals.totalTTCApresRemise : props.totals.totalTTC)}
				</Text>
			</View>
		</SectionCard>
	);
};

export default FactureDevisTotalsCard;
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
