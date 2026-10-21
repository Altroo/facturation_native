import { useContext, useEffect, useRef, type FC, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LanguageContext } from '@/contexts/languageContext';
import { colors } from '@/utils/themes';

export type CustomToastProps = {
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	show: boolean;
	setShow: Dispatch<SetStateAction<boolean>>;
	children?: ReactNode;
	action?: { label: string; onPress: () => void };
};

const CustomToast: FC<CustomToastProps> = (props: CustomToastProps) => {
	const { type, show, message, setShow, action } = props;
	const { t } = useContext(LanguageContext);
	const actionHandled = useRef(false);
	const handleClose = () => {
		props.setShow(false);
	};

	useEffect(() => {
		actionHandled.current = false;
		if (!show) return;
		// Leave more time to reach an undo action than a passive notification.
		const timer = setTimeout(() => setShow(false), action ? 10000 : 6000);
		return () => clearTimeout(timer);
	}, [show, message, type, setShow, action]);
	const handleAction = () => {
		if (!action || actionHandled.current) return;
		actionHandled.current = true;
		setShow(false);
		action.onPress();
	};

	if (!props.show) return null;

	const severity = {
		success: {
			icon: 'check-circle-outline',
			color: colors.success,
			container: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950',
			text: 'text-emerald-800 dark:text-emerald-200',
		},
		error: {
			icon: 'error-outline',
			color: colors.danger,
			container: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
			text: 'text-red-800 dark:text-red-200',
		},
		info: {
			icon: 'info-outline',
			color: colors.info,
			container: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950',
			text: 'text-sky-800 dark:text-sky-200',
		},
		warning: {
			icon: 'warning-amber',
			color: colors.warning,
			container: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
			text: 'text-amber-800 dark:text-amber-200',
		},
	} as const;
	const appearance = severity[type];
	return (
		<View
			pointerEvents="box-none"
			className="absolute bottom-12 left-5 right-5 items-center"
			style={{ zIndex: 1000, elevation: 20 }}
		>
			<View
				className={
					'w-full max-w-lg flex-row items-center gap-3 rounded-2xl border p-4 shadow-lg ' + appearance.container
				}
			>
				<MaterialIcons
					testID="toast-icon"
					name={appearance.icon}
					size={26}
					color={appearance.color}
					accessible={false}
				/>
				<Text
					accessibilityRole="alert"
					accessibilityLiveRegion="polite"
					className={'flex-1 font-poppins-medium text-sm leading-6 ' + appearance.text}
				>
					{props.message}
				</Text>
				{!!action && (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={action.label}
						onPress={handleAction}
						className="min-h-11 shrink-0 items-center justify-center px-2 active:opacity-60"
					>
						<Text className={'font-poppins-semibold text-sm ' + appearance.text}>{action.label}</Text>
					</Pressable>
				)}
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t.common.close}
					onPress={handleClose}
					className="h-10 w-10 items-center justify-center"
				>
					<MaterialIcons name="close" size={20} color={appearance.color} accessible={false} />
				</Pressable>
			</View>
		</View>
	);
};

export default CustomToast;
