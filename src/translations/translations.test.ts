import { translations } from './index';

const getKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
	const keys: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			keys.push(...getKeys(value as Record<string, unknown>, path));
		} else {
			keys.push(path);
		}
	}
	return keys.sort();
};

describe('translations', () => {
	it('fr and en dictionaries have identical keys', () => {
		const frKeys = getKeys(translations.fr as unknown as Record<string, unknown>);
		const enKeys = getKeys(translations.en as unknown as Record<string, unknown>);
		expect(frKeys).toEqual(enKeys);
	});

	it('no translation values are empty strings', () => {
		const checkNonEmpty = (obj: Record<string, unknown>, lang: string, prefix = '') => {
			for (const [key, value] of Object.entries(obj)) {
				const path = prefix ? `${prefix}.${key}` : key;
				if (typeof value === 'string') {
					expect(value.length).toBeGreaterThan(0);
				} else if (typeof value === 'object' && value !== null && typeof value !== 'function') {
					checkNonEmpty(value as Record<string, unknown>, lang, path);
				}
			}
		};
		checkNonEmpty(translations.fr as unknown as Record<string, unknown>, 'fr');
		checkNonEmpty(translations.en as unknown as Record<string, unknown>, 'en');
	});
});
