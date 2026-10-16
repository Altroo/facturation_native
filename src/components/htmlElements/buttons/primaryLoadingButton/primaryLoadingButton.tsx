import type { FC } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import type { PrimaryLoadingButtonProps as Props } from '@/types/uiTypes';

const PrimaryLoadingButton: FC<Props> = (props: Props) => {
	const foreground = props.inverted ? (props.danger ? '#dc2626' : '#0274d7') : '#fff';
	return (
		<Pressable
			testID={props.testID}
			accessibilityRole="button"
			accessibilityLabel={props.buttonText}
			accessibilityState={{ disabled: !props.active || props.loading, busy: props.loading }}
			disabled={!props.active || props.loading}
			onPress={props.onClick}
			className={
				'min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 ' +
				(props.inverted
					? props.danger
						? 'border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 '
						: 'border border-slate-200 bg-white dark:border-slate-600 dark:bg-panel '
					: props.danger
						? 'bg-red-600 '
						: 'bg-brand ') +
				(!props.active || props.loading ? 'opacity-50 ' : 'active:opacity-75 ') +
				(props.cssClass ?? '')
			}
		>
			{props.loading ? <ActivityIndicator size="small" color={foreground} /> : props.startIcon}
			<Text
				className={
					'shrink text-center font-poppins-medium text-sm ' +
					(props.inverted
						? props.danger
							? 'text-red-600 dark:text-red-300'
							: 'text-brand dark:text-blue-300'
						: 'text-white')
				}
			>
				{props.buttonText}
			</Text>
		</Pressable>
	);
};

export default PrimaryLoadingButton;
