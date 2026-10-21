import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import InfoRow from './infoRow';
import { translations } from '@/translations';

it('keeps zero as a value and uses the shared empty text for missing values', async () => {
	await render(<InfoRow icon={null} label="Count" value={0} />);
	expect(screen.getByText('0')).toBeOnTheScreen();
	await screen.rerender(<InfoRow icon={null} label="Count" value={null} />);
	expect(screen.getByText(translations.fr.common.noData)).toBeOnTheScreen();
});

it('preserves custom elements supplied by a detail page', async () => {
	await render(
		<InfoRow icon={<Text>Icon</Text>} label="Status" value={<Text accessibilityRole="header">Active</Text>} />,
	);
	expect(screen.getByRole('header', { name: 'Active' })).toBeOnTheScreen();
	expect(screen.getByText('Icon')).toBeOnTheScreen();
});

it('keeps the label separate from the value and handles missing values without an empty label prefix', async () => {
	const { rerender } = await render(<InfoRow dense icon={null} label="Count" value={0} />);
	expect(screen.getByText('Count')).toBeOnTheScreen();
	expect(screen.getByText('0')).toBeOnTheScreen();
	await rerender(<InfoRow dense icon={null} label="" value={null} />);
	expect(screen.getByText(translations.fr.common.noData)).toBeOnTheScreen();
});
