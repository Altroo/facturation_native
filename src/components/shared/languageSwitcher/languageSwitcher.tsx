import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { useLanguage } from '@/utils/hooks';
import type { LanguageFlagProps } from '@/types/uiTypes';
import FrenchFlag from '../../../../assets/flags/fr.svg';
import EnglishFlag from '../../../../assets/flags/en.svg';
import { type FC } from 'react';

export const LanguageFlag = ({ language, size = 20 }: LanguageFlagProps) => (
	<Image
		source={language === 'fr' ? FrenchFlag : EnglishFlag}
		style={{ width: size, height: Math.round(size * 0.714) }}
		accessible={false}
		contentFit="contain"
	/>
);
const LanguageSwitcher: FC = () => {
	const { language, setLanguage } = useLanguage();
	const toggleLanguage = () => {
		setLanguage(language === 'fr' ? 'en' : 'fr');
	};
	const nextLanguage = language === 'fr' ? 'en' : 'fr';
	const label = language === 'fr' ? 'English' : 'Français';
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={toggleLanguage}
			className="h-11 w-11 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-700"
		>
			<LanguageFlag language={nextLanguage} />
		</Pressable>
	);
};
export default LanguageSwitcher;
