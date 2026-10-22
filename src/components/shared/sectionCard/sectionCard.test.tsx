import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import SectionCard from './sectionCard';
import { cardShadows, colors, surfaceStyles } from '@/utils/themes';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let mockMode: 'light' | 'dark' = 'light';
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: mockMode }) }));

beforeEach(() => {
	mockMode = 'light';
});

it('normalizes a supplied form section icon to the same compact heading as detail pages', async () => {
	await render(
		<SectionCard
			title="Sociétés gérées"
			startIcon={<MaterialIcons name="business" size={40} color={colors.slate[400]} />}
		>
			<Text>Company controls</Text>
		</SectionCard>,
	);
	const icon = screen.container.queryAll((node) => node.props.name === 'business')[0];
	expect(icon).toHaveProp('size', 22);
	expect(icon).toHaveProp('color', colors.brand);
});

it.each(['light', 'dark'] as const)('uses the shared %s card surface, heading and compact icon', async (mode) => {
	mockMode = mode;
	await render(
		<SectionCard title="Client identity" icon="person-outline">
			<Text>Client fields</Text>
		</SectionCard>,
	);
	expect(screen.getByRole('header', { name: 'Client identity' })).toBeOnTheScreen();
	expect(screen.getByText('Client fields')).toBeOnTheScreen();
	const container = screen.container.queryAll((node) => node.type === 'View')[0];
	expect(container).toHaveStyle({ ...surfaceStyles[mode], ...cardShadows[mode] });
	const icon = screen.container.queryAll((node) => node.props.name === 'person-outline')[0];
	expect(icon).toHaveProp('size', 22);
	expect(icon).toHaveProp('color', colors.brand);
});

it('renders identity content without adding an empty heading', async () => {
	await render(
		<SectionCard>
			<Text>Client name</Text>
		</SectionCard>,
	);
	expect(screen.getByText('Client name')).toBeOnTheScreen();
	expect(screen.queryByRole('header')).toBeNull();
});

it.each([0, 4])('shows an explicitly supplied count, including zero: %s', async (count) => {
	await render(
		<SectionCard title="Companies" count={count}>
			<Text>Company entries</Text>
		</SectionCard>,
	);
	expect(screen.getByText(String(count))).toBeOnTheScreen();
});

it('leaves list sections unframed so their document cards have a single boundary', async () => {
	await render(
		<SectionCard title="Client history" variant="list">
			<Text>Document cards</Text>
		</SectionCard>,
	);
	expect(screen.getByRole('header', { name: 'Client history' })).toBeOnTheScreen();
	expect(screen.getByText('Document cards')).toBeOnTheScreen();
	const container = screen.container.queryAll((node) => node.type === 'View')[0];
	expect(container.props.style).toBeUndefined();
});
