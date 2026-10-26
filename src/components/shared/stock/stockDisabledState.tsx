import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	inventory?: boolean;
};

const StockDisabledState = (props: Props) => {
	const { t } = useLanguage();
	return (
		<View
			testID="stock-disabled"
			className="m-4 gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-800 dark:bg-panel"
		>
			<View className="flex-row items-center gap-3">
				<MaterialIcons name="inventory-2" size={24} color={colors.warning} />
				<Text
					accessibilityRole="header"
					className="flex-1 font-poppins-semibold text-base text-ink dark:text-slate-100"
				>
					{props.inventory ? t.stock.inventoryDisabledTitle : t.stock.disabledTitle}
				</Text>
			</View>
			<Text className="font-sans text-sm leading-6 text-slate-600 dark:text-slate-300">
				{props.inventory ? t.stock.inventoryDisabled : t.stock.disabledMessage}
			</Text>
		</View>
	);
};

export default StockDisabledState;
