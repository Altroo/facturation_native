import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { AuthThemeToggle } from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';
import Logo from '../../../../assets/facturation-logo.png';

const AuthLayout = ({ children }: PropsWithChildren) => (
	<SafeAreaView style={{ flex: 1 }} className="bg-white dark:bg-night">
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
				<View className="flex-row items-center justify-end gap-1">
					<AuthThemeToggle />
					<LanguageSwitcher />
				</View>
				<View className="mx-auto w-full max-w-md flex-1 justify-center gap-8 py-10">
					<Image source={Logo} className="h-20 w-16 self-center" resizeMode="contain" />
					{children}
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	</SafeAreaView>
);

AuthLayout.displayName = 'AuthLayout';
export default AuthLayout;
