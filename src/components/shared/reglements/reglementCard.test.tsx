import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ReglementClass } from '@/models/classes';
import { translations } from '@/translations';
import ReglementCard from './reglementCard';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
const t = translations.fr;
const payment = new ReglementClass(
	1,
	7,
	'FAC7/26',
	3,
	'Atlas Client',
	2,
	'Virement',
	'Acompte',
	1234.5,
	'MAD',
	'2026-10-24',
	'2026-10-30',
	'Valide',
	'2026-10-24',
	'2026-10-24',
	2000,
	1234.5,
	765.5,
	'Bank transfer',
);
beforeEach(() => jest.clearAllMocks());

describe('ReglementCard', () => {
	it('shows the amount, status and invoice/client links scoped to the company', async () => {
		await render(<ReglementCard payment={payment} companyId={5} />);
		expect(screen.getByText('1 234,50 MAD')).toBeOnTheScreen();
		expect(screen.getByText(t.common.validShort)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: `${t.reglements.detailsTitle}: Acompte` }));
		expect(router.push).toHaveBeenLastCalledWith({
			pathname: '/reglements/[id]',
			params: { id: '1', company_id: '5' },
		});
		await fireEvent.press(screen.getByRole('link', { name: 'FAC7/26' }));
		expect(router.push).toHaveBeenLastCalledWith({
			pathname: '/facture-client/[id]',
			params: { id: '7', company_id: '5' },
		});
		await fireEvent.press(screen.getByRole('link', { name: 'Atlas Client' }));
		expect(router.push).toHaveBeenLastCalledWith({ pathname: '/clients/[id]', params: { id: '3', company_id: '5' } });
	});

	it('keeps invoice history compact and shows cancelled status and observations', async () => {
		await render(<ReglementCard payment={{ ...payment, statut: 'Annulé' }} companyId={5} invoiceContext />);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.getByText(t.rawData.documentStatuses.cancelled)).toBeOnTheScreen();
		expect(screen.getByText('1 234,50 MAD')).toHaveProp('className', expect.stringContaining('text-red-600'));
		expect(screen.getByText('Virement')).toBeOnTheScreen();
		expect(screen.getByText('Bank transfer')).toBeOnTheScreen();
	});

	it('blocks navigation while disabled and handles a missing client without a broken link', async () => {
		await render(<ReglementCard payment={{ ...payment, client: null, client_name: null }} companyId={5} disabled />);
		expect(screen.queryByRole('link', { name: 'Atlas Client' })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: `${t.reglements.detailsTitle}: Acompte` }));
		expect(router.push).not.toHaveBeenCalled();
	});
});
