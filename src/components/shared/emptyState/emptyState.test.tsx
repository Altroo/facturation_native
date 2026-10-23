import { render, screen } from '@testing-library/react-native';
import EmptyState from './emptyState';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it('shows the caller message and updates it when the language changes', async () => {
	const view = await render(<EmptyState message="Aucun document trouvé." />);
	expect(screen.getByText('Aucun document trouvé.')).toBeOnTheScreen();
	await view.rerender(<EmptyState message="No document found." />);
	expect(screen.queryByText('Aucun document trouvé.')).toBeNull();
	expect(screen.getByText('No document found.')).toBeOnTheScreen();
});
