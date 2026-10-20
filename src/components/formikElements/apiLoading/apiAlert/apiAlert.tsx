import { type FC, type ReactNode } from 'react';
import { type StyleProp, Text, View, type ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { globalErrorKeys } from '@/utils/rawData';

const formatErrorKey = (key: string) =>
	key
		.replace(/_/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^./, (letter) => letter.toUpperCase());

const getErrorMessages = (errorDetails?: Record<string, string[] | string> | string | null): string[] => {
	if (typeof errorDetails === 'string') {
		const message = errorDetails.trim();
		return message ? [message] : [];
	}
	if (!errorDetails || typeof errorDetails !== 'object') return [];

	const messages: string[] = [];
	for (const [key, value] of Object.entries(errorDetails)) {
		const values = Array.isArray(value) ? value : [value];
		for (const item of values) {
			const message = String(item).trim();
			if (!message) continue;
			messages.push(globalErrorKeys.has(key) ? message : `${formatErrorKey(key)} : ${message}`);
		}
	}
	return messages;
};

export type ApiAlertProps = {
	variant?: 'inline' | 'banner';
	errorDetails?: Record<string, Array<string> | string> | string | null;
	cssStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
};

const ApiAlert: FC<ApiAlertProps> = (props: ApiAlertProps) => {
	const { t } = useLanguage();
	const errorMessages = getErrorMessages(props.errorDetails);
	return (
		<View
			accessible
			accessibilityRole="alert"
			style={props.cssStyle}
			className={
				props.variant === 'banner'
					? 'flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950'
					: undefined
			}
		>
			{props.variant === 'banner' && <MaterialIcons name="error-outline" size={22} color="#dc2626" />}
			<Text
				className={
					(props.variant === 'banner' ? 'flex-1 ' : '') + 'font-sans text-sm leading-6 text-red-700 dark:text-red-300'
				}
			>
				{errorMessages.length ? errorMessages.join('\n') : t.common.genericError}
			</Text>
		</View>
	);
};

export default ApiAlert;
