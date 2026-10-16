import type { Language, TranslationDictionary } from '@/types/languageTypes';
import { fr } from '@/translations/fr';
import { en } from '@/translations/en';

export const translations: Record<Language, TranslationDictionary> = {
	fr,
	en,
};
