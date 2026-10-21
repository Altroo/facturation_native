import { createContext, useState, type FC, type ReactNode } from 'react';
import { View } from 'react-native';
import CustomToast, { type CustomToastProps } from '@/components/portals/customToast/customToast';

export type ToastContextType = {
	onSuccess: (msg: string, action?: CustomToastProps['action']) => void;
	onError: (msg: string) => void;
};

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [show, setShow] = useState<boolean>(false);
	const [type, setType] = useState<CustomToastProps['type']>('success');
	const [message, setMessage] = useState<string>('');
	const [action, setAction] = useState<CustomToastProps['action']>();

	const showToast = (msg: string, type: CustomToastProps['type'], action?: CustomToastProps['action']) => {
		setType(type);
		setMessage(msg);
		setAction(action);
		setShow(true);
	};
	const onSuccess: ToastContextType['onSuccess'] = (msg, action) => showToast(msg, 'success', action);
	const onError = (msg: string) => showToast(msg, 'error');

	return (
		<ToastContext.Provider value={{ onSuccess, onError }}>
			<View className="flex-1">
				{children}
				<CustomToast type={type} message={message} setShow={setShow} show={show} action={action} />
			</View>
		</ToastContext.Provider>
	);
};
