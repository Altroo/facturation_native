import { isValidElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useLanguage } from '@/utils/hooks';

type Props = {
	icon: ReactNode;
	label: string;
	value: ReactNode;
};

const InfoRow = (props: Props) => {
	const { icon, label, value } = props;
	const { t } = useLanguage();
	const empty = value === null || value === undefined || value === '';
	return (
		<View className="flex-row items-start gap-3 py-2">
			{icon}
			<View className="flex-1 gap-1">
				<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">{label}</Text>
				{isValidElement(value) ? (
					value
				) : (
					<Text
						selectable
						className={
							'text-sm leading-6 ' +
							(empty ? 'font-sans text-slate-400' : 'font-poppins-medium text-ink dark:text-slate-100')
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
