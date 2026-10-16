import { act, fireEvent, render, screen } from '@testing-library/react-native';
import CustomToast from './customToast';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
it.each(['success', 'error', 'info', 'warning'] as const)(
	'announces and dismisses the original %s toast variant',
	async (type) => {
		const setShow = jest.fn();
		const view = await render(<CustomToast type={type} message="Notification" show setShow={setShow} />);
		expect(view.getByRole('alert')).toBeOnTheScreen();
		expect(view.getByText('Notification')).toBeOnTheScreen();
		await fireEvent.press(view.getByRole('button', { name: translations.fr.common.close }));
		expect(setShow).toHaveBeenCalledWith(false);
		await view.unmount();
		expect(jest.getTimerCount()).toBe(0);
	},
);
it('hides after six seconds and never schedules a timer while closed', async () => {
	const setShow = jest.fn();
	const view = await render(<CustomToast type="info" message="Notification" show={false} setShow={setShow} />);
	expect(view.queryByRole('alert')).toBeNull();
	expect(jest.getTimerCount()).toBe(0);
	await view.rerender(<CustomToast type="info" message="Notification" show setShow={setShow} />);
	await act(() => jest.advanceTimersByTime(6000));
	expect(setShow).toHaveBeenCalledWith(false);
});

describe('CustomToast', () => {
	const setShowMock = jest.fn();

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders the message and has a working close control', async () => {
		const { unmount } = await render(
			<CustomToast type="error" show={true} setShow={setShowMock} message="Une erreur est survenue" />,
		);
		expect(screen.getByRole('alert')).toHaveTextContent('Une erreur est survenue');
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.close }));
		expect(setShowMock).toHaveBeenCalledWith(false);
		await unmount();
	});

	it('does not call setShow when clicking the message area', async () => {
		const { unmount } = await render(
			<CustomToast type="info" show={true} setShow={setShowMock} message="Info message" />,
		);
		await fireEvent.press(screen.getByText('Info message'));
		expect(setShowMock).not.toHaveBeenCalled();
		await unmount();
	});

	it('renders an icon scoped to each alert', async () => {
		const cases: Array<{ type: 'success' | 'error' | 'info' | 'warning'; msg: string }> = [
			{ type: 'success', msg: 'success-msg' },
			{ type: 'error', msg: 'error-msg' },
			{ type: 'info', msg: 'info-msg' },
			{ type: 'warning', msg: 'warn-msg' },
		];
		for (const c of cases) {
			const { unmount } = await render(<CustomToast type={c.type} show={true} setShow={setShowMock} message={c.msg} />);
			expect(screen.getByRole('alert')).toHaveTextContent(c.msg);
			expect(screen.getByTestId('toast-icon')).toBeOnTheScreen();
			await unmount();
		}
	});
});
