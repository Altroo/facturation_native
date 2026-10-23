import { render, screen } from '@testing-library/react-native';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));

import CustomBadge from './customBadge';
it('keeps existing badges blue by default', async () => {
	await render(<CustomBadge label="Service" />);
	expect(screen.getByText('Service')).toHaveProp('className', expect.stringContaining('text-brand'));
});
it.each([
	['success', 'text-emerald-700'],
	['danger', 'text-red-700'],
	['warning', 'text-orange-700'],
	['neutral', 'text-slate-600'],
] as const)('supports readable %s state colors', async (tone, className) => {
	await render(<CustomBadge label="Status" tone={tone} />);
	expect(screen.getByText('Status')).toHaveProp('className', expect.stringContaining(className));
});
