import { isValidElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '@/utils/hooks';

type Props = {
	icon?: ReactNode;
	label: string;
	value: ReactNode;
	valueTone?: 'danger' | 'success' | 'warning';
	dense?: boolean;
	inline?: boolean;
};

const InfoRow = (props: Props) => {
	const { icon, label, value } = props;
	const { t } = useLanguage();
	const empty = value === null || value === undefined || value === '';
	const valueColor =
		props.valueTone === 'danger'
			? 'text-red-600 dark:text-red-300'
			: props.valueTone === 'success'
				? 'text-emerald-600 dark:text-emerald-300'
				: props.valueTone === 'warning'
					? 'text-orange-600 dark:text-orange-300'
					: 'text-ink dark:text-slate-100';
	return (
		<View className={'flex-row items-start gap-3 ' + (props.dense ? '' : 'py-2')}>
			{icon}
			<View className={props.inline ? 'min-w-0 flex-1 flex-row items-start justify-between gap-3' : 'flex-1 gap-1'}>
				{!!label && (
					<Text
						className={
							'font-sans text-xs text-slate-500 dark:text-slate-400 ' + (props.inline ? 'min-w-0 flex-1 pt-0.5' : '')
						}
					>
						{label}
					</Text>
				)}
				{isValidElement(value) ? (
					value
				) : (
					<Text
						selectable
						className={
							'text-sm leading-6 ' +
							(props.inline ? 'shrink text-right ' : '') +
							(empty ? 'font-sans text-slate-400' : `font-poppins-semibold ${valueColor}`)
						}
					>
						{empty ? t.common.noData : value}
					</Text>
				)}
			</View>
		</View>
	);
};

export default InfoRow;
