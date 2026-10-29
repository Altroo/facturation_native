import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, Pressable, Text } from 'react-native';
import AuthLayout from './authLayout';

jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/components/shared/themeToggle/themeToggle', () => ({
	AuthThemeToggle: () => {
		const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
		return <Text>Préférences</Text>;
	},
}));
jest.mock('@/components/shared/languageSwitcher/languageSwitcher', () => () => null);

describe('AuthLayout', () => {
	it('keeps authentication children interactive with preferences visible', async () => {
		const submit = jest.fn();
		await render(
			<AuthLayout>
				<Pressable accessibilityRole="button" onPress={submit}>
					<Text>Connexion</Text>
				</Pressable>
			</AuthLayout>,
		);
		expect(screen.getByText('Préférences')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Connexion' }));
		expect(submit).toHaveBeenCalledTimes(1);
		expect(screen.container.queryAll((node) => node.type === 'RCTScrollView')[0]!.props.keyboardShouldPersistTaps).toBe(
			'handled',
		);
	});

	it.each(['ios', 'android'] as const)('keeps keyboard scrolling and dismissal enabled on %s', async (platform) => {
		const original = jest.replaceProperty(Platform, 'OS', platform);
		try {
			await render(
				<AuthLayout>
					<Text>Mot de passe</Text>
				</AuthLayout>,
			);
			const scrollView = screen.container.queryAll((node) => node.type === 'RCTScrollView')[0]!;
			expect(scrollView.props.keyboardDismissMode).toBe(platform === 'ios' ? 'interactive' : 'on-drag');
			expect(screen.getByText('Mot de passe')).toBeOnTheScreen();
		} finally {
			original.restore();
		}
	});

	it('renders children inside right box', async () => {
		await render(
			<AuthLayout>
				<Text>Login Form</Text>
			</AuthLayout>,
		);
		expect(screen.getByText('Login Form')).toBeOnTheScreen();
	});
});
