import { render, screen } from '@testing-library/react-native';
import DocumentStatus from './documentStatus';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));

describe('DocumentStatus', () => {
	it.each(['Brouillon', 'Envoyé', 'Accepté', 'Refusé', 'Annulé', 'Expiré', 'Facturé'])(
		'renders the API status %s with a visible label and icon',
		async (statut) => {
			await render(<DocumentStatus statut={statut} />);
			expect(screen.getByText(statut)).toBeOnTheScreen();
			expect(screen.container.queryAll((node) => node.type === 'Icon')).toHaveLength(1);
		},
	);

	it('renders valid payment receipts with the shared green check instead of a pending icon', async () => {
		await render(<DocumentStatus statut="Valide" />);
		const t = jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr;
		expect(screen.getByText(t.common.validShort)).toHaveProp('className', expect.stringContaining('text-emerald'));
		expect(
			screen.container.queryAll((node) => node.type === 'Icon' && node.props.name === 'check-circle'),
		).toHaveLength(1);
	});

	it.each([
		['Validé', 'text-emerald'],
		['Clôturé', 'text-emerald'],
		['Bloqué', 'text-red'],
		['En retard', 'text-red'],
		['En attente', 'text-orange'],
		['À lancer', 'text-orange'],
		['À clôturer', 'text-orange'],
		['Non demandé', 'text-slate'],
		['En cours', 'text-brand'],
	])('reuses the shared label, icon and semantic color for logistics status %s', async (statut, tone) => {
		await render(<DocumentStatus statut={statut!} />);
		expect(screen.getByText(statut!)).toHaveProp('className', expect.stringContaining(tone!));
		expect(screen.container.queryAll((node) => node.type === 'Icon')).toHaveLength(1);
	});
});
