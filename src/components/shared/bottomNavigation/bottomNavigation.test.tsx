import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import BottomNavigation from './bottomNavigation';
import { translations } from '@/translations';
import { DASHBOARD_SETTINGS, NOTIFICATIONS_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
let mockUnread = 3;
let mockMode: 'light' | 'dark' = 'light';
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: mockMode }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => mockUnread,
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const t = translations.fr;
beforeEach(() => {
	jest.clearAllMocks();
	mockUnread = 3;
	mockMode = 'light';
});

it.each(['ios', 'android'] as const)(
	'keeps the same actions on one continuous surface with a raised Add button on %s',
	async (platform) => {
		const os = jest.replaceProperty(Platform, 'OS', platform);
		const add = jest.fn();
		try {
			await render(<BottomNavigation createAction={{ label: 'Nouveau client', onPress: add }} />);
			expect(screen.getByTestId('bottom-navigation')).toHaveStyle({ marginTop: -16, flexShrink: 0 });
			expect(screen.getByTestId('bottom-navigation')).toHaveProp('pointerEvents', 'box-none');
			expect(screen.getByTestId('bottom-navigation-surface')).toHaveStyle({
				top: 16,
				bottom: 0,
				left: 0,
				right: 0,
				borderTopWidth: 1,
			});
			expect(screen.getByTestId('bottom-navigation-surface').props.style.boxShadow).toBeUndefined();
			expect(screen.getByTestId('bottom-navigation-add-shadow')).toHaveStyle({
				borderRadius: platform === 'ios' ? 32 : 22,
			});
			expect(screen.getByTestId('bottom-navigation-add-shadow').props.style).toEqual(
				expect.arrayContaining([expect.objectContaining({ boxShadow: expect.any(String) })]),
			);
			await fireEvent.press(screen.getByRole('button', { name: 'Nouveau client' }));
			expect(add).toHaveBeenCalledTimes(1);
			await fireEvent.press(screen.getByRole('button', { name: t.navigation.notifications }));
			expect(router.push).toHaveBeenCalledWith(NOTIFICATIONS_LIST);
			await fireEvent.press(screen.getByRole('button', { name: t.navigation.settings }));
			expect(router.push).toHaveBeenCalledWith(DASHBOARD_SETTINGS);
		} finally {
			os.restore();
		}
	},
);

it.each(['ios', 'android'] as const)(
	'hides Add while keeping the navigation positions unchanged on %s',
	async (platform) => {
		const os = jest.replaceProperty(Platform, 'OS', platform);
		try {
			await render(<BottomNavigation createAction={{ label: 'Nouveau client', onPress: jest.fn() }} />);
			const slot = screen.getByTestId('bottom-navigation-add-slot').props;
			const navigationStyle = screen.getByTestId('bottom-navigation').props.style;
			await screen.rerender(<BottomNavigation />);
			expect(screen.queryByRole('button', { name: t.common.add })).toBeNull();
			expect(screen.queryByText(t.common.add)).toBeNull();
			expect(screen.queryByTestId('bottom-navigation-add-shadow')).toBeNull();
			expect(screen.getAllByRole('button')).toHaveLength(2);
			expect(screen.getByTestId('bottom-navigation-add-slot')).toHaveStyle(slot.style);
			expect(screen.getByTestId('bottom-navigation-add-slot')).toHaveProp('className', slot.className);
			expect(screen.getByTestId('bottom-navigation')).toHaveStyle(navigationStyle);
			expect(screen.getByTestId('bottom-navigation-surface')).toHaveStyle({ top: 16 });
		} finally {
			os.restore();
		}
	},
);

it('keeps a temporarily disabled create action without allowing it to run', async () => {
	const add = jest.fn();
	await render(<BottomNavigation disabled createAction={{ label: 'Nouvel utilisateur', onPress: add }} />);
	expect(screen.getByRole('button', { name: 'Nouvel utilisateur' })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: 'Nouvel utilisateur' }));
	expect(add).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: t.navigation.settings })).toBeEnabled();
});

it('uses the current list callback when the selected company changes', async () => {
	const addFirst = jest.fn(),
		addSecond = jest.fn();
	await render(<BottomNavigation createAction={{ label: 'Nouveau client', onPress: addFirst }} />);
	await screen.rerender(<BottomNavigation createAction={{ label: 'Nouveau client', onPress: addSecond }} />);
	await fireEvent.press(screen.getByRole('button', { name: 'Nouveau client' }));
	expect(addFirst).not.toHaveBeenCalled();
	expect(addSecond).toHaveBeenCalledTimes(1);
});

it('shows the live unread count, caps the visible badge, and hides it at zero', async () => {
	await render(<BottomNavigation />);
	expect(screen.getByTestId('bottom-navigation-unread')).toHaveProp(
		'accessibilityLabel',
		t.navigation.unreadNotifications(3),
	);
	mockUnread = 120;
	await screen.rerender(<BottomNavigation />);
	expect(screen.getByText('99+')).toBeOnTheScreen();
	mockUnread = 0;
	await screen.rerender(<BottomNavigation />);
	expect(screen.queryByTestId('bottom-navigation-unread')).toBeNull();
});

it('marks the active destination without stacking it again', async () => {
	await render(<BottomNavigation activePage="settings" />);
	await fireEvent.press(screen.getByRole('button', { name: t.navigation.settings }));
	expect(screen.getByRole('button', { name: t.navigation.settings })).toBeSelected();
	expect(router.push).not.toHaveBeenCalled();
	expect(router.replace).not.toHaveBeenCalled();
});

it('replaces the current section when switching between Notifications and Settings', async () => {
	await render(<BottomNavigation activePage="notifications" />);
	await fireEvent.press(screen.getByRole('button', { name: t.navigation.settings }));
	expect(router.replace).toHaveBeenLastCalledWith(DASHBOARD_SETTINGS);
	await screen.rerender(<BottomNavigation activePage="settings" />);
	await fireEvent.press(screen.getByRole('button', { name: t.navigation.notifications }));
	expect(router.replace).toHaveBeenLastCalledWith(NOTIFICATIONS_LIST);
	expect(router.push).not.toHaveBeenCalled();
});

it('uses the shared dark surface and hides the dock while inline search is open', async () => {
	mockMode = 'dark';
	await render(<BottomNavigation />);
	expect(screen.getByTestId('bottom-navigation-surface')).toHaveStyle({ backgroundColor: colors.panel });
	await screen.rerender(<BottomNavigation hidden />);
	expect(screen.queryByTestId('bottom-navigation')).toBeNull();
});
