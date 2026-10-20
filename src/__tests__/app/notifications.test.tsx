import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import NotificationPreferences from '@/app/(app)/settings/notifications';
import { notificationApi } from '@/store/services/notification';
import { auth } from '@/auth';
import { translations } from '@/translations';
import { useToast } from '@/utils/hooks';
import type { NotificationPreferenceType } from '@/types/notificationTypes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	return { ...jest.requireActual<typeof import('@/auth')>('@/auth'), auth: { instance: create() } };
});
jest.mock('@/utils/hooks', () => {
	const language = () => ({
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
		theme: 'light',
	});
	return {
		...jest.requireActual<typeof import('@/utils/hooks')>('@/utils/hooks'),
		useLanguage: language,
		useToast: jest.fn(),
	};
});
const onError = jest.fn();
const onSuccess = jest.fn();
const adapter = jest.fn<Promise<AxiosResponse>, [InternalAxiosRequestConfig]>();
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
	config,
	data,
	status,
	statusText: 'OK',
	headers: {},
});
const createStore = () =>
	configureStore({
		reducer: { [notificationApi.reducerPath]: notificationApi.reducer },
		middleware: (get) => get().concat(notificationApi.middleware),
	});
let store: ReturnType<typeof createStore>;
let preferences: NotificationPreferenceType;
let failSave = false;
beforeEach(() => {
	jest.useFakeTimers();
	jest.clearAllMocks();
	failSave = false;
	store = createStore();
	preferences = {
		id: 1,
		notify_overdue_invoice: true,
		notify_expiring_quote: true,
		notify_uninvoiced_bdl: true,
		notify_document_created: true,
		notify_low_stock: true,
		low_stock_repeat_hours: 24,
		quote_expiry_days: 7,
		date_created: '2026-10-14T12:00:00Z',
		date_updated: '2026-10-14T12:00:00Z',
	};
	jest.mocked(useToast).mockReturnValue({ onError, onSuccess } as never);
	auth.instance.defaults.adapter = adapter;
	adapter.mockImplementation(async (config) => {
		if (config.method === 'put') {
			if (failSave)
				throw new AxiosError(
					'Invalid',
					'ERR_BAD_REQUEST',
					config,
					undefined,
					response(
						config,
						{
							status_code: 400,
							message: 'Invalid request',
							details: { low_stock_repeat_hours: ['Server validation failed.'] },
						},
						400,
					),
				);
			preferences = { ...preferences, ...JSON.parse(config.data) };
		}
		return response(config, { ...preferences });
	});
});
afterEach(async () => {
	await cleanup();
	store.dispatch(notificationApi.util.resetApiState());
	await act(async () => {
		await jest.runOnlyPendingTimersAsync();
	});
	jest.useRealTimers();
});

