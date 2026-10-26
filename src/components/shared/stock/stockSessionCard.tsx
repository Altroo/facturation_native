import { Text, View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import type { InventorySession, StockReceipt } from '@/types/stockTypes';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import StockStatus from './stockStatus';
import { STOCK_INVENTORY_VIEW, STOCK_RECEIPT_VIEW } from '@/utils/routes';
import { formatDate, formatNumberWithSpaces } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	record: StockReceipt | InventorySession;
	kind: 'receipt' | 'inventory';
	company_id: number;
	actions?: ReactNode;
	disabled?: boolean;
};

const StockSessionCard = (props: Props) => {
	const { t } = useLanguage();
	const record = props.record;
	const receipt = 'logistics_order' in record;
	const label = record.reference || `${receipt ? 'REC' : 'INV'}-${record.id}`;
	return (
		<ListCard
			testID={`stock-${props.kind}-${record.id}`}
			disabled={props.disabled}
			actions={props.actions}
			header={<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">{label}</Text>}
			accessibilityLabel={`${receipt ? t.stock.receiptDetailTitle : t.stock.inventoryDetailTitle}: ${label}`}
			onPress={() => router.push((receipt ? STOCK_RECEIPT_VIEW : STOCK_INVENTORY_VIEW)(record.id, props.company_id))}
		>
			<StockStatus kind={props.kind} value={record.status} />
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				<InfoRow
					dense
					icon={<MaterialIcons name={receipt ? 'local-shipping' : 'place'} size={18} color={colors.slate[400]} />}
					label={receipt ? t.stock.logisticsOrder : t.stock.emplacement}
					value={receipt ? record.logistics_order_number : record.emplacement_name}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
					label={receipt ? t.stock.receivedArticles : t.stock.countedQuantity}
					value={record.lines
						.map(
							(line) =>
								`${line.article_reference}: ${formatNumberWithSpaces('quantity' in line ? line.quantity : line.counted_quantity, 3)}`,
						)
						.join('\n')}
				/>
				{!receipt && (
					<InfoRow
						dense
						icon={<MaterialIcons name="swap-vert" size={18} color={colors.slate[400]} />}
						label={t.stock.difference}
						value={record.lines
							.map((line) => `${line.article_reference}: ${formatNumberWithSpaces(line.difference, 3)}`)
							.join('\n')}
						valueTone={record.lines.some((line) => Number(line.difference) !== 0) ? 'danger' : 'success'}
					/>
				)}
				{receipt && (
					<InfoRow
						dense
						icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
						label={t.stock.quantityTotal}
						value={formatNumberWithSpaces(
							record.lines.reduce((sum, line) => sum + Number(line.quantity), 0),
							3,
						)}
					/>
				)}
				{receipt && (
					<InfoRow
						dense
						icon={<MaterialIcons name="person-outline" size={18} color={colors.slate[400]} />}
						label={t.stock.createdBy}
						value={record.created_by_name}
					/>
				)}
				<InfoRow
					dense
					icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
					label={t.common.dateCreation}
					value={formatDate(record.date_created)}
				/>
			</View>
		</ListCard>
	);
};

export default StockSessionCard;
