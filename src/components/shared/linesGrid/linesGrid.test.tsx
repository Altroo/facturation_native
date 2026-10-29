import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { translations } from '@/translations';
import LinesGrid from './linesGrid';
jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
const t = translations.fr;

const line = {
	article: 4,
	designation: 'Desk',
	reference: 'ART004',
	prix_achat: 50,
	devise_prix_achat: 'MAD',
	prix_vente: 100,
	devise_prix_vente: 'MAD',
	quantity: 2,
	remise_type: 'Pourcentage' as const,
	remise: 10,
};
const articles = [{ id: 4, reference: 'ART004', tva: 20, archived: true }];

describe('LinesGrid', () => {
	it('renders read-only discounted amounts without creating editable controls', async () => {
		await render(<LinesGrid title="Lines" rows={[line]} articles={articles} devise="MAD" />);
		expect(screen.getByText('180,00 MAD')).toBeOnTheScreen();
		expect(screen.getByText('20,00 %')).toBeOnTheScreen();
		expect(screen.getByText(t.common.archived)).toBeOnTheScreen();
		expect(screen.queryByLabelText(t.documentForm.colQuantite)).toBeNull();
	});

	it('keeps commercial sale prices locked while forwarding quantity edits and line removal', async () => {
		const onChange = jest.fn();
		const onDelete = jest.fn();
		await render(
			<LinesGrid
				title="Lines"
				rows={[line]}
				articles={articles}
				devise="MAD"
				onChange={onChange}
				onDelete={onDelete}
				canEditPrice={false}
			/>,
		);
		expect(screen.getByLabelText(`${t.documentForm.colPrixUnitaire} (MAD)`)).toBeDisabled();
		await fireEvent.changeText(screen.getByLabelText(t.documentForm.colQuantite), '1,5');
		expect(onChange).toHaveBeenCalledWith(0, 'quantity', '1.5');
		await fireEvent.press(screen.getByRole('button', { name: t.common.increaseValue(t.documentForm.colQuantite) }));
		expect(onChange).toHaveBeenLastCalledWith(0, 'quantity', '3');
		await fireEvent.press(
			screen.getByRole('button', { name: t.common.decreaseValue(`${t.documentForm.colRemise} (%)`) }),
		);
		expect(onChange).toHaveBeenLastCalledWith(0, 'remise', '9');
		await fireEvent.press(screen.getByRole('button', { name: t.documentForm.deleteLineAriaLabel }));
		expect(onDelete).toHaveBeenCalledWith(0);
	});

	it('shows incoming-stock coverage from the saved quote instead of inventing availability', async () => {
		await render(
			<LinesGrid
				title="Lines"
				rows={[
					{
						...line,
						stock_coverage: {
							status: 'couvert_par_stock_entrant',
							requested_quantity: 2,
							available_quantity: 1,
							incoming_quantity: 3,
						},
					},
				]}
				articles={articles}
				devise="MAD"
			/>,
		);
		expect(screen.getByText(t.documentView.stockIncomingCovered)).toBeOnTheScreen();
	});

	it('searches saved detail lines and shows an article count inside the shared toolbar', async () => {
		await render(
			<LinesGrid
				title="Lines"
				rows={[line, { ...line, article: 8, reference: 'ART008', designation: 'Chair' }]}
				articles={articles}
				devise="MAD"
			/>,
		);
		expect(
			within(screen.getByTestId('list-toolbar')).getByText(t.addArticleModal.articleCount(2, 2)),
		).toBeOnTheScreen();
		expect(screen.queryByText('2 / 2')).toBeNull();
		await fireEvent.press(screen.getByRole('button', { name: t.common.search }));
		await fireEvent.changeText(screen.getByLabelText(t.common.search), 'Chair');
		await fireEvent(screen.getByLabelText(t.common.search), 'submitEditing');
		expect(screen.queryByTestId('document-line-4')).toBeNull();
		expect(screen.getByTestId('document-line-8')).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.common.clearAllFilters }));
		expect(screen.getByTestId('document-line-4')).toBeOnTheScreen();
	});

	it('sorts the display without changing Formik indexes, validation paths or input rows', async () => {
		const onChange = jest.fn();
		const onDelete = jest.fn();
		const rows = [line, { ...line, article: 8, reference: 'ART008', designation: 'Chair', quantity: 9 }];
		await render(
			<LinesGrid
				title="Lines"
				rows={rows}
				articles={articles}
				devise="MAD"
				canEditPrice
				onChange={onChange}
				onDelete={onDelete}
				errors={{ 'lignes.1.quantity': 'Invalid second quantity' }}
			/>,
		);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarSort }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortField }));
		await fireEvent.press(screen.getByRole('radio', { name: t.documentForm.colQuantite }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.sortDirection }));
		await fireEvent.press(screen.getByRole('radio', { name: t.dataGrid.sortDescending }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
		expect(screen.getAllByTestId(/document-line-/).map((card) => card.props.testID)).toEqual([
			'document-line-8',
			'document-line-4',
		]);
		const second = within(screen.getByTestId('document-line-8'));
		expect(second.getByText('Invalid second quantity')).toBeOnTheScreen();
		await fireEvent.changeText(second.getByLabelText(t.documentForm.colQuantite), '4,5');
		expect(onChange).toHaveBeenLastCalledWith(1, 'quantity', '4.5');
		await fireEvent.press(second.getByRole('button', { name: t.common.increaseValue(t.documentForm.colQuantite) }));
		expect(onChange).toHaveBeenLastCalledWith(1, 'quantity', '10');
		await fireEvent.press(second.getByRole('button', { name: t.documentForm.deleteLineAriaLabel }));
		expect(onDelete).toHaveBeenCalledWith(1);
		expect(rows.map((row) => row.article)).toEqual([4, 8]);
		expect(rows[1].quantity).toBe(9);
	});

	it('filters the current unsaved line values and preserves hidden lines and callbacks', async () => {
		const onChange = jest.fn();
		const onDelete = jest.fn();
		const second = { ...line, article: 8, reference: 'ART008', designation: 'Chair', quantity: 9 };
		const props = { title: 'Lines', rows: [line, second], articles, devise: 'MAD', onChange, onDelete };
		await render(<LinesGrid {...props} />);
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.toolbarFilters }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.fieldLabel }));
		await fireEvent.press(screen.getByRole('radio', { name: t.documentForm.colQuantite }));
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.operatorLabel }));
		await fireEvent.press(screen.getByRole('radio', { name: t.filterPanel.greaterThan }));
		await fireEvent.changeText(screen.getByLabelText(t.common.value), '5');
		await fireEvent.press(screen.getByRole('button', { name: t.dataGrid.searchApply }));
		expect(screen.queryByTestId('document-line-4')).toBeNull();
		expect(screen.getByTestId('document-line-8')).toBeOnTheScreen();
		await fireEvent.changeText(
			within(screen.getByTestId('document-line-8')).getByLabelText(t.documentForm.colQuantite),
			'4',
		);
		expect(onChange).toHaveBeenLastCalledWith(1, 'quantity', '4');
		await screen.rerender(<LinesGrid {...props} rows={[line, { ...second, quantity: 4 }]} />);
		expect(screen.getByText(t.common.noResults)).toBeOnTheScreen();
		expect(onDelete).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: t.common.clearAllFilters }));
		expect(screen.getAllByTestId(/document-line-/)).toHaveLength(2);
		expect(within(screen.getByTestId('document-line-8')).getByLabelText(t.documentForm.colQuantite)).toHaveProp(
			'value',
			'4,00',
		);
	});
});
