import { cloneElement, isValidElement, type FC, type ReactNode } from 'react';
import { ActivityIndicator, type ColorValue, type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { colors } from '@/utils/themes';
import { useColorMode } from '@/providers/themeProvider';

type Props = {
	buttonText: string;
	loading: boolean;
	onClick?: (event: GestureResponderEvent) => void;
	active?: boolean;
	startIcon?: ReactNode;
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
	// Custom action colors also apply to page-provided icons and loaders.
	const startIcon =
		(darkDanger || props.color) &&
		isValidElement<{ color?: ColorValue }>(props.startIcon) &&
		'color' in props.startIcon.props
			? cloneElement(props.startIcon, { color: foreground })
			: props.startIcon;
	return (
		<Pressable
			testID={props.testID}
			accessibilityRole="button"
			accessibilityLabel={props.buttonText}
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
				'min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 ' +
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
				<Text
					style={darkDanger || props.color ? { color: foreground } : undefined}
					className={
						'shrink text-center font-poppins-medium text-sm ' +
						(props.inverted ? (props.danger ? 'text-red-600' : 'text-brand dark:text-blue-300') : 'text-white')
					}
				>
					{props.buttonText}
				</Text>
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
