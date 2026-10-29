import { fireEvent, render, screen } from '@testing-library/react-native';
import ListFooter from './listFooter';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
}));
const t = translations.fr;

describe('ListFooter', () => {
	it('reuses the next-page hint and end-of-list marker', async () => {
		await render(<ListFooter rowsCount={2} hasNextPage />);
		expect(screen.getByText(t.dataGrid.scrollForMore)).toBeOnTheScreen();
		await screen.rerender(<ListFooter rowsCount={2} />);
		expect(screen.getByText(t.dataGrid.endOfList)).toBeOnTheScreen();
		await screen.rerender(<ListFooter rowsCount={0} />);
		expect(screen.queryByText(t.dataGrid.endOfList)).toBeNull();
	});

	it('shows loading and supports retrying a failed next page', async () => {
		const retry = jest.fn();
		await render(<ListFooter rowsCount={2} loading />);
		expect(screen.getByText(t.dataGrid.loadingMore)).toBeOnTheScreen();
		await screen.rerender(<ListFooter rowsCount={2} error onRetry={retry} />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(retry).toHaveBeenCalledTimes(1);
	});
});
