import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
	label: string;
	icon?: ReactNode;
	tone?: 'info' | 'success' | 'danger' | 'warning' | 'neutral';
	variant?: 'filled' | 'outlined';
};

const CustomBadge = (props: Props) => {
	const tones = {
		info: ['bg-blue-50 dark:bg-slate-800', 'text-brand dark:text-blue-300', 'border-brand dark:border-blue-300'],
		success: [
			'bg-emerald-50 dark:bg-emerald-950',
			'text-emerald-700 dark:text-emerald-300',
			'border-emerald-600 dark:border-emerald-300',
		],
		danger: ['bg-red-50 dark:bg-red-950', 'text-red-700 dark:text-red-300', 'border-red-600 dark:border-red-300'],
		warning: [
			'bg-orange-50 dark:bg-orange-950',
			'text-orange-700 dark:text-orange-300',
			'border-orange-600 dark:border-orange-300',
		],
		neutral: [
			'bg-slate-100 dark:bg-slate-800',
			'text-slate-600 dark:text-slate-300',
			'border-slate-300 dark:border-slate-600',
		],
	};
	const [background, foreground, border] = tones[props.tone ?? 'info'];
	return (
		<View
			className={`flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ${props.variant === 'outlined' ? `border ${border}` : background}`}
		>
			{props.icon}
			<Text className={`shrink font-poppins-medium text-xs ${foreground}`}>{props.label}</Text>
		</View>
	);
};

export default CustomBadge;
