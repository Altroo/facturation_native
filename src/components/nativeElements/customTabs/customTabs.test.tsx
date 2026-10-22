import type { ComponentRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import CustomTabs from './customTabs';
import { colors, surfaceStyles } from '@/utils/themes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
let mockMode: 'light' | 'dark' = 'light';
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: mockMode }) }));

const onChange = jest.fn();
const props = {
	items: [
		{ value: 0, label: 'Devis (2)', accessibilityLabel: 'Devis' },
		{ value: 1, label: 'Factures (3)', accessibilityLabel: 'Factures' },
		{ value: 2, label: 'Avoirs (1)', accessibilityLabel: 'Avoirs' },
		{ value: 3, label: 'Paiements (4)', accessibilityLabel: 'Paiements' },
	],
	value: 0,
	onChange,
	label: 'History tabs',
	scrollLeftLabel: 'Tabs to the left',
	scrollRightLabel: 'Tabs to the right',
};
const scrollView = ScrollView.prototype as ComponentRef<typeof ScrollView>;
const measure = async (contentWidth = 600, containerWidth = 300) => {
	await fireEvent.layout(screen.getByTestId('custom-tabs'), { width: containerWidth, height: 56 });
	await fireEvent(screen.getByLabelText(props.label), 'contentSizeChange', contentWidth, 56);
	await fireEvent.layout(screen.getByLabelText(props.label), {
		width: contentWidth > containerWidth ? containerWidth - 88 : containerWidth,
		height: 56,
	});
	jest.mocked(scrollView.scrollTo).mockClear();
};
const scrollTo = async (x: number) =>
	fireEvent.scroll(screen.getByLabelText(props.label), {
		nativeEvent: {
			contentOffset: { x, y: 0 },
			contentSize: { width: 600, height: 56 },
			layoutMeasurement: { width: 212, height: 56 },
		},
	});

beforeEach(() => {
	jest.clearAllMocks();
	mockMode = 'light';
});

it('keeps counts in the text and hides arrows when all tabs fit', async () => {
	await render(<CustomTabs {...props} />);
	await measure(280);
	expect(screen.getAllByRole('tab')).toHaveLength(4);
	expect(screen.getByText('Factures (3)')).toHaveProp('numberOfLines', 1);
	expect(screen.getByRole('tab', { name: 'Devis', selected: true })).toBeOnTheScreen();
	expect(screen.queryByRole('button', { name: props.scrollLeftLabel })).toBeNull();
	expect(screen.queryByRole('button', { name: props.scrollRightLabel })).toBeNull();
});

it('scrolls in either direction without changing selection and disables the reached end', async () => {
	await render(<CustomTabs {...props} />);
	await measure();
	expect(screen.getByRole('button', { name: props.scrollLeftLabel })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: props.scrollRightLabel }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: expect.closeTo(169.6), animated: true });
	expect(onChange).not.toHaveBeenCalled();
	await scrollTo(388);
	expect(screen.getByRole('button', { name: props.scrollRightLabel })).toBeDisabled();
	await fireEvent.press(screen.getByRole('button', { name: props.scrollLeftLabel }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: expect.closeTo(218.4), animated: true });
	await scrollTo(350);
	await fireEvent.press(screen.getByRole('button', { name: props.scrollRightLabel }));
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 388, animated: true });
	expect(screen.getByRole('tab', { name: 'Devis', selected: true })).toBeOnTheScreen();
});

it('emits the chosen value and reveals a controlled selection when it changes', async () => {
	await render(<CustomTabs {...props} />);
	await measure();
	await fireEvent.layout(screen.getByRole('tab', { name: 'Paiements' }), { x: 400, width: 200, height: 56 });
	await fireEvent.press(screen.getByRole('tab', { name: 'Paiements' }));
	expect(onChange).toHaveBeenCalledWith(3);
	await screen.rerender(<CustomTabs {...props} value={3} />);
	expect(screen.getByRole('tab', { name: 'Paiements', selected: true })).toBeOnTheScreen();
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 388, animated: true });
	// The selected font changes the tab width. Its new layout must remain visible.
	await fireEvent.layout(screen.getByRole('tab', { name: 'Paiements' }), { x: 400, width: 210, height: 56 });
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 398, animated: true });
});

it('reveals a restored selection when the viewport is measured after the tab', async () => {
	await render(<CustomTabs {...props} value={3} />);
	await fireEvent.layout(screen.getByRole('tab', { name: 'Paiements' }), { x: 400, width: 200, height: 56 });
	jest.mocked(scrollView.scrollTo).mockClear();
	await fireEvent.layout(screen.getByLabelText(props.label), { width: 212, height: 56 });
	expect(scrollView.scrollTo).toHaveBeenLastCalledWith({ x: 388, animated: true });
});

it.each(['light', 'dark'] as const)('uses the existing %s company-tab surface and arrow colors', async (mode) => {
	mockMode = mode;
	await render(<CustomTabs {...props} />);
	await measure();
	expect(screen.getByTestId('custom-tabs')).toHaveStyle(surfaceStyles[mode]);
	for (const name of ['chevron-left', 'chevron-right'])
		expect(screen.container.queryAll((node) => node.props.name === name)[0]).toHaveProp(
			'color',
			mode === 'dark' ? colors.slate[300] : colors.slate[600],
		);
});
