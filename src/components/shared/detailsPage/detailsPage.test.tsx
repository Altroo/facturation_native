import { Platform, Text } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import DetailsPage from './detailsPage';

// The SDK preset replaces the native refresh view with an empty mock. Keep its
// props at this boundary so this test can exercise our controlled refresh flow.
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => ({
	__esModule: true,
	default: 'RefreshControl',
}));

afterEach(() => jest.restoreAllMocks());

it.each(['ios', 'android'] as const)(
	'keeps every section in the same scroll and calls the refresh request on %s',
	async (platform) => {
		jest.replaceProperty(Platform, 'OS', platform);
		const refresh = jest.fn();
		await render(
			<DetailsPage onRefresh={refresh} refreshing>
				<Text>Identity</Text>
				<Text>History</Text>
			</DetailsPage>,
		);
		expect(screen.getByText('Identity')).toBeOnTheScreen();
		expect(screen.getByText('History')).toBeOnTheScreen();
		const control = screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')[0]!;
		expect(control.props.refreshing).toBe(true);
		await fireEvent(control, 'refresh');
		expect(refresh).toHaveBeenCalledTimes(1);
	},
);

it('works for error screens without installing an unusable refresh control', async () => {
	await render(
		<DetailsPage>
			<Text>Retry</Text>
		</DetailsPage>,
	);
	expect(screen.getByText('Retry')).toBeOnTheScreen();
	expect(screen.queryByTestId('page-action-bar')).toBeNull();
	expect(screen.container.queryAll((node) => typeof node.props.onRefresh === 'function')).toHaveLength(0);
});

it('keeps the fixed actions outside the scroll containing the final section', async () => {
	await render(
		<DetailsPage actions={<Text>Edit client</Text>}>
			<Text>Final section</Text>
		</DetailsPage>,
	);
	const content = within(screen.getByTestId('details-page'));
	expect(content.getByText('Final section')).toBeOnTheScreen();
	expect(content.queryByText('Edit client')).toBeNull();
	expect(within(screen.getByTestId('page-action-bar')).getByText('Edit client')).toBeOnTheScreen();
});
