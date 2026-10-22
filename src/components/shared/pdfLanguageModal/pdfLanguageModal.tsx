import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import { LanguageFlag } from '@/components/shared/languageSwitcher/languageSwitcher';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	onSelectLanguage: (language: 'fr' | 'en' | 'nl') => void;
	onClose: () => void;
};

const PdfLanguageModal = (props: Props) => {
	const { t } = useLanguage();
	return (
		<BottomSheet
			visible
			title={t.pdf.generatePdf}
			subtitle={t.pdf.chooseLanguage}
			onClose={props.onClose}
			testID="pdf-language-modal"
			titleIcon={<MaterialIcons name="picture-as-pdf" size={24} color={colors.brand} />}
		>
			<View className="gap-2">
				{(['fr', 'en', 'nl'] as const).map((language) => (
					<Pressable
						key={language}
						accessibilityRole="button"
						accessibilityLabel={language === 'fr' ? t.pdf.french : language === 'en' ? t.pdf.english : t.pdf.dutch}
						onPress={() => props.onSelectLanguage(language)}
						className="min-h-12 flex-row items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800"
					>
						<LanguageFlag language={language} size={24} />
						<Text className="flex-1 font-poppins-medium text-sm text-ink dark:text-slate-100">
							{language === 'fr' ? t.pdf.french : language === 'en' ? t.pdf.english : t.pdf.dutch}
						</Text>
						<MaterialIcons name="chevron-right" size={22} color={colors.slate[400]} />
					</Pressable>
				))}
			</View>
		</BottomSheet>
	);
};

export default PdfLanguageModal;
