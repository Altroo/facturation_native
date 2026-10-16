import { render, screen } from '@testing-library/react-native';
import NoPermission from './noPermission';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));

describe('NoPermission', () => {
	test('renders access denied title', async () => {
		await render(<NoPermission />);
		expect(screen.getByText('Accès Refusé')).toBeOnTheScreen();
	});

	test('renders description message', async () => {
		await render(<NoPermission />);
		expect(
			screen.getByText(
				/Vous n'avez pas la permission d'accéder à cette page. Veuillez contacter un administrateur si vous pensez qu'il s'agit d'une erreur./,
			),
		).toBeOnTheScreen();
	});

	test('renders lock icon', async () => {
		await render(<NoPermission />);
		const icon = screen.getByTestId('LockIcon');
		expect(icon).toBeOnTheScreen();
	});

	test('renders with proper semantic structure', async () => {
		await render(<NoPermission />);
		expect(screen.getByRole('header')).toHaveTextContent('Accès Refusé');
	});
});
