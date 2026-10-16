import { useContext } from 'react';
import { Button, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ToastContext, ToastContextProvider } from '@/contexts/toastContext';
import { translations } from '@/translations';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const Example = () => {
	const toast = useContext(ToastContext)!;
	return (
		<View>
			<Button title="Success" onPress={() => toast.onSuccess(translations.fr.users.addSuccess)} />
			<Button title="Error" onPress={() => toast.onError(translations.fr.users.addError)} />
		</View>
	);
};
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
it('announces a user-added success popup and dismisses it explicitly', async () => {
	await render(
		<ToastContextProvider>
			<Example />
		</ToastContextProvider>,
	);
	await fireEvent.press(screen.getByText('Success'));
	expect(screen.getByText(translations.fr.users.addSuccess)).toBeOnTheScreen();
	expect(screen.getByTestId('toast-icon').props.name).toBe('check-circle-outline');
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
	expect(screen.queryByText(translations.fr.users.addSuccess)).toBeNull();
});
it('replaces a success popup with an error and resets its dismiss timer', async () => {
	await render(
		<ToastContextProvider>
			<Example />
		</ToastContextProvider>,
	);
	await fireEvent.press(screen.getByText('Success'));
	await act(() => jest.advanceTimersByTime(4000));
	await fireEvent.press(screen.getByText('Error'));
	await act(() => jest.advanceTimersByTime(2000));
	expect(screen.getByText(translations.fr.users.addError)).toBeOnTheScreen();
	expect(screen.getByTestId('toast-icon').props.name).toBe('error-outline');
	expect(screen.queryByText(translations.fr.users.addSuccess)).toBeNull();
	await act(() => jest.advanceTimersByTime(4000));
	expect(screen.queryByText(translations.fr.users.addError)).toBeNull();
});
it('shows the same success again after the previous toast closes', async () => {
	await render(
		<ToastContextProvider>
			<Example />
		</ToastContextProvider>,
	);
	await fireEvent.press(screen.getByText('Success'));
	await act(() => jest.advanceTimersByTime(6000));
	expect(screen.queryByText(translations.fr.users.addSuccess)).toBeNull();
	await fireEvent.press(screen.getByText('Success'));
	expect(screen.getByText(translations.fr.users.addSuccess)).toBeOnTheScreen();
	expect(screen.getByTestId('toast-icon')).toHaveProp('name', 'check-circle-outline');
});
