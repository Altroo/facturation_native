import { fireEvent, render, screen } from '@testing-library/react-native';
import ChangelogPage from '@/app/(app)/(drawer)/changelog';
import { useGetChangelogQuery } from '@/store/services/changelog';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');
jest.mock('@/providers/themeProvider', () => ({ useColorMode: () => ({ mode: 'light' }) }));
jest.mock('@/components/shared/bottomNavigation/bottomNavigation', () => () => null);
jest.mock('@/store/services/changelog', () => ({ useGetChangelogQuery: jest.fn() }));
const mockSession = { access: 'test-access' as string | null };
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({
		language: 'fr',
		t: jest.requireActual<typeof import('@/translations')>('@/translations').translations.fr,
	}),
	useAppSelector: () => mockSession.access,
}));

const t = translations.fr;
const query = jest.mocked(useGetChangelogQuery);
const refetch = jest.fn();
beforeEach(() => {
	jest.clearAllMocks();
	mockSession.access = 'test-access';
	query.mockReturnValue({ data: [], isLoading: false, isFetching: false, isError: false, refetch } as ReturnType<
		typeof useGetChangelogQuery
	>);
});

describe('ChangelogPage', () => {
	it('waits for authentication without starting a private request or showing a false empty state', async () => {
		mockSession.access = null;
		await render(<ChangelogPage />);
		expect(query).toHaveBeenCalledWith(undefined, { skip: true, refetchOnMountOrArgChange: true });
		expect(screen.getByText(t.changelog.loading)).toBeOnTheScreen();
		expect(screen.queryByText(t.changelog.empty)).toBeNull();
	});

	it('shows the shared empty state when no mobile releases have been published', async () => {
		await render(<ChangelogPage />);
		expect(screen.getByText(t.changelog.empty)).toBeOnTheScreen();
	});

	it('shows loading while the first request is pending', async () => {
		query.mockReturnValue({ isLoading: true, isFetching: true, refetch } as ReturnType<typeof useGetChangelogQuery>);
		await render(<ChangelogPage />);
		expect(screen.getByText(t.changelog.loading)).toBeOnTheScreen();
		expect(screen.queryByText(t.changelog.empty)).toBeNull();
	});

	it('offers retry on failure without showing an empty result', async () => {
		query.mockReturnValue({ isError: true, refetch } as ReturnType<typeof useGetChangelogQuery>);
		await render(<ChangelogPage />);
		expect(screen.getByRole('alert')).toHaveTextContent(t.changelog.error);
		await fireEvent.press(screen.getByRole('button', { name: t.common.retry }));
		expect(refetch).toHaveBeenCalledTimes(1);
		expect(screen.queryByText(t.changelog.empty)).toBeNull();
	});

	it('keeps downloaded history visible when refreshing fails', async () => {
		query.mockReturnValue({
			data: [
				{
					id: 1,
					date: '2026-10-26',
					version: '',
					platform: 'both',
					title_fr: 'Nouveauté partagée',
					title_en: 'Shared update',
					changes_fr: ['Nouvelle fonction'],
					changes_en: ['New feature'],
				},
			],
			isError: true,
			isFetching: false,
			refetch,
		} as ReturnType<typeof useGetChangelogQuery>);
		await render(<ChangelogPage />);
		expect(screen.getByText('Nouveauté partagée')).toBeOnTheScreen();
		expect(screen.getByRole('alert')).toHaveTextContent(t.changelog.error);
	});
});
