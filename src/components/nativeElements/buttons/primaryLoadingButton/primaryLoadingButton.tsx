import { cloneElement, isValidElement, type FC, type ReactNode } from 'react';
import { ActivityIndicator, type ColorValue, type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { colors } from '@/utils/themes';
import { useColorMode } from '@/providers/themeProvider';

type Props = {
	buttonText: string;
	accessibilityLabel?: string;
	loading: boolean;
	onClick?: (event: GestureResponderEvent) => void;
	active?: boolean;
	startIcon?: ReactNode;
	iconOnly?: boolean;
	cssClass?: string;
	inverted?: boolean;
	danger?: boolean;
	color?: string;
	testID?: string;
};

const PrimaryLoadingButton: FC<Props> = (props: Props) => {
	const { mode } = useColorMode();
	const darkDanger = props.danger && mode === 'dark';
	const foreground = darkDanger
		? colors.dangerDarkForeground
		: props.inverted
			? (props.color ?? (props.danger ? colors.danger : colors.brand))
			: mode === 'dark' && props.color === colors.slate[200]
				? colors.ink
				: colors.white;
	// Text, icons and loaders share one foreground, including ordinary blue
	// primary buttons. Callers cannot accidentally leave their add icon gray.
	const startIcon =
		isValidElement<{ color?: ColorValue }>(props.startIcon) && 'color' in props.startIcon.props
			? cloneElement(props.startIcon, { color: foreground })
			: props.startIcon;
	return (
		<Pressable
			testID={props.testID}
			accessibilityRole="button"
			accessibilityLabel={props.accessibilityLabel ?? props.buttonText}
			accessibilityState={{ disabled: !props.active || props.loading, busy: props.loading }}
			disabled={!props.active || props.loading}
			onPress={props.onClick}
			style={
				darkDanger
					? {
							backgroundColor: colors.dangerDarkBackground,
							borderColor: colors.dangerDarkBorder,
							borderWidth: 1,
						}
					: props.color
						? {
								backgroundColor: props.inverted ? (mode === 'dark' ? colors.slate[800] : colors.white) : props.color,
								borderColor: props.color,
								borderWidth: 1,
							}
						: undefined
			}
			className={
				'flex-row items-center justify-center gap-2 rounded-xl ' +
				(props.iconOnly ? 'h-12 w-12 shrink-0 p-0 ' : 'min-h-12 px-5 py-3 ') +
				(props.inverted
					? props.danger
						? 'border border-red-200 bg-red-50 '
						: 'border border-slate-200 bg-white dark:border-slate-600 dark:bg-panel '
					: props.danger
						? 'bg-red-600 '
						: 'bg-brand ') +
				(!props.active || props.loading ? 'opacity-50 ' : 'active:opacity-75 ') +
				(props.cssClass ?? '')
			}
		>
			<View className="shrink flex-row items-center justify-center gap-2" style={{ opacity: props.loading ? 0 : 1 }}>
				{startIcon}
				{!props.iconOnly && (
					<Text
						style={darkDanger || props.color ? { color: foreground } : undefined}
						className={
							'shrink text-center font-poppins-medium text-sm ' +
							(props.inverted ? (props.danger ? 'text-red-600' : 'text-brand dark:text-blue-300') : 'text-white')
						}
					>
						{props.buttonText}
					</Text>
				)}
			</View>
			{props.loading && (
				<ActivityIndicator
					accessibilityRole="progressbar"
					size="small"
					color={foreground}
					style={{ position: 'absolute' }}
				/>
			)}
		</Pressable>
	);
};

export default PrimaryLoadingButton;
