import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { InventoryLine, StockReceiptLine } from '@/types/stockTypes';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	line: InventoryLine | StockReceiptLine;
};

const StockLineCard = (props: Props) => {
	const { t } = useLanguage();
	const line = props.line;
	return (
		<ListCard
			testID={`stock-line-${line.id}`}
			header={
				<View className="gap-1">
					<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">{line.article_reference}</Text>
					<Text className="font-sans text-sm text-slate-500 dark:text-slate-300">{line.article_designation}</Text>
				</View>
			}
		>
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				{'quantity' in line ? (
					<>
						<InfoRow
							dense
							icon={<MaterialIcons name="place" size={18} color={colors.slate[400]} />}
							label={t.stock.emplacement}
							value={line.emplacement_name}
						/>
						<InfoRow
							dense
							icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
							label={t.stock.quantity}
							value={formatNumberWithSpaces(line.quantity, 3)}
						/>
					</>
				) : (
					<>
						<InfoRow
							dense
							icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
							label={t.stock.expectedQuantity}
							value={formatNumberWithSpaces(line.expected_quantity, 3)}
						/>
						<InfoRow
							dense
							icon={<MaterialIcons name="fact-check" size={18} color={colors.slate[400]} />}
							label={t.stock.countedQuantity}
							value={formatNumberWithSpaces(line.counted_quantity, 3)}
						/>
						<InfoRow
							dense
							icon={<MaterialIcons name="swap-vert" size={18} color={colors.slate[400]} />}
							label={t.stock.difference}
							value={formatNumberWithSpaces(line.difference, 3)}
							valueTone={Number(line.difference) < 0 ? 'danger' : Number(line.difference) > 0 ? 'success' : undefined}
						/>
					</>
				)}
			</View>
		</ListCard>
	);
};

export default StockLineCard;
