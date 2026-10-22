import { type ComponentRef, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColorMode } from '@/providers/themeProvider';
import { colors, surfaceStyles } from '@/utils/themes';

const SCROLL_BUTTON_WIDTH = 44;

type Props = {
	items: Array<{ value: number; label: string; accessibilityLabel?: string }>;
	value: number;
	onChange: (value: number) => void;
	label: string;
	scrollLeftLabel: string;
	scrollRightLabel: string;
	testID?: string;
};

// Company navigation and document history share this single tab control.
// The parent owns the selected value; arrows only reveal more choices.
const CustomTabs = (props: Props) => {
	const { mode } = useColorMode();
	const [containerWidth, setContainerWidth] = useState(0);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [contentWidth, setContentWidth] = useState(0);
	const [scrollOffset, setScrollOffset] = useState(0);
	const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
	const tabLayouts = useRef<Record<number, { x: number; width: number }>>({});
	const hasOverflow = containerWidth > 0 && contentWidth > containerWidth + 1;
	const maxOffset = Math.max(0, contentWidth - viewportWidth);

	const scrollToOffset = (offset: number) => {
		scrollRef.current?.scrollTo({ x: Math.max(0, Math.min(offset, maxOffset)), animated: true });
	};
	const revealTab = (layout: { x: number; width: number }) => {
		if (!viewportWidth) return;
		if (layout.x < scrollOffset) scrollRef.current?.scrollTo({ x: layout.x, animated: true });
		else if (layout.x + layout.width > scrollOffset + viewportWidth)
			scrollRef.current?.scrollTo({ x: layout.x + layout.width - viewportWidth, animated: true });
	};
	const revealSelectedTab = useEffectEvent(() => {
		const layout = tabLayouts.current[props.value];
		if (layout) revealTab(layout);
	});
	useEffect(() => {
		// Measurements can arrive after a restored selection, or change when the
		// selected tab becomes bold. Keep that tab visible after either event.
		revealSelectedTab();
	}, [props.value, viewportWidth, contentWidth]);

	const renderScrollButton = (direction: -1 | 1) => {
		if (!hasOverflow) return null;
		const disabled = direction === -1 ? scrollOffset <= 1 : scrollOffset >= maxOffset - 1;
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={direction === -1 ? props.scrollLeftLabel : props.scrollRightLabel}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={() => scrollToOffset(scrollOffset + direction * viewportWidth * 0.8)}
				style={{ width: SCROLL_BUTTON_WIDTH }}
				className={`min-h-14 items-center justify-center ${disabled ? 'opacity-30' : 'active:bg-slate-100 dark:active:bg-slate-700'}`}
			>
				<MaterialIcons
					name={direction === -1 ? 'chevron-left' : 'chevron-right'}
					size={24}
					color={mode === 'dark' ? colors.slate[300] : colors.slate[600]}
				/>
			</Pressable>
		);
	};

	return (
		<View
			testID={props.testID ?? 'custom-tabs'}
			onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
			className="flex-row overflow-hidden"
			style={surfaceStyles[mode]}
		>
			{renderScrollButton(-1)}
			<ScrollView
				ref={scrollRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				bounces={false}
				onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
				onContentSizeChange={(width) => setContentWidth(width)}
				onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.x)}
				scrollEventThrottle={32}
				accessibilityLabel={props.label}
				className="min-w-0 flex-1"
			>
				{props.items.map((item) => (
					<Pressable
						key={item.value}
						accessibilityRole="tab"
						accessibilityLabel={item.accessibilityLabel ?? item.label}
						accessibilityState={{ selected: props.value === item.value }}
						onPress={() => {
							props.onChange(item.value);
							const layout = tabLayouts.current[item.value];
							if (layout) revealTab(layout);
						}}
						onLayout={(event) => {
							const { x, width } = event.nativeEvent.layout;
							tabLayouts.current[item.value] = { x, width };
							if (props.value === item.value) revealTab({ x, width });
						}}
						style={
							containerWidth
								? { maxWidth: Math.max(0, containerWidth - (props.items.length > 1 ? 2 * SCROLL_BUTTON_WIDTH : 0)) }
								: undefined
						}
						className={`min-h-14 justify-center border-b-[3px] px-4 py-3 active:bg-slate-100 dark:active:bg-slate-700 ${props.value === item.value ? 'border-brand dark:border-blue-300' : 'border-transparent'}`}
					>
						<Text
							numberOfLines={1}
							className={
								props.value === item.value
									? 'font-poppins-semibold text-brand dark:text-blue-300'
									: 'font-poppins-medium text-slate-600 dark:text-slate-300'
							}
						>
							{item.label}
						</Text>
					</Pressable>
				))}
			</ScrollView>
			{renderScrollButton(1)}
		</View>
	);
};

export default CustomTabs;
