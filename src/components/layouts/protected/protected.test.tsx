import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Protected } from './protected';
import { usePermission, useAppSelector } from '@/utils/hooks';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

// Mock hooks module
jest.mock('@/utils/hooks', () => ({
	usePermission: jest.fn(),
	useAppSelector: jest.fn(),
	useLanguage: () => ({
		language: 'fr' as const,
		setLanguage: jest.fn(),
		t: jest.requireActual('@/translations').translations.fr,
	}),
}));

describe('Protected component', () => {
	it('renders children when is_staff is true', async () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({ is_staff: true });

		await render(
			<Protected>
				<Text>Secret Content</Text>
			</Protected>,
		);

		expect(screen.getByText('Secret Content')).toBeOnTheScreen();
		expect(screen.queryByText('Accès Refusé')).not.toBeOnTheScreen();
	});

	it('renders access denied message when is_staff is false', async () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({ is_staff: false });

		await render(
			<Protected>
				<Text>Secret Content</Text>
			</Protected>,
		);

		expect(screen.getByText('Accès Refusé')).toBeOnTheScreen();
		expect(screen.getByText(/Vous n'avez pas la permission d'accéder à cette page/i)).toBeOnTheScreen();
		expect(screen.queryByText('Secret Content')).not.toBeOnTheScreen();
	});
});

it('waits for the profile before evaluating permissions', async () => {
	(useAppSelector as jest.Mock).mockReturnValue({});
	(usePermission as jest.Mock).mockReturnValue({ is_staff: false });
	await render(
		<Protected>
			<Text>Secret Content</Text>
		</Protected>,
	);
	expect(screen.getByRole('progressbar')).toBeOnTheScreen();
	expect(screen.queryByText('Secret Content')).toBeNull();
	expect(screen.queryByText('Accès Refusé')).toBeNull();
});
