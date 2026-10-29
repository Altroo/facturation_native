import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import SettingsPage from '@/app/(app)/(drawer)/settings';
import { translations } from '@/translations';
import { DASHBOARD_EDIT_PROFILE, DASHBOARD_NOTIFICATIONS, DASHBOARD_PASSWORD } from '@/utils/routes';
import { DASHBOARD_OBJECTIFS_MENSUELS } from '@/utils/routes';
const mockProfile = { is_staff: false };

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/utils/hooks', () => ({
	useAppSelector: (selector: unknown) =>
		selector === jest.requireActual('@/store/selectors').getProfilState ? mockProfile : 0,
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
beforeEach(() => {
	mockProfile.is_staff = false;
	jest.clearAllMocks();
});

describe('SettingsPage', () => {
	it('opens the existing settings forms from one menu without duplicating their inputs', async () => {
		await render(<SettingsPage />);
		for (const [label, path] of [
			[translations.fr.navigation.myProfile, DASHBOARD_EDIT_PROFILE],
			[translations.fr.navigation.changePassword, DASHBOARD_PASSWORD],
			[translations.fr.navigation.notificationPreferences, DASHBOARD_NOTIFICATIONS],
		]) {
			await fireEvent.press(screen.getByRole('button', { name: label }));
			expect(router.push).toHaveBeenLastCalledWith(path);
		}
		expect(screen.queryAllByRole('textbox')).toHaveLength(0);
		expect(screen.getByRole('button', { name: translations.fr.navigation.settings })).toBeSelected();
	});

	it('opens monthly objective configuration from Paramètres for administrators only', async () => {
		const view = await render(<SettingsPage />);
		expect(screen.queryByRole('button', { name: translations.fr.navigation.monthlyObjectives })).not.toBeOnTheScreen();
		mockProfile.is_staff = true;
		await view.rerender(<SettingsPage />);
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.navigation.monthlyObjectives }));
		expect(router.push).toHaveBeenLastCalledWith(DASHBOARD_OBJECTIFS_MENSUELS());
	});
});
