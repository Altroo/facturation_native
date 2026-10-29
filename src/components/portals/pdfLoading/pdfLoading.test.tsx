import { act, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import PdfLoading from './pdfLoading';
import { translations } from '@/translations';
import { colors } from '@/utils/themes';

jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: mockMode }) }));
jest.mock('react-native-screens', () => {
	const { View } = jest.requireActual<typeof import('react-native')>('react-native');
	return {
		FullWindowOverlay: (props: { children: ReactNode }) => <View testID="pdf-window-overlay">{props.children}</View>,
	};
});
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
jest.mock('@/utils/apiHelpers', () => ({
	getPdfLoading: () => mockLoading,
	subscribePdfLoading: (listener: () => void) => {
		mockListeners.add(listener);
		return () => mockListeners.delete(listener);
	},
}));
let mockLoading = false;
let mockMode: 'light' | 'dark' = 'light';
const mockListeners = new Set<() => void>();
beforeEach(() => {
	mockLoading = false;
	mockMode = 'light';
});
afterEach(() => jest.restoreAllMocks());

describe('PdfLoading', () => {
	it('stays absent when no PDF is being opened and reacts to shared loading changes', async () => {
		await render(<PdfLoading />);
		expect(screen.queryByTestId('pdf-loading-overlay')).toBeNull();
		await act(() => {
			mockLoading = true;
			for (const listener of mockListeners) listener();
		});
		expect(screen.getByRole('progressbar', { name: translations.fr.common.loading })).toBeOnTheScreen();
		expect(screen.getByTestId('pdf-loading-overlay')).toHaveProp('accessibilityViewIsModal', true);
		await act(() => {
			mockLoading = false;
			for (const listener of mockListeners) listener();
		});
		expect(screen.queryByTestId('pdf-loading-overlay')).toBeNull();
	});

	it.each(['light', 'dark'] as const)('uses the existing circular loader with the %s theme', async (mode) => {
		mockMode = mode;
		mockLoading = true;
		await render(<PdfLoading />);
		expect(screen.getByTestId('api-loader')).toHaveProp('color', colors.brand);
		expect(screen.getByTestId('api-backdrop')).toHaveStyle({
			backgroundColor: mode === 'dark' ? colors.panel : colors.white,
			flex: 0,
		});
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('releases its subscription when the app root unmounts', async () => {
		const view = await render(<PdfLoading />);
		expect(mockListeners.size).toBe(1);
		await view.unmount();
		expect(mockListeners.size).toBe(0);
	});

	it.each(['ios', 'android', 'web'] as const)('uses the window overlay only on iOS, platform=%s', async (platform) => {
		jest.replaceProperty(Platform, 'OS', platform);
		mockLoading = true;
		await render(<PdfLoading />);
		if (platform === 'ios') expect(screen.getByTestId('pdf-window-overlay')).toBeOnTheScreen();
		else expect(screen.queryByTestId('pdf-window-overlay')).toBeNull();
		expect(screen.getByRole('progressbar', { name: translations.fr.common.loading })).toBeOnTheScreen();
	});
});
