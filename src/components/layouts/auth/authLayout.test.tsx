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
it.each(['ios', 'android'] as const)('uses the appropriate keyboard behavior on %s', async (platform) => {
	const original = jest.replaceProperty(Platform, 'OS', platform);
	try {
		await render(
			<AuthLayout>
				<Text>Mot de passe</Text>
			</AuthLayout>,
		);
		const keyboardView = screen.container.queryAll((node) => typeof node.props.onLayout === 'function')[0]!;
		if (platform === 'ios') expect(keyboardView).toHaveStyle({ paddingBottom: 0 });
		else expect(keyboardView).not.toHaveStyle({ paddingBottom: 0 });
		expect(screen.getByText('Mot de passe')).toBeOnTheScreen();
	} finally {
		original.restore();
	}
});

describe('AuthLayout', () => {
	it('renders children inside right box', async () => {
		await render(
			<AuthLayout>
				<Text>Login Form</Text>
			</AuthLayout>,
		);
		expect(screen.getByText('Login Form')).toBeOnTheScreen();
	});
});
