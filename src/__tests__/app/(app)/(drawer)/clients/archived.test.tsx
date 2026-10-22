import { render, screen } from '@testing-library/react-native';
import ClientsArchivedPage from '@/app/(app)/(drawer)/clients/archived';

jest.mock('@/store/services/client', () => ({
	usePatchArchiveMutation: () => [jest.fn()],
	useBulkArchiveClientsMutation: () => [jest.fn()],
}));

jest.mock('@/components/shared/clientsList/clientsList', () => {
	const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
	return function List(props: { archived: boolean }) {
		return <Text>{props.archived ? 'Archived clients' : 'Active clients'}</Text>;
	};
});

it('opens the shared list in archived mode', async () => {
	await render(<ClientsArchivedPage />);
	expect(screen.getByText('Archived clients')).toBeOnTheScreen();
	expect(screen.queryByText('Active clients')).toBeNull();
});
