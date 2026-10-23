import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').Image }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

import DocumentPdfModal from './documentPdfModal';
const mockError = jest.fn();
const mockOpen = jest.fn();
const mockClose = jest.fn();
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
	useToast: () => ({ onError: mockError }),
}));
beforeEach(() => {
	jest.clearAllMocks();
	mockOpen.mockResolvedValue(true);
});
it('sends the chosen PDF format and language without exposing backend codes', async () => {
	await render(<DocumentPdfModal onClose={mockClose} onOpen={mockOpen} />);
	expect(screen.getByText(t.pdf.french)).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.format }));
	await fireEvent.press(screen.getByRole('radio', { name: t.common.pdfWithUnitWithoutDiscount }));
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.language }));
	await fireEvent.press(screen.getByRole('radio', { name: t.pdf.english }));
	expect(mockOpen).not.toHaveBeenCalled();
	const onDismiss = screen.getByTestId('document-pdf-modal').props.onDismiss;
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.generatePdf }));
	expect(mockOpen).not.toHaveBeenCalled();
	await act(() => onDismiss());
	await waitFor(() => expect(mockOpen).toHaveBeenCalledWith('avec_unite_sans_remise', 'en'));
	expect(mockClose).toHaveBeenCalledTimes(1);
});
it('shows a recoverable toast when preview fails', async () => {
	mockOpen.mockResolvedValue(false);
	await render(<DocumentPdfModal onClose={mockClose} onOpen={mockOpen} />);
	const onDismiss = screen.getByTestId('document-pdf-modal').props.onDismiss;
	await fireEvent.press(screen.getByRole('button', { name: t.pdf.generatePdf }));
	await act(() => onDismiss());
	await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.errors.documentOpenError));
	expect(mockClose).toHaveBeenCalledTimes(1);
});
