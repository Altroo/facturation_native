import { logisticsOrder, resetLogistiqueScreen } from '@/__tests__/logistiqueScreenSetup';
import { render, screen } from '@testing-library/react-native';
import LogistiqueCard from './logistiqueCard';
import { translations } from '@/translations';

beforeEach(resetLogistiqueScreen);

describe('LogistiqueCard', () => {
	it('shares the list field design, formatted amounts and status badges', async () => {
		await render(<LogistiqueCard order={logisticsOrder} />);
		expect(screen.getByText('Atlas Supply')).toHaveProp('className', expect.stringContaining('font-poppins-semibold'));
		expect(screen.getByText('En retard')).toHaveProp('className', expect.stringContaining('text-red'));
		expect(screen.getByText(/1\s250\s000,50 MAD/)).toBeOnTheScreen();
	});

	it('shows only the web supplier-history columns in summary mode', async () => {
		await render(<LogistiqueCard order={logisticsOrder} summary />);
		expect(screen.getByText(logisticsOrder.numero_commande)).toBeOnTheScreen();
		expect(screen.getByText(translations.fr.logistique.colDatePrevue)).toBeOnTheScreen();
		expect(screen.queryByText(translations.fr.logistique.colFournisseur)).toBeNull();
		expect(screen.queryByText(translations.fr.logistique.colPaiement)).toBeNull();
	});
});
