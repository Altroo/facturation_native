import { render, screen } from '@testing-library/react-native';
import ArticlesListPage from '@/app/(app)/(drawer)/articles/index';

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

describe('ArticlesListPage', () => {
	it('opens the shared list in active mode', async () => {
		await render(<ArticlesListPage />);
		expect(screen.getByText('Active articles')).toBeOnTheScreen();
		expect(screen.queryByText('Archived articles')).toBeNull();
	});
});
