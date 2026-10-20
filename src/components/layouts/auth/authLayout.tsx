import { type ReactNode } from 'react';
import { Image, Keyboard, Platform, Pressable, Text, View } from 'react-native';
import { type Href, router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { AuthThemeToggle } from '@/components/shared/themeToggle/themeToggle';
import LanguageSwitcher from '@/components/shared/languageSwitcher/languageSwitcher';
import Logo from '../../../../assets/facturation-logo.png';

type Props = {
	children: ReactNode;
	title?: string;
	backHref?: Href;
};

const AuthLayout = (props: Props) => {
	const { children, title, backHref } = props;
	const { t } = useLanguage();
	const { mode } = useColorMode();
	return (
		<View className="flex-1 bg-white dark:bg-night">
			<SafeAreaView style={{ flex: 1 }}>
				<View className="flex-row items-center gap-1 px-6 pb-2 pt-4">
					{backHref && (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t.common.back}
							onPress={() => {
								Keyboard.dismiss();
								if (router.canGoBack()) router.back();
								else router.replace(backHref);
							}}
							className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-700"
						>
							<MaterialIcons name="arrow-back" size={24} color={mode === 'dark' ? '#f1f5f9' : '#0d070b'} />
						</Pressable>
					)}
					<View className="flex-1" />
					<AuthThemeToggle />
					<LanguageSwitcher />
				</View>
				<KeyboardAwareScrollView
					bottomOffset={32}
					style={{ flex: 1 }}
					keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={{ flexGrow: 1, padding: 24 }}
				>
					<View className="mx-auto w-full max-w-md flex-1 justify-start gap-6 pb-10 pt-8">
						<View className="gap-5">
							<Image source={Logo} className="h-20 w-16 self-center" resizeMode="contain" />
							{!!title && (
								<View className="gap-2">
									<Text className="font-poppins-semibold text-3xl text-ink dark:text-slate-100">{title}</Text>
								</View>
							)}
						</View>
						{children}
					</View>
				</KeyboardAwareScrollView>
			</SafeAreaView>
		</View>
	);
};

AuthLayout.displayName = 'AuthLayout';
export default AuthLayout;
