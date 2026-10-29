import { render, screen } from '@testing-library/react-native';
import ArticlesArchivedPage from '@/app/(app)/(drawer)/articles/archived';

jest.mock('@/store/services/article', () => ({
	usePatchArchiveMutation: () => [jest.fn()],
	useBulkArchiveArticlesMutation: () => [jest.fn()],
}));

jest.mock('@/components/shared/articlesList/articlesList', () => {
	const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return function List(props: { archived: boolean }) {
		return <Text>{props.archived ? 'Archived articles' : 'Active articles'}</Text>;
	};
});

describe('ArticlesArchivedPage', () => {
	it('opens the shared list in archived mode', async () => {
		await render(<ArticlesArchivedPage />);
		expect(screen.getByText('Archived articles')).toBeOnTheScreen();
		expect(screen.queryByText('Active articles')).toBeNull();
	});
});
