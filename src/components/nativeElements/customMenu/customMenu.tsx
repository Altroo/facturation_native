import { type ComponentRef, type ReactNode, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorMode } from '@/providers/themeProvider';
import { cardShadows, colors, surfaceStyles } from '@/utils/themes';

type Props = {
	label: string;
	icon?: ReactNode;
	disabled?: boolean;
	actions: Array<{
		label: string;
		onClick: () => void;
		icon?: ReactNode;
		color?: string;
		destructive?: boolean;
		disabled?: boolean;
	}>;
};

const CustomMenu = (props: Props) => {
	const trigger = useRef<ComponentRef<typeof View>>(null);
	const pendingAction = useRef<(() => void) | null>(null);
	const opening = useRef(false);
	const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
	const [menuHeight, setMenuHeight] = useState(0);
	const { width, height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const { mode } = useColorMode();
	const margin = 12;
	const menuWidth = Math.min(240, width - insets.left - insets.right - margin * 2);
	const maxHeight = height - insets.top - insets.bottom - margin * 2;
	const measuredHeight = Math.min(menuHeight || props.actions.length * 52 + 16, maxHeight);
	const below = (anchor?.y ?? 0) + (anchor?.height ?? 0) + 4;
	const top = Math.max(
		insets.top + margin,
		below + measuredHeight <= height - insets.bottom - margin ? below : (anchor?.y ?? 0) - measuredHeight - 4,
	);
	const left = Math.max(
		insets.left + margin,
		Math.min((anchor?.x ?? 0) + (anchor?.width ?? 0) - menuWidth, width - insets.right - margin - menuWidth),
	);
	const close = () => {
		opening.current = false;
		setAnchor(null);
	};
	const open = () => {
		if (props.disabled || opening.current || !props.actions.length) return;
		opening.current = true;
		// Window coordinates keep the popup beside its card in a scrolling list.
		// Near the screen's bottom, it opens above the trigger instead.
		trigger.current?.measureInWindow((x, y, width, height) => {
			if (opening.current) setAnchor({ x, y, width, height });
		});
	};
	const onDismiss = () => {
		opening.current = false;
		setAnchor(null);
		const action = pendingAction.current;
		pendingAction.current = null;
		action?.();
	};
	const select = (action: Props['actions'][number]) => {
		if (!anchor || !opening.current || props.disabled || action.disabled || pendingAction.current) return;
		close();
		// iOS must dismiss this overlay before a page presents its confirmation.
		if (Platform.OS === 'ios') pendingAction.current = action.onClick;
		else action.onClick();
	};
	if (!props.actions.length) return null;
	return (
		<>
			<View ref={trigger} collapsable={false}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={props.label}
					accessibilityState={{ disabled: !!props.disabled, expanded: !!anchor }}
					disabled={props.disabled}
					onPress={open}
					className={
						'h-11 w-11 items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-700 ' +
						(props.disabled ? 'opacity-50' : '')
					}
				>
					{props.icon ?? (
						<MaterialIcons name="more-vert" size={25} color={mode === 'dark' ? colors.slate[300] : colors.slate[600]} />
					)}
				</Pressable>
			</View>
			<Modal
				testID="custom-menu"
				visible={!!anchor && !props.disabled}
				transparent
				animationType="none"
				statusBarTranslucent
				navigationBarTranslucent
				onRequestClose={close}
				onDismiss={onDismiss}
			>
				<View className="flex-1">
					<Pressable testID="custom-menu-backdrop" accessible={false} onPress={close} className="absolute inset-0" />
					<View
						testID="custom-menu-panel"
						accessibilityRole="menu"
						accessibilityLabel={props.label}
						accessibilityViewIsModal
						onAccessibilityEscape={close}
						onLayout={({ nativeEvent }) => setMenuHeight(nativeEvent.layout.height)}
						className="absolute overflow-hidden py-2"
						style={[surfaceStyles[mode], cardShadows[mode], { top, left, width: menuWidth, maxHeight }]}
					>
						<ScrollView keyboardShouldPersistTaps="handled" bounces={false} style={{ flexShrink: 1 }}>
							{props.actions.map((action, index) => (
								<Pressable
									key={action.label}
									accessibilityRole="menuitem"
									accessibilityLabel={action.label}
									accessibilityState={{ disabled: !!props.disabled || !!action.disabled }}
									disabled={props.disabled || action.disabled}
									onPress={() => select(action)}
									className={
										'min-h-13 flex-row items-center gap-3 px-4 py-3 active:bg-slate-100 dark:active:bg-slate-700 ' +
										(action.destructive && index > 0 ? 'mt-1 border-t border-slate-200 dark:border-slate-600 ' : '') +
										(action.disabled ? 'opacity-50' : '')
									}
								>
									{action.icon}
									<Text
										className="min-w-0 flex-1 font-poppins-medium text-sm text-ink dark:text-slate-100"
										style={action.color ? { color: action.color } : undefined}
									>
										{action.label}
									</Text>
								</Pressable>
							))}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</>
	);
};

export default CustomMenu;
