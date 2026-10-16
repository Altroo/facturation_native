import { type FC } from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '@/utils/hooks';
import { globalErrorKeys } from '@/utils/rawData';
import type { ApiAlertProps as Props } from '@/types/uiTypes';

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

const ApiAlert: FC<Props> = (props: Props) => {
	const { t } = useLanguage();
	const errorMessages = getErrorMessages(props.errorDetails);
	return (
		<View accessible accessibilityRole="alert" style={props.cssStyle}>
			<Text className="font-sans text-sm leading-6 text-red-700 dark:text-red-300">
				{errorMessages.length ? errorMessages.join('\n') : t.common.genericError}
			</Text>
		</View>
	);
};

export default ApiAlert;
