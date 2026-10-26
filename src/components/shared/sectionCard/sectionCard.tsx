import { cloneElement, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorMode } from '@/providers/themeProvider';
import { cardShadows, colors, surfaceStyles } from '@/utils/themes';

type Props = {
	title?: string;
	icon?: ComponentProps<typeof MaterialIcons>['name'];
	startIcon?: ReactNode;
	count?: number;
	headerActions?: ReactNode;
	variant?: 'card' | 'list';
	children: ReactNode;
};

// Forms and detail pages share this surface, compact heading and divider.
// The children can be editable inputs or read-only rows.
const SectionCard = (props: Props) => {
	const { mode } = useColorMode();
	const list = props.variant === 'list';
	const startIcon =
		isValidElement<{ size?: number; color?: string }>(props.startIcon) && 'size' in props.startIcon.props
			? cloneElement(props.startIcon, { size: 22, color: colors.brand })
			: props.startIcon;
	return (
		<View className={list ? 'gap-3' : 'gap-3 p-4'} style={list ? undefined : [surfaceStyles[mode], cardShadows[mode]]}>
			{/* Identity cards can omit the heading and keep the same card surface. */}
			{!!props.title && (
				<View className="flex-row items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
					{props.icon ? <MaterialIcons name={props.icon} size={22} color={colors.brand} /> : startIcon}
					<Text
						accessibilityRole="header"
						className="flex-1 font-poppins-semibold text-base text-ink dark:text-slate-100"
					>
						{props.title}
					</Text>
					{props.count !== undefined && (
						<Text className="rounded-full bg-slate-100 px-3 py-1 font-poppins-medium text-xs text-ink dark:bg-slate-800 dark:text-slate-100">
							{props.count}
						</Text>
					)}
					{props.headerActions}
				</View>
			)}
			{props.children}
		</View>
	);
};

export default SectionCard;
