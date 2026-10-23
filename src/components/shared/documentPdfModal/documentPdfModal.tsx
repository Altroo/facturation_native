import { useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage, useToast } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import type { DocumentPdfType } from '@/types/devisTypes';
import { LanguageFlag } from '@/components/shared/languageSwitcher/languageSwitcher';

type Props = {
	onClose: () => void;
	onOpen: (type: DocumentPdfType, language: 'fr' | 'en' | 'nl') => Promise<boolean>;
};

// All document lists and details use the same format/language choices and errors.
const DocumentPdfModal = (props: Props) => {
	const { t } = useLanguage();
	const { onError } = useToast();
	const [type, setType] = useState<DocumentPdfType>('avec_remise');
	const [language, setLanguage] = useState<'fr' | 'en' | 'nl'>('fr');
	const [loading, setLoading] = useState(false);
	const [visible, setVisible] = useState(true);
	const pending = useRef(false);
	const previewStarted = useRef(false);
	const formats = [
		{ code: t.common.pdfWithDiscount, value: 'avec_remise' },
		{ code: t.common.pdfWithoutDiscount, value: 'sans_remise' },
		{ code: t.common.pdfWithUnitWithoutDiscount, value: 'avec_unite_sans_remise' },
		{ code: t.common.pdfWithUnitWithDiscount, value: 'avec_unite_avec_remise' },
	];
	const languages = [
		{ code: t.pdf.french, value: 'fr' },
		{ code: t.pdf.english, value: 'en' },
		{ code: t.pdf.dutch, value: 'nl' },
	];
	const preview = async () => {
		if (!pending.current || previewStarted.current) return;
		previewStarted.current = true;
		try {
			if (!(await props.onOpen(type, language))) onError(t.errors.documentOpenError);
		} catch {
			onError(t.errors.documentOpenError);
		} finally {
			pending.current = false;
			props.onClose();
		}
	};
	const open = () => {
		if (pending.current) return;
		pending.current = true;
		setLoading(true);
		setVisible(false);
		// Quick Look must open after the iOS sheet dismisses. Closing its parent
		// modal after preview() resolves would also dismiss the PDF it presented.
		if (Platform.OS !== 'ios') void preview();
	};
	return (
		<BottomSheet
			visible={visible}
			onDismiss={() => {
				if (Platform.OS === 'ios') void preview();
			}}
			testID="document-pdf-modal"
			title={t.pdf.generatePdf}
			onClose={() => {
				if (!pending.current) props.onClose();
			}}
			titleIcon={<MaterialIcons name="picture-as-pdf" size={24} color={colors.brand} />}
		>
			<ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
				<CustomDropDownSelect
					label={t.pdf.format}
					items={formats}
					value={type}
					getOptionLabel={(value) => formats.find((item) => item.value === value)?.code ?? value}
					disabled={loading}
					onChange={(value) => {
						if (value) setType(value as DocumentPdfType);
					}}
				/>
				<CustomDropDownSelect
					label={t.pdf.language}
					items={languages}
					startIcon={<LanguageFlag language={language} size={24} />}
					value={language}
					getOptionLabel={(value) => languages.find((item) => item.value === value)?.code ?? value}
					disabled={loading}
					onChange={(value) => {
						if (value) setLanguage(value as 'fr' | 'en' | 'nl');
					}}
				/>
			</ScrollView>
			<PrimaryLoadingButton
				buttonText={t.pdf.generatePdf}
				loading={loading}
				active={!loading}
				startIcon={<MaterialIcons name="picture-as-pdf" size={20} color={colors.brand} />}
				onClick={() => void open()}
			/>
		</BottomSheet>
	);
};

export default DocumentPdfModal;
