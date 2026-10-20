import { useContext } from 'react';
import { Alert } from 'react-native';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store';
import { getProfilState } from '@/store/selectors';
import { ToastContext, type ToastContextType } from '@/contexts/toastContext';
import type { LanguageContextType } from '@/types/languageTypes';
import { LanguageContext } from '@/contexts/languageContext';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const usePermission = () => {
	const { is_staff } = useAppSelector(getProfilState);
	return { is_staff };
};

export const useToast = (): ToastContextType => {
	const ctx = useContext(ToastContext);
	return ctx ?? { onSuccess: (message) => Alert.alert(message), onError: (message) => Alert.alert(message) };
};

export const useLanguage = (): LanguageContextType => {
	return useContext(LanguageContext);
};
