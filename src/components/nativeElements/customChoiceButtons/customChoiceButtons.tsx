import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props<T extends string> = {
	label: string;
	items: readonly { value: T; label: string; icon?: ReactNode }[];
	value?: T;
	onChange: (value: T) => void;
	columns?: 2 | 3;
	disabled?: boolean;
};

// Keep small sets of choices visible. A supplied value makes the buttons a
// controlled single selection; without one, each button runs an immediate action.
const CustomChoiceButtons = <T extends string>(props: Props<T>) => {
	const columns = props.columns ?? 2;
	const rows = Array.from({ length: Math.ceil(props.items.length / columns) }, (_, index) =>
		props.items.slice(index * columns, (index + 1) * columns),
	);
	return (
		<View
			accessibilityRole={props.value === undefined ? undefined : 'radiogroup'}
			accessibilityLabel={props.label}
			className="gap-2"
		>
			<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{props.label}</Text>
			{rows.map((row) => (
				<View key={row[0].value} className="flex-row gap-2">
					{row.map((item) => {
						const selected = props.value === item.value;
						return (
							<Pressable
								key={item.value}
								accessibilityRole={props.value === undefined ? 'button' : 'radio'}
								accessibilityLabel={item.label}
								accessibilityState={{
									...(props.value === undefined ? {} : { checked: selected }),
									disabled: !!props.disabled,
								}}
								disabled={props.disabled}
								onPress={() => props.onChange(item.value)}
								className={
									'min-h-16 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border p-3 ' +
									(selected
										? 'border-brand bg-blue-50 dark:border-blue-300 dark:bg-blue-950 '
										: 'border-slate-200 bg-white dark:border-slate-600 dark:bg-panel ') +
									(props.disabled ? 'opacity-50' : 'active:opacity-70')
								}
							>
								{item.icon}
								<Text
									className={
										'text-center text-sm ' +
										(selected
											? 'font-poppins-semibold text-brand dark:text-blue-300'
											: 'font-poppins-medium text-ink dark:text-slate-100')
									}
								>
									{item.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			))}
		</View>
	);
};

export default CustomChoiceButtons;
