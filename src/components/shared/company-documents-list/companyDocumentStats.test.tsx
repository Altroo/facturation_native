import { fireEvent, render, screen } from '@testing-library/react-native';
import CompanyDocumentStats from './companyDocumentStats';
import { colors } from '@/utils/themes';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const props = {
	usesForeignCurrency: true,
	statsByCurrency: {
		MAD: { total_avoirs: '12500.50', total_tva: '2500.10' },
		EUR: { total_avoirs: '200', total_tva: '40' },
	},
	statistics: [
		{ label: 'Credits', field: 'total_avoirs' as const, icon: 'cancel' as const, color: colors.danger },
		{ label: 'VAT', field: 'total_tva' as const, icon: 'percent' as const, color: colors.warning },
	],
	onRetry: jest.fn(),
};

describe('CompanyDocumentStats', () => {
	it('formats backend totals, switches currency and preserves the shared compact controls', async () => {
		await render(<CompanyDocumentStats {...props} />);
		expect(screen.getByText('12 500,50 MAD')).toBeOnTheScreen();
		expect(screen.getByText('2 500,10 MAD')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
		expect(screen.getByText('200,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('40,00 EUR')).toBeOnTheScreen();
	});

	it('returns to MAD when foreign currency becomes disabled', async () => {
		const view = await render(<CompanyDocumentStats {...props} />);
		await fireEvent.press(screen.getByRole('radio', { name: 'EUR' }));
		await view.rerender(<CompanyDocumentStats {...props} usesForeignCurrency={false} />);
		expect(screen.queryByRole('radio')).toBeNull();
		expect(screen.getByText('12 500,50 MAD')).toBeOnTheScreen();
	});

	it('offers retry for a failed company request and handles absent statistics', async () => {
		await render(<CompanyDocumentStats {...props} statsByCurrency={undefined} error={{ status: 503 }} />);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
		expect(props.onRetry).toHaveBeenCalledTimes(1);
		expect(screen.getAllByText('0,00 MAD')).toHaveLength(2);
	});
});
