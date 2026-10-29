import { render, screen } from '@testing-library/react-native';
import ClientsListPage from '@/app/(app)/(drawer)/clients/index';

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

describe('ClientsListPage', () => {
	it('opens the shared list in active mode', async () => {
		await render(<ClientsListPage />);
		expect(screen.getByText('Active clients')).toBeOnTheScreen();
		expect(screen.queryByText('Archived clients')).toBeNull();
	});
});
