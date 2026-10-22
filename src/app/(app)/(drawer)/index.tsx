import { ScrollView, Text, Image, View } from 'react-native';
import Logo from '../../../../assets/facturation-logo.png';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';

const DashboardPage = () => {
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<View className="items-center gap-4 py-8">
					<Image source={Logo} className="h-20 w-16" resizeMode="contain" />
					<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">Facturation</Text>
				</View>
			</ScrollView>
			<BottomNavigation />
		</View>
	);
};

export default DashboardPage;
