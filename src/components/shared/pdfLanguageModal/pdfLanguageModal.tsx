import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
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
			<CustomChoiceButtons
				label={t.pdf.language}
				columns={3}
				items={(['fr', 'en', 'nl'] as const).map((language) => ({
					value: language,
					label: language === 'fr' ? t.pdf.french : language === 'en' ? t.pdf.english : t.pdf.dutch,
					icon: <LanguageFlag language={language} size={24} />,
				}))}
				onChange={props.onSelectLanguage}
			/>
		</BottomSheet>
	);
};

export default PdfLanguageModal;
