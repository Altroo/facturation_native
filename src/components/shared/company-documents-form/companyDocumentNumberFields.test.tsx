import { fireEvent, render, screen } from '@testing-library/react-native';
import CompanyDocumentNumberFields from './companyDocumentNumberFields';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
const t = translations.fr;

describe('CompanyDocumentNumberFields', () => {
	it('keeps the native editable number/year row and visible full-text reset action', async () => {
		const numberChange = jest.fn();
		const yearChange = jest.fn();
		const reset = jest.fn();
		await render(
			<CompanyDocumentNumberFields
				numberInput={{ value: 'AV001', onChangeText: numberChange }}
				yearInput={{ value: '26', onChangeText: yearChange }}
				reset={{ loading: false, disabled: false, onPress: reset }}
			/>,
		);
		expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('keyboardType', 'default');
		expect(screen.getByLabelText(t.documentForm.fieldAnneeLabel)).toHaveProp('keyboardType', 'number-pad');
		await fireEvent.changeText(screen.getByLabelText(t.documentForm.fieldNumeroLabel), 'AV002');
		await fireEvent.changeText(screen.getByLabelText(t.documentForm.fieldAnneeLabel), '27');
		expect(numberChange).toHaveBeenCalledWith('AV002');
		expect(yearChange).toHaveBeenCalledWith('27');
		expect(screen.getByText(t.documentForm.resetNumero)).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
		expect(reset).toHaveBeenCalledTimes(1);
	});

	it('supports server-generated read-only numbers and hides an unneeded year/reset action', async () => {
		await render(<CompanyDocumentNumberFields numberInput={{ value: 'AV001', disabled: true, hideLockIcon: true }} />);
		expect(screen.getByLabelText(t.documentForm.fieldNumeroLabel)).toHaveProp('editable', false);
		expect(screen.queryByLabelText(t.documentForm.fieldAnneeLabel)).toBeNull();
		expect(screen.queryByRole('button', { name: t.documentForm.resetNumero })).toBeNull();
	});

	it('disables number reset while its request is pending', async () => {
		const reset = jest.fn();
		await render(
			<CompanyDocumentNumberFields
				numberInput={{ value: '001' }}
				reset={{ loading: true, disabled: false, onPress: reset }}
			/>,
		);
		expect(screen.getByRole('button', { name: t.documentForm.resetNumero })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.resetNumero }));
		expect(reset).not.toHaveBeenCalled();
	});
});
