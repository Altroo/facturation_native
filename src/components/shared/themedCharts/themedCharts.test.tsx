import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { Bar, Doughnut, Line } from './themedCharts';
import { colors } from '@/utils/themes';

jest.mock('react-native-gifted-charts', () => ({
	BarChart: jest.fn(() => null),
	LineChart: jest.fn(() => null),
	PieChart: jest.fn(() => null),
}));
const mockMode = { mode: 'light' };
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => mockMode }));
const data = {
	labels: ['Casa di lusso', 'Blueline works'],
	datasets: [
		{ label: 'Revenue (MAD)', data: [1149560, 300], color: colors.brand },
		{ label: 'Quantity', data: [10, 2], color: colors.success, secondary: true },
	],
};
const layout = async () => {
	await fireEvent(screen.getByTestId('themed-chart'), 'layout', { nativeEvent: { layout: { width: 340 } } });
};
beforeEach(() => {
	jest.clearAllMocks();
	mockMode.mode = 'light';
});

describe('Themed Charts', () => {
	it('adapts grouped bars to the container, keeps separate units, and shows the full tapped value', async () => {
		await render(<Bar data={data} />);
		await layout();
		const props = jest.mocked(BarChart).mock.calls.at(-1)![0];
		expect(props.width).toBeLessThan(340);
		expect(props.secondaryYAxis).toBeDefined();
		expect(props.data?.[1]).toMatchObject({ value: 10, isSecondary: true });
		await act(() => props.data?.[0].onPress());
		expect(screen.getByText('Casa di lusso')).toBeOnTheScreen();
		expect(screen.getByText('Revenue (MAD): 1 149 560')).toBeOnTheScreen();
	});

	it('preserves the receivables stack and all its categories', async () => {
		await render(<Bar stacked data={data} />);
		await layout();
		const props = jest.mocked(BarChart).mock.calls.at(-1)![0];
		expect(props.stackData?.[0].stacks.map((item) => item.value)).toEqual([1149560, 10]);
		expect(props.data).toBeUndefined();
	});

	it('uses dark chart surfaces and retains the original values in line datasets', async () => {
		mockMode.mode = 'dark';
		await render(<Line data={data} />);
		await layout();
		const props = jest.mocked(LineChart).mock.calls.at(-1)![0];
		expect(props.backgroundColor).toBe(colors.panel);
		expect(props.dataSet?.[0].data.map((item) => item.value)).toEqual([1149560, 300]);
	});

	it('uses a doughnut with visible categories and a readable central percentage', async () => {
		await render(
			<Doughnut
				data={{
					labels: ['Collected', 'Remaining'],
					datasets: [{ label: '%', data: [80, 20], color: colors.brand, colors: [colors.success, colors.slate[200]] }],
				}}
				centerLabel="80%"
			/>,
		);
		await layout();
		const props: ComponentProps<typeof PieChart> = jest.mocked(PieChart).mock.calls.at(-1)![0];
		expect(props.donut).toBe(true);
		expect(props.data.map((item) => item.value)).toEqual([80, 20]);
		await fireEvent.press(screen.getByRole('button', { name: 'Collected' }));
		expect(screen.getByText('%: 80')).toBeOnTheScreen();
	});

	it.each([
		[
			[1, 1],
			['50 %', '50 %'],
		],
		[
			[1, 2],
			['33,3 %', '66,7 %'],
		],
		[
			[0, 0],
			['0 %', '0 %'],
		],
	])(
		'shows each quote status share for counts %p while preserving the original counts',
		async (counts, percentages) => {
			await render(
				<Doughnut
					showPercentages
					data={{
						labels: ['Accepté', 'Envoyé'],
						datasets: [{ label: 'Devis', data: counts as number[], color: colors.brand }],
					}}
				/>,
			);
			await layout();
			expect(screen.getByText(`Accepté · ${percentages[0]}`)).toBeOnTheScreen();
			expect(screen.getByText(`Envoyé · ${percentages[1]}`)).toBeOnTheScreen();
			expect(screen.getByRole('button', { name: 'Accepté' })).toHaveProp('accessibilityValue', {
				text: percentages[0],
			});
			await fireEvent.press(screen.getByRole('button', { name: 'Accepté' }));
			expect(screen.getByText(`Devis: ${counts[0]} (${percentages[0]})`)).toBeOnTheScreen();
			expect(
				jest
					.mocked(PieChart)
					.mock.calls.at(-1)![0]
					.data.map((item) => item.value),
			).toEqual(counts);
		},
	);

	it('gives short status labels more plotting space while reserving room for long product names', async () => {
		const view = await render(
			<Bar
				horizontal
				data={{
					...data,
					labels: ['Bureau réglable électrique avec un très long nom', 'Écran haute résolution avec support'],
				}}
			/>,
		);
		await layout();
		const longNameWidth = jest.mocked(BarChart).mock.calls.at(-1)![0].width!;
		await view.rerender(<Bar horizontal data={{ ...data, labels: ['Payé', 'Impayé'] }} />);
		const shortNameWidth = jest.mocked(BarChart).mock.calls.at(-1)![0].width!;
		expect(shortNameWidth).toBeGreaterThan(longNameWidth);
		expect(shortNameWidth).toBeLessThan(340);
	});

	it('bounds the axis count for a large negative margin rather than generating thousands of grid sections', async () => {
		await render(
			<Line
				data={{
					labels: ['09/26', '10/26'],
					datasets: [{ label: 'Margin', color: colors.brand, data: [-1000000, -5] }],
				}}
			/>,
		);
		await layout();
		const props = jest.mocked(LineChart).mock.calls.at(-1)![0];
		expect(props.maxValue).toBe(1000000);
		expect(props.noOfSectionsBelowXAxis).toBe(4);
	});

	it.each([
		[
			['2026-09', '2026-10'],
			['09/26', '10/26'],
		],
		[
			['2026-10-01', '2026-10-02'],
			['01/10', '02/10'],
		],
	])('keeps monthly and daily time-series labels distinct: %p', async (labels, expected) => {
		await render(<Line data={{ labels, datasets: [{ label: 'Revenue', color: colors.brand, data: [1, 2] }] }} />);
		await layout();
		expect(
			jest
				.mocked(LineChart)
				.mock.calls.at(-1)![0]
				.dataSet?.[0].data.map((item) => item.label),
		).toEqual(expected);
	});

	it('keeps both comparison scales visible outside the rotated chart area', async () => {
		await render(<Bar horizontal data={data} />);
		await layout();
		expect(screen.getByText('Quantity')).toBeOnTheScreen();
		expect(screen.getByText('Revenue (MAD)')).toBeOnTheScreen();
		const props = jest.mocked(BarChart).mock.calls.at(-1)![0];
		expect(props.secondaryYAxis).toMatchObject({ hideYAxisText: true, maxValue: 10 });
		expect(props.hideYAxisText).toBe(true);
	});

	it.each([false, true])('selects the matching horizontal row for product labels (stacked: %p)', async (stacked) => {
		const labels = ['Écran 27 pouces', 'Clavier sans fil', 'Souris sans fil'];
		await render(
			<Bar
				horizontal
				stacked={stacked}
				data={{ labels, datasets: [{ label: 'Quantité', data: [12, 8, 4], color: colors.brand }] }}
			/>,
		);
		await layout();
		expect(screen.getByTestId('themed-bar-canvas', { includeHiddenElements: true })).toHaveProp(
			'pointerEvents',
			'none',
		);
		for (const [index, label] of labels.entries()) {
			await fireEvent.press(screen.getByRole('button', { name: label }));
			expect(screen.getByRole('button', { name: label, selected: true })).toBeOnTheScreen();
			expect(screen.getByText(`Quantité: ${[12, 8, 4][index]}`)).toBeOnTheScreen();
		}
	});

	it('keeps client metric labels and grouped values on the same independent touch row', async () => {
		const labels = ['Volume', 'Fréquence', 'Montant moyen', 'Rapidité', 'Acceptation'];
		await render(
			<Bar
				horizontal
				data={{
					labels,
					datasets: [
						{ label: 'Actuel', data: [100, 6, 423, 88, 50], color: colors.brand },
						{ label: 'Précédent', data: [90, 5, 400, 80, 40], color: colors.success },
					],
				}}
			/>,
		);
		await layout();
		await fireEvent.press(screen.getByRole('button', { name: 'Rapidité' }));
		expect(screen.getByText('Actuel: 88')).toBeOnTheScreen();
		expect(screen.getByText('Précédent: 80')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: 'Montant moyen' }));
		expect(screen.getByText('Actuel: 423')).toBeOnTheScreen();
		expect(screen.getByText('Précédent: 400')).toBeOnTheScreen();
	});

	it('lets long client names wrap to two lines without cutting the text before rendering', async () => {
		const client = 'El Bouazzaoui Mariame';
		await render(
			<Bar
				horizontal
				stacked
				data={{ labels: [client], datasets: [{ label: 'À encaisser', data: [186930], color: colors.brand }] }}
			/>,
		);
		await layout();
		expect(screen.getByText(client)).toHaveProp('numberOfLines', 2);
		await fireEvent.press(screen.getByRole('button', { name: client }));
		expect(screen.getByText('À encaisser: 186 930')).toBeOnTheScreen();
	});
});
