import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useState, type FC, type ReactNode } from 'react';
import type { Language, LanguageContextType } from '@/types/languageTypes';
import { translations } from '@/translations';

const STORAGE_KEY = 'app-language';
const DEFAULT_LANGUAGE: Language = 'fr';

export const LanguageContext = createContext<LanguageContextType>({
	language: DEFAULT_LANGUAGE,
	setLanguage: () => {},
	t: translations[DEFAULT_LANGUAGE],
});

export const LanguageContextProvider: FC<{ children: ReactNode; initialLanguage?: Language }> = ({
	children,
	initialLanguage,
}) => {
	const [language, setLanguageState] = useState<Language>(initialLanguage ?? DEFAULT_LANGUAGE);
	const [ready, setReady] = useState(initialLanguage !== undefined);
	useEffect(() => {
		let mounted = true;
		const restore = async () => {
			try {
				const stored = initialLanguage === undefined ? await AsyncStorage.getItem(STORAGE_KEY) : null;
				if (mounted && (stored === 'fr' || stored === 'en')) {
					setLanguageState(stored);
				}
			} catch {
				/* Storage failure must not block startup. */
			} finally {
				if (mounted) setReady(true);
			}
		};
		void restore();
		return () => {
			mounted = false;
		};
	}, [initialLanguage]);

	const setLanguage = (lang: Language) => {
		setLanguageState(lang);
		void AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {
			/* Keep the in-memory preference when device storage is unavailable. */
		});
	};

	const t = translations[language];

	if (!ready) return null;
	return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};
