import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { ReactNode } from 'react';
import DrawerLayout from '@/app/(app)/(drawer)/_layout';
import AuthenticatedLayout from '@/app/(app)/_layout';
import SettingsLayout from '@/app/(app)/(drawer)/settings/_layout';

const mockNavigator = ({
	screenOptions,
}: {
	screenOptions: {
		headerTitle: (props: { children: string; tintColor: string }) => ReactNode;
		headerRight: () => ReactNode;
	};
}) => (
	<>
		{screenOptions.headerTitle({ children: 'Modifier l’utilisateur', tintColor: '#0f172a' })}
		{screenOptions.headerRight()}
	</>
);
jest.mock('expo-router', () => ({
	usePathname: () => '/',
	Stack: Object.assign((props: Parameters<typeof mockNavigator>[0]) => mockNavigator(props), { Screen: () => null }),
}));
jest.mock('expo-router/drawer', () => ({
	Drawer: Object.assign((props: Parameters<typeof mockNavigator>[0]) => mockNavigator(props), { Screen: () => null }),
	DrawerToggleButton: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useAppSelector: () => null,
}));
jest.mock('@/components/layouts/navigationBar/navigationBar', () => {
	const actual = jest.requireActual<typeof import('@/components/layouts/navigationBar/navigationBar')>(
		'@/components/layouts/navigationBar/navigationBar',
	);
	const { cloneElement } = jest.requireActual<typeof import('react')>('react');
	return {
		...actual,
		NavigationDrawer: () => null,
		Notifications: () => null,
		useNavigationHeader: () => {
			const options = actual.useNavigationHeader();
			return { ...options, headerRight: () => cloneElement(options.headerRight(), {}, null) };
		},
	};
});
jest.mock('@/components/shared/themeToggle/themeToggle', () => () => null);
jest.mock('@/components/shared/languageSwitcher/languageSwitcher', () => () => null);
jest.mock('@/components/shared/appUpdate/appUpdate', () => () => null);

const originalWindow = Dimensions.get('window');
beforeEach(() => Dimensions.set({ window: { width: 320, height: 640, scale: 2, fontScale: 1 } }));
afterAll(() => Dimensions.set({ window: originalWindow }));
it.each([DrawerLayout, AuthenticatedLayout, SettingsLayout])(
	'keeps the title and controls separate at narrow widths in %p',
	async (Layout) => {
		await render(<Layout />);
		const title = screen.getByRole('header', { name: 'Modifier l’utilisateur' });
		expect(title).toHaveProp('numberOfLines', 1);
		expect(title).toHaveProp('ellipsizeMode', 'tail');
		expect(title).toHaveStyle({ maxWidth: 60, flexShrink: 1, color: '#0f172a' });
		const controls = screen.container
			.queryAll((node) => node.type === 'View')
			.find((view) => typeof view.props.onLayout === 'function')!;
		await fireEvent.layout(controls, { width: 280 });
		expect(title).toHaveStyle({ maxWidth: 0 });
		await act(() => Dimensions.set({ window: { width: 768, height: 1024, scale: 2, fontScale: 2 } }));
		expect(title).toHaveStyle({ maxWidth: 408 });
	},
);
