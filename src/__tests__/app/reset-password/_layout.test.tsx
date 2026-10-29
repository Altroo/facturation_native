import { Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor, act } from 'expo-router/testing-library';
import ResetPasswordLayout from '@/app/reset-password/_layout';
import ResetPasswordPage from '@/app/reset-password/index';
import EnterCode from '@/app/reset-password/enter-code';
import SetPassword from '@/app/reset-password/set-password';
import SetPasswordComplete from '@/app/reset-password/set-password-complete';
import { passwordResetStorage } from '@/Storage/passwordResetStorage';
import { translations } from '@/translations';
import { SHORT_INPUT_REQUIRED } from '@/utils/formValidationErrorMessages';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.spyOn(passwordResetStorage, 'read');
jest.spyOn(passwordResetStorage, 'write');
const mockSendCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockSetPassword = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock('@/store/services/account', () => ({
	useSendPasswordResetCodeMutation: () => [
		(data: unknown) => ({ unwrap: () => mockSendCode(data) }),
		{ isLoading: false },
	],
	usePasswordResetMutation: () => [(data: unknown) => ({ unwrap: () => mockVerifyCode(data) }), { isLoading: false }],
	useSetPasswordMutation: () => [(data: unknown) => ({ unwrap: () => mockSetPassword(data) }), { isLoading: false }],
}));
jest.mock('@/utils/hooks', () => ({
	...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
	useLanguage: () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		theme: 'light',
	}),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
const t = translations.fr;
const email = 'recovery@example.invalid';
const setup = async (initialUrl = '/reset-password') =>
	await renderRouter(
		{
			_layout: () => <Stack screenOptions={{ headerShown: false }} />,
			login: () => <Text>Login destination</Text>,
			'reset-password/_layout': ResetPasswordLayout,
			'reset-password/index': ResetPasswordPage,
			'reset-password/enter-code': EnterCode,
			'reset-password/set-password': SetPassword,
			'reset-password/set-password-complete': SetPasswordComplete,
		},
		{ initialUrl },
	);
beforeEach(() => {
	jest.clearAllMocks();
	passwordResetStorage.resetCompletion();
	let saved: Awaited<ReturnType<typeof passwordResetStorage.read>> = null;
	jest.mocked(passwordResetStorage.read).mockImplementation(async () => saved);
	jest.mocked(passwordResetStorage.write).mockImplementation(async (value) => {
		saved = value;
	});
	mockSendCode.mockResolvedValue(undefined);
	mockVerifyCode.mockResolvedValue(undefined);
	mockSetPassword.mockResolvedValue(undefined);
});
const enterPasswords = async () => {
	await fireEvent.changeText(screen.getByLabelText(t.auth.passwordLabel), 'new-example-pass');
	await fireEvent.changeText(screen.getByLabelText(t.auth.confirmPasswordLabel), 'new-example-pass');
};

describe('ResetPasswordLayout', () => {
	it('uses the top-bar back action to leave a recovery deep link without a body return button', async () => {
		await setup();
		expect(screen.queryByRole('button', { name: t.auth.backToLogin })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
		await screen.findByText('Login destination');
	});

	it('shows the original required-digit message when submitting an empty code', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '' });
		await setup('/reset-password/enter-code');
		await fireEvent.press(await screen.findByRole('button', { name: t.auth.confirmCode }));
		await screen.findByText(SHORT_INPUT_REQUIRED);
		expect(mockVerifyCode).not.toHaveBeenCalled();
	});

	it('runs all four recovery pages, preserves a leading zero, clears stored state, and returns to login', async () => {
		await setup();
		await fireEvent.changeText(await screen.findByLabelText(t.auth.emailLabel), email);
		await fireEvent.press(screen.getByRole('button', { name: t.auth.sendCodeButton }));
		await screen.findByText(t.auth.enterCodeTitle);
		expect(mockSendCode).toHaveBeenCalledWith({ email });
		expect(passwordResetStorage.write).toHaveBeenCalledWith({ email, code: '' });
		await fireEvent.changeText(screen.getByLabelText(`${t.auth.enterCodeTitle} 1`), '012345');
		await fireEvent.press(screen.getByRole('button', { name: t.auth.confirmCode }));
		await screen.findByLabelText(t.auth.passwordLabel);
		expect(mockVerifyCode).toHaveBeenCalledWith({ email, code: '012345' });
		expect(passwordResetStorage.write).toHaveBeenCalledWith({ email, code: '012345' });
		await enterPasswords();
		await fireEvent.press(screen.getByRole('button', { name: t.auth.changePasswordButton }));
		await screen.findByText(t.auth.passwordChanged);
		expect(mockSetPassword).toHaveBeenCalledWith({
			email,
			code: '012345',
			new_password: 'new-example-pass',
			new_password2: 'new-example-pass',
		});
		expect(passwordResetStorage.write).toHaveBeenLastCalledWith(null);
		expect(
			jest.mocked(passwordResetStorage.write).mock.calls.every(([value]) => !value || !('new_password' in value)),
		).toBe(true);
		await fireEvent.press(screen.getByRole('button', { name: t.auth.loginButton }));
		await screen.findByText('Login destination');
	});

	it('restores a previously verified code after reopening the set-password route', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		await setup('/reset-password/set-password');
		await screen.findByLabelText(t.auth.passwordLabel);
		expect(mockVerifyCode).not.toHaveBeenCalled();
	});

	it.each([
		['/reset-password/enter-code', `${t.auth.enterCodeTitle} 1`],
		['/reset-password/set-password', t.auth.passwordLabel],
	])('reads recovery once per focus and checks it again when returning to %s', async (path, inputLabel) => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		await setup(path);
		await screen.findByLabelText(inputLabel);
		expect(passwordResetStorage.read).toHaveBeenCalledTimes(1);
		await act(async () => router.push('/login'));
		await screen.findByText('Login destination');
		jest.mocked(passwordResetStorage.read).mockResolvedValue(null);
		await act(async () => router.back());
		await screen.findByLabelText(t.auth.emailLabel);
		expect(passwordResetStorage.read).toHaveBeenCalledTimes(2);
	});

	it('waits for secure storage hydration before deciding whether a recovery deep link is allowed', async () => {
		let finish!: (value: { email: string; code: string }) => void;
		jest.mocked(passwordResetStorage.read).mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve;
				}),
		);
		await setup('/reset-password/set-password');
		expect(screen.queryByLabelText(t.auth.emailLabel)).toBeNull();
		expect(screen.queryByLabelText(t.auth.passwordLabel)).toBeNull();
		await act(async () => finish({ email, code: '012345' }));
		await screen.findByLabelText(t.auth.passwordLabel);
	});

	it('still shows completion when clearing device storage fails after Django changed the password', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		jest.mocked(passwordResetStorage.write).mockRejectedValueOnce(new Error('Storage unavailable'));
		await setup('/reset-password/set-password');
		await screen.findByLabelText(t.auth.passwordLabel);
		await enterPasswords();
		await fireEvent.press(screen.getByRole('button', { name: t.auth.changePasswordButton }));
		await screen.findByText(t.auth.passwordChanged);
		expect(mockSetPassword).toHaveBeenCalledTimes(1);
	});

	it.each(['/reset-password/enter-code', '/reset-password/set-password', '/reset-password/set-password-complete'])(
		'redirects incomplete recovery deep links to the email form: %s',
		async (initialUrl) => {
			await setup(initialUrl);
			await screen.findByLabelText(t.auth.emailLabel);
			expect(mockSetPassword).not.toHaveBeenCalled();
		},
	);

	it('resends the email, clears a previous code, and confirms success', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		await setup('/reset-password/enter-code');
		await fireEvent.press(await screen.findByRole('button', { name: t.auth.resendCode }));
		await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(t.auth.codeSent));
		expect(mockSendCode).toHaveBeenCalledWith({ email });
		expect(passwordResetStorage.write).toHaveBeenCalledWith({ email, code: '' });
	});

	it('shows a rejected or expired code above the digit inputs', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '' });
		mockVerifyCode.mockRejectedValueOnce({ status: 400, data: { details: { code: ['Code expired'] } } });
		await setup('/reset-password/enter-code');
		await fireEvent.changeText(await screen.findByLabelText(`${t.auth.enterCodeTitle} 1`), '012345');
		await fireEvent.press(screen.getByRole('button', { name: t.auth.confirmCode }));
		await screen.findByText('Code expired');
		expect(passwordResetStorage.write).not.toHaveBeenCalled();
		expect(screen.queryByLabelText(t.auth.passwordLabel)).toBeNull();
	});

	it('handles code expiry during password entry and lets the user return to resend', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		mockSetPassword.mockRejectedValueOnce({ status: 400, data: { details: { code: ['Code expired'] } } });
		await setup('/reset-password/set-password');
		await screen.findByLabelText(t.auth.passwordLabel);
		await enterPasswords();
		await fireEvent.press(screen.getByRole('button', { name: t.auth.changePasswordButton }));
		await screen.findByText('Code expired');
		expect(passwordResetStorage.write).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.back }));
		await screen.findByText(t.auth.enterCodeTitle);
	});

	it('shows email errors without navigating or persisting recovery state', async () => {
		mockSendCode.mockRejectedValueOnce({ status: 400, data: { details: { email: ['Unknown account'] } } });
		await setup();
		await fireEvent.changeText(await screen.findByLabelText(t.auth.emailLabel), email);
		await fireEvent.press(screen.getByRole('button', { name: t.auth.sendCodeButton }));
		await screen.findByText('Unknown account');
		expect(passwordResetStorage.write).not.toHaveBeenCalled();
	});

	it('validates an email before sending any recovery request', async () => {
		await setup();
		await fireEvent.changeText(await screen.findByLabelText(t.auth.emailLabel), 'invalid-email');
		await fireEvent.press(screen.getByRole('button', { name: t.auth.sendCodeButton }));
		await waitFor(() => expect(screen.getByRole('alert')).toBeOnTheScreen());
		expect(mockSendCode).not.toHaveBeenCalled();
	});

	it('does not advance when recovery state cannot be persisted', async () => {
		jest.mocked(passwordResetStorage.write).mockRejectedValueOnce(new Error('Storage unavailable'));
		await setup();
		await fireEvent.changeText(await screen.findByLabelText(t.auth.emailLabel), email);
		await fireEvent.press(screen.getByRole('button', { name: t.auth.sendCodeButton }));
		await waitFor(() => expect(passwordResetStorage.write).toHaveBeenCalledWith({ email, code: '' }));
		await screen.findByText('Impossible de se connecter au serveur');
		expect(screen.getByLabelText(t.auth.emailLabel)).toBeOnTheScreen();
		expect(screen.queryByText(t.auth.enterCodeTitle)).toBeNull();
	});

	it('reports resend failure without clearing the previous verified code', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		mockSendCode.mockRejectedValueOnce({ status: 503, data: { detail: 'Unavailable' } });
		await setup('/reset-password/enter-code');
		await fireEvent.press(await screen.findByRole('button', { name: t.auth.resendCode }));
		await waitFor(() => expect(mockError).toHaveBeenCalledWith(t.auth.codeSendError));
		await screen.findByText('Unavailable');
		expect(passwordResetStorage.write).not.toHaveBeenCalled();
	});

	it('shows password confirmation errors on the matching field', async () => {
		jest.mocked(passwordResetStorage.read).mockResolvedValue({ email, code: '012345' });
		mockSetPassword.mockRejectedValueOnce({ status: 400, data: { details: { new_password2: ['Passwords differ'] } } });
		await setup('/reset-password/set-password');
		await screen.findByLabelText(t.auth.passwordLabel);
		await enterPasswords();
		await fireEvent.changeText(screen.getByLabelText(t.auth.confirmPasswordLabel), 'different-example-pass');
		await fireEvent.press(screen.getByRole('button', { name: t.auth.changePasswordButton }));
		await screen.findByText('Passwords differ');
		expect(passwordResetStorage.write).not.toHaveBeenCalled();
	});
});
