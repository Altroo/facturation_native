import { ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';

const NoPermission = () => {
	const { t } = useLanguage();
	return (
		<ScrollView
			className="flex-1 bg-slate-50 dark:bg-night"
			contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 }}
		>
			<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
				<View className="self-center rounded-full bg-red-50 p-4 dark:bg-panel">
					<MaterialIcons testID="LockIcon" name="lock" size={48} color="#dc2626" />
				</View>
				<Text accessibilityRole="header" className="font-poppins-semibold text-xl text-ink dark:text-slate-100">
					{t.noPermission.title}
				</Text>
				<Text className="font-sans text-ink dark:text-slate-100">{t.noPermission.description}</Text>
			</View>
		</ScrollView>
	);
};
export default NoPermission;
