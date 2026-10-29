import { fireEvent, render, screen } from '@testing-library/react-native';
import CompanyDocumentRemiseControls from './companyDocumentRemiseControls';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual('@/translations').translations.fr }),
}));
const t = translations.fr;

describe('CompanyDocumentRemiseControls', () => {
	it('offers one compact add action for an empty discount and removes it only after selection', async () => {
		const apply = jest.fn();
		const remove = jest.fn();
		const view = await render(
			<CompanyDocumentRemiseControls
				type=""
				value={0}
				devise="MAD"
				disabled={false}
				onApply={apply}
				onRemove={remove}
			/>,
		);
		expect(screen.getByText(t.globalRemiseModal.typeNone)).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.documentForm.removeGlobalRemise })).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.applyGlobalRemise }));
		expect(apply).toHaveBeenCalledTimes(1);
		await view.rerender(
			<CompanyDocumentRemiseControls
				type="Fixe"
				value={1250.5}
				devise="EUR"
				disabled={false}
				onApply={apply}
				onRemove={remove}
			/>,
		);
		expect(screen.getByText('1 250,50 EUR')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.removeGlobalRemise }));
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it('shows percentage/error feedback and disables changes on a locked credit note', async () => {
		await render(
			<CompanyDocumentRemiseControls
				type="Pourcentage"
				value={5}
				devise="MAD"
				disabled
				error="Invalid discount"
				onApply={jest.fn()}
				onRemove={jest.fn()}
			/>,
		);
		expect(screen.getByText('5,00 %')).toBeOnTheScreen();
		expect(screen.getByText('Invalid discount')).toBeOnTheScreen();
		expect(screen.getByRole('button', { name: t.documentForm.applyGlobalRemise })).toBeDisabled();
		expect(screen.getByRole('button', { name: t.documentForm.removeGlobalRemise })).toBeDisabled();
	});
});