const open = async () => {
	await render(
		<Provider store={store}>
			<NotificationPreferences />
		</Provider>,
	);
	await screen.findByText(translations.fr.settings.notificationPreferences);
};
it('blocks saving defaults after a failed initial load and restores server preferences on retry', async () => {
	preferences.notify_low_stock = false;
	preferences.low_stock_repeat_hours = 72;
	adapter.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
	await render(
		<Provider store={store}>
			<NotificationPreferences />
		</Provider>,
	);
	await screen.findByRole('alert');
	expect(screen.queryByRole('switch')).toBeNull();
	expect(screen.queryByRole('button', { name: translations.fr.settings.save })).toBeNull();
	expect(adapter.mock.calls.some(([config]) => config.method === 'put')).toBe(false);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.retry }));
	await screen.findByText('72 h');
	expect(screen.getByRole('switch', { name: translations.fr.settings.notifyLowStock })).toHaveProp('value', false);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await waitFor(() => expect(onSuccess).toHaveBeenCalled());
	const request = adapter.mock.calls.find(([config]) => config.method === 'put')![0];
	expect(JSON.parse(request.data)).toMatchObject({ notify_low_stock: false, low_stock_repeat_hours: 72 });
});
it('uses the original repeat-hour choices and disables them when stock alerts are off', async () => {
	await open();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.lowStockRepeatHours }));
	for (const hours of [6, 12, 24, 48, 72]) expect(screen.getByRole('radio', { name: hours + ' h' })).toBeOnTheScreen();
	await fireEvent.press(screen.getByRole('radio', { name: '48 h' }));
	await waitFor(() => expect(screen.getByText('48 h')).toBeOnTheScreen());
	await fireEvent(screen.getByRole('switch', { name: translations.fr.settings.notifyLowStock }), 'valueChange', false);
	await waitFor(() =>
		expect(screen.getByRole('button', { name: translations.fr.settings.lowStockRepeatHours })).toBeDisabled(),
	);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(translations.fr.settings.notificationUpdateSuccess));
	const request = adapter.mock.calls.find(([config]) => config.method === 'put')![0];
	expect(JSON.parse(request.data)).toEqual({
		notify_overdue_invoice: true,
		notify_expiring_quote: true,
		notify_uninvoiced_bdl: true,
		notify_document_created: true,
		notify_low_stock: false,
		low_stock_repeat_hours: 48,
		quote_expiry_days: 7,
	});
});
it('shows backend field errors and retains the unsaved selection for retry', async () => {
	await open();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.lowStockRepeatHours }));
	await fireEvent.press(screen.getByRole('radio', { name: '72 h' }));
	await waitFor(() => expect(screen.getByText('72 h')).toBeOnTheScreen());
	failSave = true;
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await screen.findByText('Server validation failed.');
	expect(onError).toHaveBeenCalledWith(translations.fr.settings.notificationUpdateError);
	expect(onSuccess).not.toHaveBeenCalled();
	expect(screen.getByText('72 h')).toBeOnTheScreen();
	failSave = false;
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await waitFor(() => expect(onSuccess).toHaveBeenCalled());
});

it('maps the displayed quote-expiry choice back to its numeric API value', async () => {
	await open();
	const option = translations.fr.settings.quoteExpiryOptions.find(
		(item) => item.value !== preferences.quote_expiry_days,
	)!;
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.quoteExpiryDays }));
	await fireEvent.press(screen.getByRole('radio', { name: option.label }));
	await waitFor(() => expect(screen.getByText(option.label)).toBeOnTheScreen());
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await waitFor(() => expect(onSuccess).toHaveBeenCalled());
	const request = adapter.mock.calls.find(([config]) => config.method === 'put')![0];
	expect(JSON.parse(request.data).quote_expiry_days).toBe(option.value);
});

it('preserves unsaved preferences when a background refresh fails', async () => {
	await open();
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.lowStockRepeatHours }));
	await fireEvent.press(screen.getByRole('radio', { name: '72 h' }));
	await fireEvent(screen.getByRole('switch', { name: translations.fr.settings.notifyLowStock }), 'valueChange', false);
	await waitFor(() => expect(screen.getByText('72 h')).toBeOnTheScreen());
	adapter.mockRejectedValueOnce(new AxiosError('Offline', 'ERR_NETWORK'));
	await act(async () => {
		const request = store.dispatch(
			notificationApi.endpoints.getNotificationPreferences.initiate(undefined, { forceRefetch: true }),
		);
		await request;
		request.unsubscribe();
	});
	expect(notificationApi.endpoints.getNotificationPreferences.select()(store.getState()).isError).toBe(true);
	expect(screen.getByText('72 h')).toBeOnTheScreen();
	expect(screen.getByRole('switch', { name: translations.fr.settings.notifyLowStock })).toHaveProp('value', false);
	await fireEvent.press(screen.getByRole('button', { name: translations.fr.settings.save }));
	await waitFor(() => expect(onSuccess).toHaveBeenCalled());
	const request = adapter.mock.calls.find(([config]) => config.method === 'put')![0];
	expect(JSON.parse(request.data)).toMatchObject({ low_stock_repeat_hours: 72, notify_low_stock: false });
});
