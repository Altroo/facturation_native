import { act, render } from '@testing-library/react-native';
import SessionExpiredListener from './sessionExpiredListener';
import { ToastContext, type ToastContextType } from '@/contexts/toastContext';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import { auth } from '@/auth';

jest.mock('@/auth', () => {
	const { create } = jest.requireActual<typeof import('axios')>('axios');
	const { createAuth } = jest.requireActual<typeof import('@/auth')>('@/auth');
	return {
		...jest.requireActual<typeof import('@/auth')>('@/auth'),
		auth: createAuth(create(), { read: async () => null, write: async () => {} }),
	};
});
it('uses the current language for expiry, ignores ordinary logout, and unsubscribes on unmount', async () => {
	const toast = { onSuccess: jest.fn(), onError: jest.fn() };
	const content = (language: 'fr' | 'en') => (
		<LanguageContext.Provider value={{ language, t: translations[language], setLanguage: jest.fn() }}>
			<ToastContext.Provider value={toast}>
				<SessionExpiredListener />
			</ToastContext.Provider>
		</LanguageContext.Provider>
	);
	const view = await render(content('fr'));
	await view.rerender(content('en'));
	await act(async () => {
		await auth.signOut(true);
	});
	expect(toast.onError).not.toHaveBeenCalled();
	await act(async () => {
		await auth.expire();
	});
	expect(toast.onError).toHaveBeenCalledTimes(1);
	expect(toast.onError).toHaveBeenCalledWith(translations.en.shared.sessionExpired);
	await view.unmount();
	await auth.expire();
	expect(toast.onError).toHaveBeenCalledTimes(1);
});

const renderWithToast = async (toast: ToastContextType) =>
	await render(
		<ToastContext.Provider value={toast}>
			<SessionExpiredListener />
		</ToastContext.Provider>,
	);

describe('SessionExpiredListener', () => {
	it('keeps one listener and uses the latest toast and language', async () => {
		const subscribeExpired = auth.subscribeExpired;
		const removeListener = jest.fn();
		const addListener = jest.spyOn(auth, 'subscribeExpired').mockImplementation((listener) => {
			const unsubscribe = subscribeExpired(listener);
			return () => {
				removeListener();
				unsubscribe();
			};
		});
		const firstToast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		const nextToast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		const withProviders = (toast: ToastContextType, language: 'fr' | 'en') => (
			<LanguageContext.Provider value={{ language, setLanguage: jest.fn(), t: translations[language] }}>
				<ToastContext.Provider value={toast}>
					<SessionExpiredListener />
				</ToastContext.Provider>
			</LanguageContext.Provider>
		);
		try {
			const { rerender, unmount } = await render(withProviders(firstToast, 'fr'));
			await rerender(withProviders(nextToast, 'en'));
			await act(async () => {
				await auth.expire();
			});
			expect(firstToast.onError).not.toHaveBeenCalled();
			expect(nextToast.onError).toHaveBeenCalledWith(translations.en.shared.sessionExpired);
			expect(addListener).toHaveBeenCalledTimes(1);
			await unmount();
			expect(removeListener).toHaveBeenCalledTimes(1);
		} finally {
			addListener.mockRestore();
		}
	});
	it('renders nothing (null)', async () => {
		const toast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		const { toJSON } = await renderWithToast(toast);
		expect(toJSON()).toBeNull();
	});

	it('calls toast.onError when a session-expired event is dispatched', async () => {
		const toast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		await renderWithToast(toast);

		await act(async () => {
			await auth.expire();
		});

		expect(toast.onError).toHaveBeenCalledTimes(1);
		expect(toast.onError).toHaveBeenCalledWith('Votre session a expiré, veuillez vous reconnecter.');
	});

	it('does not call toast.onSuccess on session-expired', async () => {
		const toast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		await renderWithToast(toast);

		await act(async () => {
			await auth.expire();
		});

		expect(toast.onSuccess).not.toHaveBeenCalled();
	});

	it('removes the event listener on unmount', async () => {
		const toast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		const { unmount } = await renderWithToast(toast);

		await unmount();

		await act(async () => {
			await auth.expire();
		});

		expect(toast.onError).not.toHaveBeenCalled();
	});

	it('handles multiple session-expired events', async () => {
		const toast: ToastContextType = { onSuccess: jest.fn(), onError: jest.fn() };
		await renderWithToast(toast);

		await act(async () => {
			await auth.expire();
			await auth.expire();
			await auth.expire();
		});

		expect(toast.onError).toHaveBeenCalledTimes(3);
	});

	it('does not crash when toast context is undefined', async () => {
		await render(
			<ToastContext.Provider value={undefined as unknown as ToastContextType}>
				<SessionExpiredListener />
			</ToastContext.Provider>,
		);
		await act(async () => {
			await expect(auth.expire()).resolves.toMatchObject({ success: true });
		});
	});
});
