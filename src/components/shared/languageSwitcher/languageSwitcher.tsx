import { Image } from 'expo-image';
import { Pressable } from 'react-native';
import { useLanguage } from '@/utils/hooks';
import type { Language } from '@/types/languageTypes';
import FrenchFlag from '../../../../assets/flags/fr.svg';
import EnglishFlag from '../../../../assets/flags/en.svg';
import { type FC } from 'react';

type Props = {
	language: Language;
	size?: number;
};

export const LanguageFlag = (props: Props) => {
	const { language, size = 20 } = props;
	return (
		<Image
			source={language === 'fr' ? FrenchFlag : EnglishFlag}
			style={{ width: size, height: Math.round(size * 0.714) }}
			accessible={false}
			contentFit="contain"
		/>
	);
};

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
