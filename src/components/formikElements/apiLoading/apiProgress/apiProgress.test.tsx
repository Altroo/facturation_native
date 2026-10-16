import { render, screen } from '@testing-library/react-native';
import ApiProgress from './apiProgress';
import { translations } from '@/translations';
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
it('announces the loading state', async () => {
	await render(<ApiProgress />);
	expect(screen.getByRole('progressbar', { name: translations.fr.common.loading })).toBeOnTheScreen();
	expect(screen.getByText(translations.fr.common.loading)).toBeOnTheScreen();
});

test('renders Backdrop and CircularProgress with the supplied colors', async () => {
	const backdropColor = '#123456';
	const circularColor = '#abcdef';

	await render(<ApiProgress backdropColor={backdropColor} circularColor={circularColor} />);

	// Backdrop
	const backdrop = screen.getByTestId('api-backdrop');
	expect(backdrop).toBeOnTheScreen();
	expect(backdrop).toHaveStyle({ backgroundColor: backdropColor });

	// CircularProgress
	const circular = screen.getByTestId('api-loader');
	expect(circular).toBeOnTheScreen();
	expect(circular).toHaveProp('color', circularColor);
});
