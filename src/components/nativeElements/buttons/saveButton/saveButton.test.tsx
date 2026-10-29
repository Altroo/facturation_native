import { fireEvent, render, screen } from '@testing-library/react-native';
import SaveButton from './saveButton';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let mockLanguage: 'fr' | 'en' = 'fr';
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations[mockLanguage],
	}),
}));

describe('SaveButton', () => {
	it.each(['fr', 'en'] as const)(
		'uses the common save label and icon in %s and forwards the save action',
		async (language) => {
			mockLanguage = language;
			const onClick = jest.fn();
			await render(<SaveButton active loading={false} onClick={onClick} />);
			const button = screen.getByRole('button', { name: translations[language].common.save });
			expect(screen.container.queryAll((node) => node.props.name === 'save')).toHaveLength(1);
			await fireEvent.press(button);
			expect(onClick).toHaveBeenCalledTimes(1);
		},
	);

	it.each([
		{ active: true, loading: true },
		{ active: false, loading: false },
	])('blocks repeated or disabled saves %o', async (state) => {
		mockLanguage = 'fr';
		const onClick = jest.fn();
		await render(<SaveButton {...state} onClick={onClick} />);
		const button = screen.getByRole('button', { name: translations.fr.common.save });
		expect(button).toBeDisabled();
		await fireEvent.press(button);
		expect(onClick).not.toHaveBeenCalled();
	});
});
