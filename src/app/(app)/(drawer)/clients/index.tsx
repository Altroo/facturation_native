import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

const ClientsListPage = () => {
	const { t } = useLanguage();

	return (
		<View className="flex-1 gap-3 bg-slate-50 p-4 dark:bg-night">
			<View className="flex-row items-center gap-4 py-1">
				<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-panel">
					<MaterialIcons name="people" size={25} color={colors.brand} />
				</View>
				<View className="flex-1 gap-1">
					<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
						{t.clients.listTitle}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default ClientsListPage;
