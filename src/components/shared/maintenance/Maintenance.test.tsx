import { fireEvent, render, screen } from '@testing-library/react-native';

import Maintenance from './Maintenance';
import { useAppSelector } from '@/utils/hooks';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

jest.mock('@/utils/hooks', () => ({
	useAppSelector: jest.fn(),
	useLanguage: () => ({
		language: 'fr' as const,
		setLanguage: jest.fn(),
		t: jest.requireActual('@/translations').translations.fr,
	}),
}));

const mockedUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;

describe('Maintenance', () => {
	it('renders nothing when maintenance is disabled', async () => {
		mockedUseAppSelector.mockReturnValue(false);

		const { toJSON } = await render(<Maintenance />);

		expect(toJSON()).toBeNull();
	});

	it('renders the maintenance page when maintenance is enabled', async () => {
		mockedUseAppSelector.mockReturnValue(true);

		await render(<Maintenance />);

		expect(screen.getByTestId('maintenance-gate')).toBeOnTheScreen();
		expect(screen.getByText('Maintenance en cours')).toBeOnTheScreen();
		expect(screen.getByText(/Nous effectuons actuellement une maintenance sur E\.B\.H Facturation/i)).toBeOnTheScreen();
	});

	it('keeps maintenance open when native Back requests dismissal', async () => {
		mockedUseAppSelector.mockReturnValue(true);
		await render(<Maintenance />);
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
			'requestClose',
		);
		expect(screen.getByTestId('maintenance-gate')).toBeOnTheScreen();
	});
});
