import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NativeStackNavigationOptions } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DrawerStackLayout from '@/app/(app)/(drawer)/_layout';
import { translations } from '@/translations';
let mockOptions: NativeStackNavigationOptions;
let mockRouteName = 'users/form';
let mockReduceMotion = false;
const mockToggleTheme = jest.fn();
const mockSetLanguage = jest.fn();
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({
	useColorMode: () => ({ mode: 'light', toggleTheme: mockToggleTheme }),
}));
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual('@/translations').translations.fr,
		language: 'fr',
		setLanguage: mockSetLanguage,
	}),
}));
jest.mock('react-native-reanimated', () => ({
	...jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated'),
	useReducedMotion: () => mockReduceMotion,
}));
jest.mock('expo-router', () => ({
	Stack: Object.assign(
		(props: { screenOptions: (args: { route: { name: string } }) => NativeStackNavigationOptions }) => {
			mockOptions = props.screenOptions({ route: { name: mockRouteName } });
			return null;
		},
		{ Screen: () => null },
	),
}));
jest.mock('expo-router/drawer', () => ({ DrawerToggleButton: () => null }));
const setup = async () => {
	await render(
		<SafeAreaProvider
			initialMetrics={{
				frame: { x: 0, y: 0, width: 390, height: 844 },
				insets: { top: 0, right: 0, bottom: 0, left: 0 },
			}}
		>
			<DrawerStackLayout />
		</SafeAreaProvider>,
	);
};
beforeEach(() => {
	jest.clearAllMocks();
	mockRouteName = 'users/form';
	mockReduceMotion = false;
});

it.each([
	['bon-de-livraison/index', translations.fr.bonsLivraison.listTitle],
	['bon-de-livraison/uninvoiced', translations.fr.bonsLivraison.uninvoicedTitle],
	['bon-de-livraison/form', translations.fr.bonsLivraison.addTitle],
	['bon-de-livraison/[id]/index', translations.fr.bonsLivraison.detailsTitle],
	['facture-avoir/index', translations.fr.facturesAvoir.listTitle],
	['facture-avoir/form', translations.fr.facturesAvoir.addTitle],
	['facture-avoir/[id]/index', translations.fr.facturesAvoir.detailsTitle],
	['facture-pro-forma/index', translations.fr.facturesProforma.listTitle],
	['facture-pro-forma/[id]/index', translations.fr.facturesProforma.detailsTitle],
	['facture-client/index', translations.fr.facturesClient.listTitle],
	['facture-client/unpaid', translations.fr.facturesClient.unpaidListTitle],
	['facture-client/[id]/index', translations.fr.facturesClient.detailsTitle],
	['reglements/form', translations.fr.reglements.addTitle],
])('keeps both theme and language actions usable on %s', async (route, title) => {
	mockRouteName = route;
	await setup();
	expect(mockOptions.title).toBe(title);
	const action = mockOptions.unstable_headerRightItems?.({ canGoBack: true })[0];
	if (action?.type !== 'custom') {
		expect(action?.type).toBe('custom');
		return;
	}
	await render(action.element);
	await fireEvent.press(screen.getByRole('button', { name: 'Activer le mode sombre' }));
	expect(mockToggleTheme).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('button', { name: 'English' }));
	expect(mockSetLanguage).toHaveBeenCalledWith('en');
});

it('preserves the native navbar and original back icon', async () => {
	await setup();
	expect(mockOptions.header).toBeUndefined();
	expect(mockOptions.headerBackIcon).toBeUndefined();
	expect(mockOptions.headerBackImageSource).toBeUndefined();
	expect(mockOptions.headerStyle).not.toHaveProperty('height');
	expect(mockOptions.headerTitleAlign).toBe('left');
	expect(mockOptions.headerBackVisible).toBe(true);
});

it.each([
	['future-module/index', 'slide_from_right'],
	['notifications/index', 'slide_from_bottom'],
	['settings/index', 'slide_from_bottom'],
])('uses the shared transition for %s and respects Reduced Motion', async (route, animation) => {
	mockRouteName = route;
	await setup();
	expect(mockOptions.animation).toBe(animation);
	mockReduceMotion = true;
	await setup();
	expect(mockOptions.animation).toBe('none');
});
