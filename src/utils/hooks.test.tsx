import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import type { PropsWithChildren } from 'react';
import { useAppDispatch, useAppSelector, useLanguage, usePermission, useToast } from './hooks';
import { LanguageContext } from '@/contexts/languageContext';
import { ToastContext } from '@/contexts/toastContext';
import { configureStore } from '@reduxjs/toolkit';
import initReducer, { initToken } from '@/store/slices/_initSlice';
import accountReducer, { setProfil } from '@/store/slices/accountSlice';
import companiesReducer from '@/store/slices/companiesSlice';
import { translations } from '@/translations';
import type { UserClass } from '@/models/classes';
import { Alert } from 'react-native';

describe('Hooks', () => {
	it('shows a native message instead of crashing if the toast provider is missing', async () => {
		const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
		try {
			const { result } = await renderHook(() => useToast());
			result.current.onError('Unable to save');
			expect(alert).toHaveBeenCalledWith('Unable to save');
		} finally {
			alert.mockRestore();
		}
	});

	it('reads permission changes from Redux and clears staff access after logout', async () => {
		const store = configureStore({
			reducer: { _init: initReducer, account: accountReducer, companies: companiesReducer },
		});
		const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
		const { result } = await renderHook(() => ({ permission: usePermission(), dispatch: useAppDispatch() }), {
			wrapper,
		});
		expect(result.current.permission.is_staff).toBeUndefined();
		expect(result.current.dispatch).toBe(store.dispatch);
		const profile: UserClass = {
			id: 1,
			email: 'test@example.invalid',
			first_name: 'Test',
			last_name: 'User',
			gender: 'Homme',
			avatar: null,
			avatar_cropped: null,
			is_staff: true,
			is_active: true,
			default_password_set: false,
			date_joined: '2026-01-01',
			date_updated: null,
			last_login: null,
		};
		await act(() => store.dispatch(setProfil(profile)));
		expect(result.current.permission.is_staff).toBe(true);
		await act(() => store.dispatch(initToken()));
		expect(result.current.permission.is_staff).toBeUndefined();
	});

	it('exposes the original language context and toast callbacks', async () => {
		const language = { language: 'en' as const, t: translations.en, setLanguage: jest.fn() };
		const toast = { onSuccess: jest.fn(), onError: jest.fn() };
		const wrapper = ({ children }: PropsWithChildren) => (
			<LanguageContext.Provider value={language}>
				<ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
			</LanguageContext.Provider>
		);
		const { result } = await renderHook(() => ({ language: useLanguage(), toast: useToast() }), { wrapper });
		expect(result.current.language).toBe(language);
		result.current.language.setLanguage('fr');
		expect(language.setLanguage).toHaveBeenCalledWith('fr');
		result.current.toast.onError('Failure');
		expect(toast.onError).toHaveBeenCalledWith('Failure');
	});

	describe('useAppDispatch / useAppSelector', () => {
		const store = configureStore({
			reducer: { _init: initReducer, account: accountReducer, companies: companiesReducer },
		});
		const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;

		it('useAppDispatch returns react-redux dispatch', async () => {
			const { result } = await renderHook(() => useAppDispatch(), { wrapper });
			expect(result.current).toBe(store.dispatch);
		});

		it('useAppSelector proxies to react-redux useSelector', async () => {
			const { result } = await renderHook(() => useAppSelector((state) => state.account.profil), { wrapper });
			expect(result.current).toEqual(store.getState().account.profil);
		});
	});
});
