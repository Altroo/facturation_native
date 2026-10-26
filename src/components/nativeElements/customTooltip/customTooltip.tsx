import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, listSpacing } from '@/utils/themes';

type Props = {
	title: string;
	label: string;
	children: ReactNode;
};

const CustomTooltip = (props: Props) => {
	const trigger = useRef<ComponentRef<typeof View>>(null);
	const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
	const [tooltipHeight, setTooltipHeight] = useState(0);
	const { width, height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const tooltipWidth = Math.min(300, width - insets.left - insets.right - listSpacing * 2);
	const maxHeight = height - insets.top - insets.bottom - listSpacing * 2;
	const measuredHeight = Math.min(tooltipHeight, maxHeight);
	const above = (anchor?.y ?? 0) - measuredHeight - 8 >= insets.top + listSpacing;
	const top = Math.max(
		insets.top + listSpacing,
		Math.min(
			above ? (anchor?.y ?? 0) - measuredHeight - 8 : (anchor?.y ?? 0) + (anchor?.height ?? 0) + 8,
			height - insets.bottom - listSpacing - measuredHeight,
		),
	);
	const left = Math.max(
		insets.left + listSpacing,
		Math.min((anchor?.x ?? 0) + (anchor?.width ?? 0) - tooltipWidth, width - insets.right - listSpacing - tooltipWidth),
	);
	const close = () => setAnchor(null);
	return (
		<>
			<View ref={trigger} collapsable={false}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={props.label}
					accessibilityState={{ expanded: !!anchor }}
					onPress={() => trigger.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }))}
					className="h-9 w-9 items-center justify-center"
				>
					{props.children}
				</Pressable>
			</View>
			<Modal
				testID="custom-tooltip"
				visible={!!anchor}
				transparent
				animationType="none"
				statusBarTranslucent
				navigationBarTranslucent
				onRequestClose={close}
			>
				<View className="flex-1">
					<Pressable testID="custom-tooltip-backdrop" accessible={false} onPress={close} className="absolute inset-0" />
					<View
						testID="custom-tooltip-panel"
						accessibilityViewIsModal
						onAccessibilityEscape={close}
						onLayout={({ nativeEvent }) => setTooltipHeight(nativeEvent.layout.height)}
						className="absolute rounded-lg bg-slate-800 shadow-lg"
						style={{ top, left, width: tooltipWidth, maxHeight, opacity: tooltipHeight ? 1 : 0 }}
					>
						<View
							pointerEvents="none"
							style={{
								position: 'absolute',
								left: Math.max(8, Math.min(tooltipWidth - 20, (anchor?.x ?? 0) + (anchor?.width ?? 0) / 2 - left - 6)),
								...(above ? { bottom: -6 } : { top: -6 }),
								width: 12,
								height: 12,
								backgroundColor: colors.slate[800],
								transform: [{ rotate: '45deg' }],
							}}
						/>
						<ScrollView
							bounces={false}
							style={{ flexShrink: 1 }}
							contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
						>
							<Text accessibilityLiveRegion="polite" className="font-sans text-xs leading-5 text-white">
								{props.title}
							</Text>
						</ScrollView>
					</View>
				</View>
			</Modal>
		</>
	);
};

export default CustomTooltip;
