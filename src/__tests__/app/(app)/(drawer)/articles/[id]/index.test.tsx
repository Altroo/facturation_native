import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import ArticlesViewPage from '@/app/(app)/(drawer)/articles/[id]/index';
import { useGetArticleQuery } from '@/store/services/article';
import { createQueryMock } from '@/__tests__/setupQuery';
import { translations } from '@/translations';
import { NECTAR_RAISON_SOCIALE } from '@/utils/rawData';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock(
	'react-native-safe-area-context',
	() => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
jest.mock('expo-router', () => ({
	useLocalSearchParams: () => mockParams,
	router: { push: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: () => 'access' }));
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'dark' }) }));
jest.mock('@/utils/hooks', () => ({
	useAppSelector: () => [{ id: 5, role: mockRole, raison_sociale: mockCompanyName }],
	useLanguage: () => ({ t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
jest.mock('@/store/services/article', () => ({
	useGetArticleQuery: jest.fn(() => mockQuery.useResult()),
	useDeleteArticleMutation: () => [mockRemove, {}],
}));

let mockParams: { id?: string | string[]; company_id?: string };
let mockRole: string;
let mockCompanyName: string;
const mockRemove = jest.fn();
const refetch = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockQuery = createQueryMock<ReturnType<typeof useGetArticleQuery>>({} as never);
const t = translations.fr;
const article = {
	id: 7,
	company: 5,
	reference: 'ART007',
	designation: 'Article Atlas',
	type_article: 'Produit',
	prix_achat: 50,
	prix_vente: 100,
	devise_prix_achat: 'MAD',
	devise_prix_vente: 'EUR',
	tva: 20,
	categorie_name: 'Matériel',
	emplacement_name: 'Dépôt A',
	unite_name: 'Pièce',
	marque_name: 'Atlas',
	stock_management_enabled: true,
	stock_minimum: 5,
	physical_quantity: 12,
	reserved_quantity: 2,
	available_quantity: 10,
	incoming_quantity: 4,
	date_created: '2026-10-01',
	date_updated: '2026-10-02',
	remarque: 'Fragile',
};
beforeEach(async () => {
	jest.clearAllMocks();
	mockParams = { id: '7', company_id: '5' };
	mockRole = 'Caissier';
	mockCompanyName = 'Atlas';
	mockRemove.mockReturnValue({ unwrap: () => Promise.resolve() });
	await mockQuery.setResult({ currentData: article, refetch } as never);
});

describe('ArticlesViewPage', () => {
	it('shows the article, classification and stock using shared compact sections and fixed actions', async () => {
		await render(<ArticlesViewPage />);
		expect(screen.getByText('ART007')).toBeOnTheScreen();
		for (const value of ['Matériel', 'Dépôt A', 'Pièce', 'Fragile', '50,00 MAD', '100,00 EUR'])
			expect(screen.getByText(value)).toBeOnTheScreen();
		expect(screen.getByRole('header', { name: t.articles.stockSection })).toBeOnTheScreen();
		expect(within(screen.getByTestId('details-page')).queryByRole('button', { name: t.common.edit })).toBeNull();
		expect(
			within(screen.getByTestId('details-page-actions')).getByRole('button', { name: t.common.edit }),
		).toBeOnTheScreen();
		await fireEvent.press(screen.getByRole('button', { name: t.common.edit }));
		expect(router.push).toHaveBeenCalledWith({ pathname: '/articles/form', params: { id: '7', company_id: '5' } });
	});

	it.each(['Lecture', 'Comptable'])('shows details without write actions for %s', async (role) => {
		mockRole = role;
		await render(<ArticlesViewPage />);
		expect(screen.getByText('ART007')).toBeOnTheScreen();
		expect(screen.queryByRole('button', { name: t.common.edit })).toBeNull();
		expect(screen.queryByRole('button', { name: t.common.delete })).toBeNull();
	});

	it('hides stock for a service and never creates a decorative photo', async () => {
		await mockQuery.setResult({ currentData: { ...article, type_article: 'Service' } } as never);
		await render(<ArticlesViewPage />);
		expect(screen.queryByRole('header', { name: t.articles.stockSection })).toBeNull();
		expect(screen.queryByRole('header', { name: t.articles.photoSection })).toBeNull();
	});

	it('shows Nectar HT/TTC prices and hides purchase prices', async () => {
		mockCompanyName = NECTAR_RAISON_SOCIALE;
		await render(<ArticlesViewPage />);
		expect(screen.queryByText(t.articles.colPrixAchat)).toBeNull();
		expect(screen.getByText('100,00 EUR')).toBeOnTheScreen();
		expect(screen.getByText('120,00 EUR')).toBeOnTheScreen();
	});

	it('confirms deletion and returns to the article list only after a successful request', async () => {
		await render(<ArticlesViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		expect(mockRemove).not.toHaveBeenCalled();
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(mockRemove).toHaveBeenCalledWith({ id: 7 }));
		expect(mockSuccess).toHaveBeenCalledWith(t.articles.deleteSuccess);
		expect(router.dismissTo).toHaveBeenCalledWith('/articles');
	});

	it('keeps the article visible on a failed deletion and reports the error', async () => {
		mockRemove.mockReturnValue({ unwrap: () => Promise.reject({ message: 'Article utilisé' }) });
		await render(<ArticlesViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.delete }));
		await fireEvent.press(within(screen.getByTestId('action-modal')).getByRole('button', { name: t.common.delete }));
		await waitFor(() => expect(mockError).toHaveBeenCalled());
		expect(router.dismissTo).not.toHaveBeenCalled();
		expect(screen.getByText('ART007')).toBeOnTheScreen();
	});

	it('does not reveal details when the article belongs to a different company', async () => {
		await mockQuery.setResult({ currentData: { ...article, company: 11 } } as never);
		await render(<ArticlesViewPage />);
		expect(screen.getByRole('header', { name: t.noPermission.title })).toBeOnTheScreen();
		expect(screen.queryByText('Article Atlas')).toBeNull();
	});

	it('retries an unsuccessful initial request', async () => {
		await mockQuery.setResult({
			isError: true,
			error: { status: 503, data: { message: 'Offline' } },
			refetch,
		} as never);
		await render(<ArticlesViewPage />);
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it('rejects array route parameters before querying', async () => {
		mockParams.id = ['7', '8'];
		await render(<ArticlesViewPage />);
		expect(screen.getByText(t.notFound.message)).toBeOnTheScreen();
		expect(useGetArticleQuery).not.toHaveBeenCalled();
	});
});
