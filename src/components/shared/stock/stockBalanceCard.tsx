import { Text, View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { StockBalance } from '@/types/stockTypes';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import InfoRow from '@/components/shared/infoRow/infoRow';
import StockStatus from './stockStatus';
import StockQuantityRows from './stockQuantityRows';
import { useLanguage } from '@/utils/hooks';
import { STOCK_ADD, STOCK_VIEW } from '@/utils/routes';
import { colors } from '@/utils/themes';

type Props = {
	balance: StockBalance;
	company_id: number;
	canAdjust: boolean;
};

const StockBalanceCard = (props: Props) => {
	const { t } = useLanguage();
	const balance = props.balance;
	return (
		<ListCard
			testID={`stock-balance-${balance.id}`}
			header={
				<View className="gap-1">
					<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
						{balance.article_reference}
					</Text>
					<Text className="font-sans text-sm text-slate-500 dark:text-slate-300">{balance.article_designation}</Text>
				</View>
			}
			accessibilityLabel={`${t.stock.viewBalance}: ${balance.article_reference}`}
			onPress={() => router.push(STOCK_VIEW(balance.id, props.company_id))}
			actions={
				props.canAdjust ? (
					<ListCardActions
						extraActions={[
							{
								label: t.stock.adjust,
								onClick: () => router.push(STOCK_ADD(props.company_id, balance.id)),
								icon: <MaterialIcons name="swap-vert" size={22} color={colors.brand} />,
							},
						]}
					/>
				) : undefined
			}
		>
			<StockStatus kind="balance" value={balance.stock_state} />
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				<InfoRow
					dense
					icon={<MaterialIcons name="place" size={18} color={colors.slate[400]} />}
					label={t.stock.emplacement}
					value={balance.emplacement_name}
				/>
				<StockQuantityRows balance={balance} />
			</View>
		</ListCard>
	);
};

export default StockBalanceCard;
