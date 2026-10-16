import { createContext, useState, type FC, type ReactNode } from 'react';
import { View } from 'react-native';
import CustomToast from '@/components/portals/customToast/customToast';
import type { CustomToastProps, ToastContextType } from '@/types/uiTypes';

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [show, setShow] = useState<boolean>(false);
	const [type, setType] = useState<CustomToastProps['type']>('success');
	const [message, setMessage] = useState<string>('');

	const onSuccess = (msg: string) => {
		setType('success');
		setMessage(msg);
		setShow(true);
	};

	const onError = (msg: string) => {
		setType('error');
		setMessage(msg);
		setShow(true);
	};

	return (
		<ToastContext.Provider value={{ onSuccess, onError }}>
			<View className="flex-1">
				{children}
				<CustomToast type={type} message={message} setShow={setShow} show={show} />
			</View>
		</ToastContext.Provider>
	);
};
