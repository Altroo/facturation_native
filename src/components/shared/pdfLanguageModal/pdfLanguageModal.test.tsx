import { fireEvent, render, screen } from '@testing-library/react-native';
import PdfLanguageModal from './pdfLanguageModal';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import FrenchFlag from '../../../../assets/flags/fr.svg';
import EnglishFlag from '../../../../assets/flags/en.svg';
import DutchFlag from '../../../../assets/flags/nl.svg';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').Image }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const onSelectLanguage = jest.fn();
const onClose = jest.fn();
const renderModal = (language: 'fr' | 'en' = 'fr') =>
	render(
		<LanguageContext.Provider value={{ language, t: translations[language], setLanguage: jest.fn() }}>
			<PdfLanguageModal onSelectLanguage={onSelectLanguage} onClose={onClose} />
		</LanguageContext.Provider>,
	);

beforeEach(() => jest.clearAllMocks());

describe('PdfLanguageModal', () => {
	it('shows the three export languages with their existing flag artwork', async () => {
		await renderModal();
		expect(screen.getByRole('header', { name: translations.fr.pdf.generatePdf })).toBeOnTheScreen();
		expect(screen.getByText(translations.fr.pdf.chooseLanguage)).toBeOnTheScreen();
		expect(screen.container.queryAll((node) => node.type === 'Image').map((image) => image.props.source)).toEqual([
			FrenchFlag,
			EnglishFlag,
			DutchFlag,
		]);
		expect(onSelectLanguage).not.toHaveBeenCalled();
	});

	describe.each(['fr', 'en'] as const)('%s interface', (language) => {
		it.each(['fr', 'en', 'nl'] as const)('returns the selected %s PDF language', async (selection) => {
			await renderModal(language);
			const t = translations[language];
			const labels = { fr: t.pdf.french, en: t.pdf.english, nl: t.pdf.dutch };
			await fireEvent.press(screen.getByRole('button', { name: labels[selection] }));
			expect(onSelectLanguage).toHaveBeenCalledTimes(1);
			expect(onSelectLanguage).toHaveBeenCalledWith(selection);
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	it.each(['close', 'backdrop', 'back', 'escape'] as const)(
		'closes via %s without selecting a language',
		async (method) => {
			await renderModal();
			if (method === 'close') await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
			else if (method === 'backdrop')
				await fireEvent.press(screen.getByTestId('pdf-language-modal-backdrop', { includeHiddenElements: true }));
			else if (method === 'back') await fireEvent(screen.getByTestId('pdf-language-modal'), 'requestClose');
			else await fireEvent(screen.getByTestId('pdf-language-modal-panel'), 'accessibilityEscape');
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(onSelectLanguage).not.toHaveBeenCalled();
		},
	);
});
