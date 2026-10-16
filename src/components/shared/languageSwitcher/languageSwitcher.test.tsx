import type { LanguageContextType } from '@/types/languageTypes';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LanguageSwitcher, { LanguageFlag } from './languageSwitcher';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import EnglishFlag from '../../../../assets/flags/en.svg';
import FrenchFlag from '../../../../assets/flags/fr.svg';
jest.mock('expo-image', () => ({ Image: jest.requireActual('react-native').Image }));

it('offers the other language using the exact original flag artwork', async () => {
	const setLanguage = jest.fn();
	const view = await render(
		<LanguageContext.Provider value={{ language: 'fr', t: translations.fr, setLanguage }}>
			<LanguageSwitcher />
		</LanguageContext.Provider>,
	);
	expect(view.container.queryAll((node) => node.type === 'Image')[0]!.props.source).toBe(EnglishFlag);
	await fireEvent.press(view.getByRole('button', { name: 'English' }));
	expect(setLanguage).toHaveBeenCalledWith('en');
	await view.rerender(
		<LanguageContext.Provider value={{ language: 'en', t: translations.en, setLanguage }}>
			<LanguageSwitcher />
		</LanguageContext.Provider>,
	);
	await fireEvent.press(view.getByRole('button', { name: 'Français' }));
	expect(setLanguage).toHaveBeenLastCalledWith('fr');
	expect(view.container.queryAll((node) => node.type === 'Image')[0]!.props.source).toBe(FrenchFlag);
});
it('keeps a flag decorative inside its labelled button', async () => {
	const view = await render(<LanguageFlag language="fr" size={28} />);
	expect(view.container.queryAll((node) => node.type === 'Image')[0]!.props.accessible).toBe(false);
	expect(view.container.queryAll((node) => node.type === 'Image')[0]!.props.style).toEqual({ width: 28, height: 20 });
});

const renderWithLanguage = async (lang: 'fr' | 'en', setLanguage = jest.fn()) => {
	const mockCtx: LanguageContextType = {
		language: lang,
		setLanguage,
		t: translations[lang],
	};
	return {
		setLanguage,
		...(await render(
			<LanguageContext.Provider value={mockCtx}>
				<LanguageSwitcher />
			</LanguageContext.Provider>,
		)),
	};
};

describe('LanguageSwitcher', () => {
	it('displays EN when current language is fr', async () => {
		await renderWithLanguage('fr');
		expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen();
	});

	it('displays FR when current language is en', async () => {
		await renderWithLanguage('en');
		expect(screen.getByRole('button', { name: 'Français' })).toBeOnTheScreen();
	});

	it('calls setLanguage with en when clicking while in fr', async () => {
		const setLanguage = jest.fn();
		await renderWithLanguage('fr', setLanguage);
		await fireEvent.press(screen.getByRole('button', { name: 'English' }));
		expect(setLanguage).toHaveBeenCalledWith('en');
	});

	it('calls setLanguage with fr when clicking while in en', async () => {
		const setLanguage = jest.fn();
		await renderWithLanguage('en', setLanguage);
		await fireEvent.press(screen.getByRole('button', { name: 'Français' }));
		expect(setLanguage).toHaveBeenCalledWith('fr');
	});
});
