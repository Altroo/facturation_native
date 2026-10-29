import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { LanguageContext, LanguageContextProvider } from './languageContext';
import { translations } from '@/translations';

const useTestLanguage = () => useContext(LanguageContext);
beforeEach(() => {
	jest.clearAllMocks();
	jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
	jest.mocked(AsyncStorage.setItem).mockResolvedValue();
});

describe('Language Context', () => {
	it('provides the original default French dictionary after native storage hydration', async () => {
		const { result } = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		await waitFor(() => expect(result.current?.language).toBe('fr'));
		expect(result.current.t).toBe(translations.fr);
	});

	it('setLanguage updates the original context contract and persists the independent language key', async () => {
		const { result } = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		await waitFor(() => expect(result.current?.language).toBe('fr'));
		await act(() => result.current.setLanguage('en'));
		expect(result.current.language).toBe('en');
		expect(result.current.t).toBe(translations.en);
		await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('app-language', 'en'));
	});

	it('uses initialLanguage when there is no persisted preference', async () => {
		const wrapper = ({ children }: PropsWithChildren) => (
			<LanguageContextProvider initialLanguage="en">{children}</LanguageContextProvider>
		);
		const { result } = await renderHook(useTestLanguage, { wrapper });
		await waitFor(() => expect(result.current?.language).toBe('en'));
		expect(result.current.t).toBe(translations.en);
	});

	it('restores a saved language and rejects unsupported stored values', async () => {
		jest.mocked(AsyncStorage.getItem).mockResolvedValue('en');
		const restored = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		await waitFor(() => expect(restored.result.current?.language).toBe('en'));
		await restored.unmount();
		jest.mocked(AsyncStorage.getItem).mockResolvedValue('de');
		const invalid = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		await waitFor(() => expect(invalid.result.current?.language).toBe('fr'));
		expect(invalid.result.current.t).toBe(translations.fr);
	});

	it('keeps initialLanguage authoritative when device storage contains a different preference', async () => {
		jest.mocked(AsyncStorage.getItem).mockResolvedValue('en');
		const wrapper = ({ children }: PropsWithChildren) => (
			<LanguageContextProvider initialLanguage="fr">{children}</LanguageContextProvider>
		);
		const { result } = await renderHook(useTestLanguage, { wrapper });
		expect(result.current.language).toBe('fr');
		await act(async () => {});
		expect(result.current.language).toBe('fr');
		expect(result.current.t).toBe(translations.fr);
		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
	});

	it('renders an explicit initialLanguage immediately without waiting for storage', async () => {
		jest.mocked(AsyncStorage.getItem).mockReturnValue(new Promise(() => {}));
		const wrapper = ({ children }: PropsWithChildren) => (
			<LanguageContextProvider initialLanguage="en">{children}</LanguageContextProvider>
		);
		const { result } = await renderHook(useTestLanguage, { wrapper });
		expect(result.current.language).toBe('en');
		expect(result.current.t).toBe(translations.en);
	});

	it('keeps switching languages when device storage cannot be read or written', async () => {
		jest.mocked(AsyncStorage.getItem).mockRejectedValue(new Error('Unavailable'));
		jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('Full'));
		const { result } = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		await waitFor(() => expect(result.current?.language).toBe('fr'));
		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
		await act(() => result.current.setLanguage('en'));
		expect(result.current.language).toBe('en');
		expect(result.current.t).toBe(translations.en);
		await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('app-language', 'en'));
	});

	it('ignores a storage read that finishes after unmount and never rewrites the saved preference', async () => {
		let finish!: (value: string | null) => void;
		jest.mocked(AsyncStorage.getItem).mockReturnValue(
			new Promise((resolve) => {
				finish = resolve;
			}),
		);
		const view = await renderHook(useTestLanguage, { wrapper: LanguageContextProvider });
		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
		await view.unmount();
		await act(async () => finish('en'));
		expect(AsyncStorage.setItem).not.toHaveBeenCalled();
	});
});
