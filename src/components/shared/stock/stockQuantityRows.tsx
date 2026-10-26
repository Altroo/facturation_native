import type { StockBalance } from '@/types/stockTypes';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';
import { View } from 'react-native';

type Props = {
	balance: StockBalance;
};

// The card and detail page use the same server quantities. Reserved/available
// and incoming/projected values must never be recalculated from loaded pages.
const StockQuantityRows = (props: Props) => {
	const { t } = useLanguage();
	const balance = props.balance;
	const values = [
		{ label: t.stock.physical, value: balance.physical_quantity, icon: 'inventory-2' },
		{ label: t.stock.reserved, value: balance.reserved_quantity, icon: 'lock-outline', tone: 'warning' },
		{
			label: t.stock.available,
			value: balance.available_quantity,
			icon: 'check-circle-outline',
			tone: Number(balance.available_quantity) < 0 ? 'danger' : 'success',
		},
		{ label: t.stock.incoming, value: balance.incoming_quantity, icon: 'local-shipping' },
		{ label: t.stock.projected, value: balance.projected_quantity, icon: 'trending-up' },
		{ label: t.stock.minimum, value: balance.stock_minimum, icon: 'low-priority' },
	] as const;
	return (
		<View className="flex-row flex-wrap gap-y-3">
			{values.map((item) => (
				<View key={item.label} className="w-1/2 pr-2">
					<InfoRow
						dense
						label={item.label}
						icon={<MaterialIcons name={item.icon} size={18} color={colors.slate[400]} />}
						value={formatNumberWithSpaces(item.value, 3)}
						valueTone={'tone' in item ? item.tone : undefined}
					/>
				</View>
			))}
		</View>
	);
};

export default StockQuantityRows;
