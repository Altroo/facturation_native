import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { getInitState } from '@/store/selectors';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { AUTH_LOGIN, DASHBOARD } from '@/utils/routes';

const NotFound = () => {
	const router = useRouter();
	const { t } = useLanguage();
	const { status } = useAppSelector(getInitState);
	const handleGoHome = () => {
		router.replace(status === 'authenticated' ? DASHBOARD : AUTH_LOGIN);
	};

	return (
		<ScrollView
			className="flex-1 bg-slate-50 dark:bg-night"
			contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
		>
			<View className="w-full max-w-lg items-center gap-4 rounded-2xl bg-white p-6 dark:bg-panel">
				<MaterialIcons name="sentiment-dissatisfied" size={80} color="#0274d7" accessible={false} />
				<Text className="font-poppins-semibold text-brand text-6xl dark:text-blue-300">404</Text>
				<Text
					accessibilityRole="header"
					className="text-ink text-center font-poppins-medium text-2xl dark:text-slate-100"
				>
					{t.notFound.title}
				</Text>
				<Text className="font-sans text-center text-base text-slate-500 dark:text-slate-400">{t.notFound.message}</Text>
				<PrimaryLoadingButton
					buttonText={t.notFound.homeBtn}
					onClick={handleGoHome}
					active
					loading={false}
					startIcon={<MaterialIcons name="home" size={20} color="#fff" />}
				/>
			</View>
		</ScrollView>
	);
};

export default NotFound;
