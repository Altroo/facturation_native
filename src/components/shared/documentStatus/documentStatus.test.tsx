import { render, screen } from '@testing-library/react-native';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));

import DocumentStatus from './documentStatus';
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
	expect(screen.container.queryAll((node) => node.type === 'Icon' && node.props.name === 'check-circle')).toHaveLength(
		1,
	);
});
