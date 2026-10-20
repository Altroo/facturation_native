import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import AuthLayout from '@/components/layouts/auth/authLayout';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { AUTH_LOGIN, AUTH_RESET_PASSWORD } from '@/utils/routes';
import SuccessIlluSVG from '../../../assets/success-illu.svg';

const SetPasswordCompletePageContent = () => {
	const router = useRouter();
	const { t } = useLanguage();
	return (
		<AuthLayout>
			<View className="items-center gap-6">
				<Image source={SuccessIlluSVG} style={{ width: 72, height: 72 }} contentFit="contain" accessible={false} />
				<Text className="text-ink dark:text-slate-100 text-center font-poppins-semibold text-3xl">
					{t.auth.passwordChanged}
				</Text>
				<Text className="font-sans text-center text-sm leading-6 text-slate-500 dark:text-slate-400">
					{t.auth.passwordChangedSub}
				</Text>
				<PrimaryLoadingButton
					buttonText={t.auth.loginButton}
					onClick={() => {
						passwordResetStorage.resetCompletion();
						router.dismissTo(AUTH_LOGIN);
					}}
					active
					loading={false}
					startIcon={<MaterialIcons name="login" size={20} color={'#fff'} />}
				/>
			</View>
		</AuthLayout>
	);
};

const SetPasswordCompletePage = () => {
	if (!passwordResetStorage.isComplete()) return <Redirect href={AUTH_RESET_PASSWORD} />;
	return <SetPasswordCompletePageContent />;
};

export default SetPasswordCompletePage;
