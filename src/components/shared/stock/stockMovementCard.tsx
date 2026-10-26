import { Text, View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ListCard from '@/components/shared/listCard/listCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import StockStatus from './stockStatus';
import type { StockMovement } from '@/types/stockTypes';
import { STOCK_MOVEMENT_VIEW } from '@/utils/routes';
import { formatDate, formatNumberWithSpaces } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	movement: StockMovement;
	company_id: number;
};

const StockMovementCard = (props: Props) => {
	const { t } = useLanguage();
	const movement = props.movement;
	return (
		<ListCard
			testID={`stock-movement-${movement.id}`}
			accessibilityLabel={`${t.stock.viewMovement}: ${movement.article_reference}`}
			onPress={() => router.push(STOCK_MOVEMENT_VIEW(movement.id, props.company_id))}
			header={
				<View className="gap-1">
					<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
						{movement.article_reference}
					</Text>
					<Text className="font-sans text-sm text-slate-500 dark:text-slate-300">{movement.article_designation}</Text>
				</View>
			}
		>
			<StockStatus kind="movement" value={movement.movement_type} />
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				<InfoRow
					dense
					icon={<MaterialIcons name="place" size={18} color={colors.slate[400]} />}
					label={t.stock.emplacement}
					value={movement.emplacement_name}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="swap-vert" size={18} color={colors.slate[400]} />}
					label={t.stock.quantity}
					value={formatNumberWithSpaces(movement.quantity, 3)}
					valueTone={Number(movement.quantity) < 0 ? 'danger' : 'success'}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="inventory-2" size={18} color={colors.slate[400]} />}
					label={t.stock.balanceAfter}
					value={formatNumberWithSpaces(movement.balance_after, 3)}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="event" size={18} color={colors.slate[400]} />}
					label={t.common.dateCreation}
					value={formatDate(movement.date_created)}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="link" size={18} color={colors.slate[400]} />}
					label={t.stock.source}
					value={movement.note || movement.source_type}
				/>
			</View>
		</ListCard>
	);
};

export default StockMovementCard;
