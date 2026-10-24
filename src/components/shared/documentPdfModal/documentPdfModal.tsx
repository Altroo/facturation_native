import { useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage, useToast } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import type { DocumentPdfType } from '@/types/devisTypes';
import { LanguageFlag } from '@/components/shared/languageSwitcher/languageSwitcher';

type Props = {
	normal?: boolean;
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
	const selection = useRef<{ type: DocumentPdfType; language: 'fr' | 'en' | 'nl' }>({
		type: 'avec_remise',
		language: 'fr',
	});
	const previewStarted = useRef(false);
	const formats = [
		{ label: t.common.pdfWithDiscount, value: 'avec_remise' },
		{ label: t.common.pdfWithoutDiscount, value: 'sans_remise' },
		{ label: t.common.pdfWithUnitWithoutDiscount, value: 'avec_unite_sans_remise' },
		{ label: t.common.pdfWithUnitWithDiscount, value: 'avec_unite_avec_remise' },
	] as const;
	const languages = [
		{ label: t.pdf.french, value: 'fr', icon: <LanguageFlag language="fr" size={24} /> },
		{ label: t.pdf.english, value: 'en', icon: <LanguageFlag language="en" size={24} /> },
		{ label: t.pdf.dutch, value: 'nl', icon: <LanguageFlag language="nl" size={24} /> },
	] as const;
	const preview = async () => {
		if (!pending.current || previewStarted.current) return;
		previewStarted.current = true;
		try {
			if (!(await props.onOpen(selection.current.type, selection.current.language)))
				onError(t.errors.documentOpenError);
		} catch {
			onError(t.errors.documentOpenError);
		} finally {
			pending.current = false;
			props.onClose();
		}
	};
	const open = (chosenLanguage = language) => {
		if (pending.current) return;
		selection.current = { type: props.normal ? 'normal' : type, language: chosenLanguage };
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
				{!props.normal && (
					<CustomChoiceButtons
						label={t.pdf.format}
						items={formats}
						value={type}
						disabled={loading}
						onChange={setType}
					/>
				)}
				<CustomChoiceButtons
					label={t.pdf.language}
					items={languages}
					value={language}
					columns={3}
					disabled={loading}
					onChange={(value) => (props.normal ? open(value) : setLanguage(value))}
				/>
			</ScrollView>
			{!props.normal && (
				<PrimaryLoadingButton
					buttonText={t.pdf.generatePdf}
					loading={loading}
					active={!loading}
					startIcon={<MaterialIcons name="picture-as-pdf" size={20} color={colors.brand} />}
					onClick={() => void open()}
				/>
			)}
		</BottomSheet>
	);
};

export default DocumentPdfModal;
