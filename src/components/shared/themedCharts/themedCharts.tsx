import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { useColorMode } from '@/providers/themeProvider';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
import { colors, fonts } from '@/utils/themes';

type Props = {
	data: {
		labels: string[];
		datasets: { label: string; data: number[]; color: string; colors?: string[]; secondary?: boolean }[];
	};
	height?: number;
	sparkline?: boolean;
	stacked?: boolean;
	centerLabel?: string;
	showPercentages?: boolean;
	horizontal?: boolean;
};

// Keep the web's labels/datasets shape. Gifted Charts handles native drawing,
// touch targets and horizontal scrolling instead of Chart.j's HTML canvas.
const ThemedChart = (props: Props & { variant: 'line' | 'bar' | 'donut' }) => {
	const { mode } = useColorMode();
	const { language } = useLanguage();
	const [width, setWidth] = useState(0);
	const [selected, setSelected] = useState<number | null>(null);
	const foreground = mode === 'dark' ? colors.slate[300] : colors.slate[600];
	const background = mode === 'dark' ? colors.panel : colors.white;
	const grid = mode === 'dark' ? colors.slate[600] : colors.slate[200];
	const height = props.height ?? 210;
	const chartWidth = Math.max(80, width - (props.sparkline || props.variant === 'donut' ? 0 : 62));
	const labelStyle = { color: foreground, fontFamily: fonts.regular, fontSize: 10 };
	const shortNumber = (value: string) => {
		const number = Number(value);
		const magnitude = Math.abs(number);
		const divisor = magnitude >= 1000000 ? 1000000 : magnitude >= 1000 ? 1000 : 1;
		const text = (number / divisor).toFixed(divisor === 1 ? 0 : 1).replace(/\.0$/, '');
		return (
			(language === 'fr' ? text.replace('.', ',') : text) + (divisor === 1000000 ? ' M' : divisor === 1000 ? ' k' : '')
		);
	};
	const valueText = (value: number) => formatNumberWithSpaces(value, Number.isInteger(value) ? 0 : 2);
	const labels = props.data.labels;
	const timeLabel = (label: string) =>
		/^\d{4}-\d{2}-\d{2}$/.test(label)
			? `${label.slice(8, 10)}/${label.slice(5, 7)}`
			: /^\d{4}-\d{2}$/.test(label)
				? `${label.slice(5, 7)}/${label.slice(2, 4)}`
				: label;
	const datasets = props.data.datasets;
	const showPercentages = props.variant === 'donut' && props.showPercentages;
	const doughnutTotal = showPercentages
		? (datasets[0]?.data.reduce((sum, value) => sum + Math.max(0, value), 0) ?? 0)
		: 0;
	const percentageText = (index: number) => {
		const percentage = doughnutTotal ? (Math.max(0, datasets[0]?.data[index] ?? 0) / doughnutTotal) * 100 : 0;
		return `${formatNumberWithSpaces(percentage, 1).replace(/,0$/, '')} %`;
	};
	const horizontal = props.variant === 'bar' && props.horizontal;
	const axisLabels = labels.map((label) => (!horizontal && label.length > 20 ? `${label.slice(0, 18)}…` : label));
	// Short status/metric names must not reserve the same column as long product names.
	const labelColumnWidth = Math.min(120, Math.max(80, ...axisLabels.map((label) => label.length * 5.5 + 12)));
	const horizontalBarWidth = datasets.length > 1 && !props.stacked ? 9 : 14;
	const horizontalGap = datasets.length > 1 && !props.stacked ? 15 : 22;
	const horizontalRowHeight = props.stacked
		? horizontalBarWidth + horizontalGap
		: datasets.length * horizontalBarWidth + (datasets.length - 1) * 3 + horizontalGap;
	const horizontalHeight = labels.length * horizontalRowHeight + 18;
	const primaryValues = datasets.filter((item) => !item.secondary).flatMap((item) => item.data);
	const primaryMax = Math.max(1, ...primaryValues.map(Math.abs));
	const primaryAxisMax = props.stacked
		? Math.max(1, ...labels.map((_, index) => datasets.reduce((sum, item) => sum + (item.data[index] ?? 0), 0)))
		: primaryMax;
	const secondary = datasets.find((item) => item.secondary);
	const secondaryMax = Math.max(1, ...(secondary?.data.map(Math.abs) ?? []));
	const plotWidth = Math.max(80, width - labelColumnWidth - 32);
	const hasNegativeValues = primaryValues.some((value) => value < 0);
	const selection = selected !== null && selected < labels.length ? selected : null;
	const select = (index: number) => setSelected(index);
	// Draw horizontal tick text outside the library's rotated canvas. Both scales
	// stay upright and visible, with the same maxima used to draw the bars.
	const renderHorizontalAxis = (maximum: number, negative: boolean, label?: string, color: string = foreground) => {
		const steps = Math.min(4, Math.ceil(maximum));
		return (
			<View className="gap-1" style={{ marginLeft: labelColumnWidth, width: plotWidth }}>
				{!!label && (
					<View className="flex-row items-center justify-end gap-2">
						<View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
						<Text className="font-sans text-xs text-right" style={{ color: foreground }}>
							{label}
						</Text>
					</View>
				)}
				<View style={{ height: 18 }}>
					{Array.from({ length: steps + 1 }, (_, index) => (
						<Text
							key={index}
							style={{
								...labelStyle,
								position: 'absolute',
								left: (plotWidth * index) / steps - 26,
								width: 52,
								textAlign: 'center',
							}}
						>
							{shortNumber(String(maximum * (negative ? (2 * index) / steps - 1 : index / steps)))}
						</Text>
					))}
				</View>
			</View>
		);
	};
	const renderBarLabel = (label: string, index: number) => (
		<Pressable accessibilityRole="button" accessibilityLabel={labels[index]} hitSlop={6} onPress={() => select(index)}>
			<Text
				numberOfLines={1}
				ellipsizeMode="tail"
				style={{ ...labelStyle, textAlign: horizontal ? 'right' : 'center' }}
			>
				{label}
			</Text>
		</Pressable>
	);
	const common = {
		width: chartWidth,
		height: hasNegativeValues ? height / 2 : height,
		maxValue: primaryMax,
		noOfSectionsBelowXAxis: hasNegativeValues ? 4 : 0,
		noOfSections: 4,
		yAxisLabelWidth: props.sparkline ? 0 : 52,
		yAxisTextStyle: labelStyle,
		xAxisLabelTextStyle: labelStyle,
		xAxisThickness: 0,
		yAxisThickness: 0,
		rulesColor: grid,
		rulesType: 'dashed' as const,
		hideRules: !!props.sparkline,
		hideAxesAndRules: !!props.sparkline,
		formatYLabel: shortNumber,
		showScrollIndicator: !props.sparkline,
		backgroundColor: background,
	};
	const secondaryYAxis = secondary
		? {
				yAxisTextStyle: labelStyle,
				formatYLabel: shortNumber,
				noOfSections: 4,
				maxValue: secondaryMax,
				hideYAxisText: horizontal,
			}
		: undefined;
	return (
		<View
			testID="themed-chart"
			className="min-w-0 gap-3"
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
		>
			{width > 0 &&
				horizontal &&
				secondary &&
				renderHorizontalAxis(
					secondaryMax,
					secondary.data.some((value) => value < 0),
					secondary.label,
					secondary.color,
				)}
			{width > 0 && (
				<View
					className="overflow-hidden"
					style={props.sparkline ? { height: height + 4 } : horizontal ? { height: horizontalHeight + 24 } : undefined}
				>
					{props.variant === 'line' ? (
						<LineChart
							{...common}
							dataSet={datasets.map((dataset) => ({
								data: dataset.data.map((value, index) => ({
									value,
									label: props.sparkline ? '' : timeLabel(labels[index] ?? ''),
									onPress: () => select(index),
								})),
								color: dataset.color,
								dataPointsColor: dataset.color,
								isSecondary: dataset.secondary,
								thickness: 2,
								startFillColor: dataset.color,
								endFillColor: background,
								startOpacity: 0.15,
								endOpacity: 0,
								areaChart: datasets.length === 1,
								hideDataPoints: !!props.sparkline,
							}))}
							spacing={
								props.sparkline
									? chartWidth / Math.max(1, labels.length - 1)
									: Math.max(54, (chartWidth - 56) / Math.max(1, labels.length - 1))
							}
							initialSpacing={props.sparkline ? 0 : 28}
							endSpacing={28}
							xAxisLabelTextStyle={labelStyle}
							secondaryYAxis={secondaryYAxis}
							dataPointsRadius={4}
							focusEnabled={!props.sparkline}
							disableScroll={props.sparkline}
							xAxisTextNumberOfLines={2}
						/>
					) : props.variant === 'bar' ? (
						<>
							<View
								testID="themed-bar-canvas"
								pointerEvents={horizontal ? 'none' : 'auto'}
								accessibilityElementsHidden={!!horizontal}
								importantForAccessibility={horizontal ? 'no-hide-descendants' : 'auto'}
							>
								<BarChart
									{...common}
									horizontal={horizontal}
									width={
										horizontal
											? Math.max(80, (width - labelColumnWidth - 32) / (hasNegativeValues ? 2 : 1))
											: chartWidth
									}
									height={horizontal ? horizontalHeight : height}
									yAxisLabelWidth={horizontal ? 35 : 52}
									initialSpacing={18}
									endSpacing={18}
									disableScroll={horizontal}
									maxValue={primaryAxisMax}
									hideYAxisText={horizontal}
									noOfSections={Math.min(4, Math.ceil(primaryMax))}
									shiftY={horizontal ? -32 : 0}
									labelsExtraHeight={horizontal ? Math.max(0, labelColumnWidth - 60) : 0}
									labelsDistanceFromXaxis={0}
									xAxisLabelTextStyle={
										horizontal ? { ...labelStyle, textAlign: 'right', transform: [{ translateX: -36 }] } : labelStyle
									}
									data={
										props.stacked
											? undefined
											: axisLabels.flatMap((label, index) =>
													datasets.map((dataset, seriesIndex) => ({
														value: dataset.data[index] ?? 0,
														label: !horizontal && seriesIndex === 0 ? label : '',
														labelWidth: horizontal ? labelColumnWidth : 76,
														labelComponent:
															!horizontal && seriesIndex === 0 ? () => renderBarLabel(label, index) : undefined,
														frontColor: dataset.colors?.[index] ?? dataset.color,
														isSecondary: dataset.secondary,
														spacing: seriesIndex === datasets.length - 1 ? (horizontal ? horizontalGap : 20) : 3,
														onPress: () => select(index),
													})),
												)
									}
									stackData={
										props.stacked
											? axisLabels.map((label, index) => ({
													label: horizontal ? '' : label,
													labelWidth: horizontal ? labelColumnWidth : 76,
													labelComponent: horizontal ? undefined : () => renderBarLabel(label, index),
													stacks: datasets.map((dataset) => ({
														value: dataset.data[index] ?? 0,
														color: dataset.color,
													})),
													onPress: () => select(index),
													spacing: horizontal ? horizontalGap : 20,
												}))
											: undefined
									}
									barWidth={horizontal ? horizontalBarWidth : datasets.length > 1 && !props.stacked ? 18 : 30}
									barBorderTopLeftRadius={4}
									barBorderTopRightRadius={4}
									secondaryYAxis={secondaryYAxis}
									xAxisTextNumberOfLines={horizontal ? 1 : 3}
									xAxisLabelsHeight={horizontal ? 20 : 52}
									labelWidth={horizontal ? 100 : 76}
								/>
							</View>
							{horizontal && (
								// Keep touch targets outside Gifted's rotated canvas. Its label
								// containers overlap neighbouring rows even when the text looks aligned.
								<View
									style={{
										position: 'absolute',
										// Match the canvas's shiftY (-32) and its default
										// y-axis headroom (height / 20), centred by rotation.
										top: 33 + horizontalHeight / 40 - (horizontalBarWidth + horizontalGap) / 2,
										left: 0,
										right: 0,
									}}
								>
									{axisLabels.map((label, index) => (
										<Pressable
											key={`${labels[index]}-${index}`}
											accessibilityRole="button"
											accessibilityLabel={labels[index]}
											accessibilityState={{ selected: selection === index }}
											onPress={() => select(index)}
											style={{ height: horizontalRowHeight, justifyContent: 'center' }}
										>
											<Text
												numberOfLines={2}
												ellipsizeMode="tail"
												style={{
													...labelStyle,
													lineHeight: 14,
													width: labelColumnWidth,
													paddingRight: 4,
													textAlign: 'right',
												}}
											>
												{label}
											</Text>
										</Pressable>
									))}
								</View>
							)}
						</>
					) : (
						<View className={props.sparkline ? 'items-center' : 'items-center py-2'}>
							<PieChart
								donut
								radius={Math.min(100, height / 2, chartWidth / 2)}
								innerRadius={Math.min(73, height * 0.36, chartWidth * 0.36)}
								innerCircleColor={background}
								data={labels.map((label, index) => ({
									value: Math.max(0, datasets[0]?.data[index] ?? 0),
									color: datasets[0]?.colors?.[index] ?? datasets[0]?.color,
									text: label,
									onPress: () => select(index),
								}))}
								centerLabelComponent={() => (
									<Text
										numberOfLines={1}
										adjustsFontSizeToFit
										className="font-poppins-semibold text-base text-ink dark:text-slate-100"
									>
										{props.centerLabel}
									</Text>
								)}
							/>
						</View>
					)}
				</View>
			)}
			{width > 0 &&
				horizontal &&
				renderHorizontalAxis(
					primaryAxisMax,
					hasNegativeValues,
					secondary ? datasets.find((item) => !item.secondary)?.label : undefined,
					secondary ? datasets.find((item) => !item.secondary)?.color : foreground,
				)}
			{!props.sparkline && (
				<>
					{(!horizontal || !secondary) && (
						<View className="flex-row flex-wrap gap-x-4 gap-y-2">
							{(props.variant === 'donut' ? labels : datasets.map((dataset) => dataset.label)).map((label, index) => (
								<Pressable
									key={`${label}-${index}`}
									accessibilityRole="button"
									accessibilityLabel={label}
									accessibilityValue={showPercentages ? { text: percentageText(index) } : undefined}
									onPress={() => select(props.variant === 'donut' ? index : (selection ?? 0))}
									className="flex-row items-center gap-2 py-1"
								>
									<View
										className="h-2.5 w-2.5 rounded-full"
										style={{
											backgroundColor:
												props.variant === 'donut'
													? (datasets[0]?.colors?.[index] ?? datasets[0]?.color)
													: datasets[index]?.color,
										}}
									/>
									<Text className="shrink font-sans text-xs text-slate-500 dark:text-slate-300">
										{label}
										{showPercentages ? ` · ${percentageText(index)}` : ''}
									</Text>
								</Pressable>
							))}
						</View>
					)}
					{selection !== null ? (
						<View accessibilityLiveRegion="polite" className="gap-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
							<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{labels[selection]}</Text>
							{datasets.map((dataset, index) => (
								<Text key={dataset.label} className="font-sans text-xs text-slate-600 dark:text-slate-300">
									{dataset.label}: {valueText(dataset.data[selection] ?? 0)}
									{showPercentages && index === 0 ? ` (${percentageText(selection)})` : ''}
								</Text>
							))}
						</View>
					) : null}
				</>
			)}
		</View>
	);
};

export const Line = (props: Props) => <ThemedChart {...props} variant="line" />;
export const Bar = (props: Props) => <ThemedChart {...props} variant="bar" />;
export const Doughnut = (props: Props) => <ThemedChart {...props} variant="donut" />;
