import { fireEvent, render, screen } from '@testing-library/react-native';
import { translations } from '@/translations';
import GlobalRemiseModal from './globalRemiseModal';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

const mockApply = jest.fn();
const mockClose = jest.fn();
beforeEach(() => jest.clearAllMocks());

describe('GlobalRemiseModal', () => {
	it('keeps a discount draft until Apply and enforces the document HT limit', async () => {
		await render(
			<GlobalRemiseModal
				currentType="Fixe"
				currentValue={10}
				devise="EUR"
				maximum={100}
				onApply={mockApply}
				onClose={mockClose}
			/>,
		);
		await fireEvent.changeText(screen.getByLabelText(t.globalRemiseModal.valueAmountLabel('EUR')), '101');
		expect(mockApply).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.globalRemiseModal.applyBtn }));
		expect(mockApply).not.toHaveBeenCalled();
		expect(mockClose).not.toHaveBeenCalled();
		await fireEvent.changeText(screen.getByLabelText(t.globalRemiseModal.valueAmountLabel('EUR')), '20,5');
		await fireEvent.press(screen.getByRole('button', { name: t.globalRemiseModal.applyBtn }));
		expect(mockApply).toHaveBeenCalledWith('Fixe', 20.5);
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('rejects percentages above 100 and cancellation leaves the document unchanged', async () => {
		await render(
			<GlobalRemiseModal
				currentType="Pourcentage"
				currentValue={10}
				devise="MAD"
				maximum={100}
				onApply={mockApply}
				onClose={mockClose}
			/>,
		);
		await fireEvent.changeText(screen.getByLabelText(t.globalRemiseModal.valuePercentLabel), '101');
		await fireEvent.press(screen.getByRole('button', { name: t.globalRemiseModal.applyBtn }));
		expect(mockApply).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('keeps stepped discount values in the draft until Apply and stops at the fixed HT limit', async () => {
		await render(
			<GlobalRemiseModal
				currentType="Fixe"
				currentValue={99.5}
				devise="MAD"
				maximum={100}
				onApply={mockApply}
				onClose={mockClose}
			/>,
		);
		const label = t.globalRemiseModal.valueAmountLabel('MAD');
		await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue(label) }));
		expect(screen.getByLabelText(label)).toHaveProp('value', '100');
		expect(screen.getByRole('button', { name: t.common.increaseValue(label) })).toBeDisabled();
		expect(mockApply).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.globalRemiseModal.applyBtn }));
		expect(mockApply).toHaveBeenCalledWith('Fixe', 100);
	});
});
