import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ActivityIndicator, Text } from 'react-native';
import ActionModals from './actionModals';

const cancel = jest.fn();
const confirm = jest.fn();
const actions = [
	{ text: 'Cancel', active: false, onClick: cancel },
	{ text: 'Confirm', active: true, onClick: confirm },
];
beforeEach(() => jest.clearAllMocks());

describe('ActionModals', () => {
	it('preserves the original title, body, arbitrary actions, icons and children contract', async () => {
		const third = jest.fn();
		await render(
			<ActionModals
				title="Delete Item"
				body="Are you sure?"
				titleIcon={<Text>Warning icon</Text>}
				titleIconColor="#fef2f2"
				actions={[...actions, { text: 'Review', active: false, onClick: third, icon: <Text>Review icon</Text> }]}
			>
				<Text>Extra Content</Text>
			</ActionModals>,
		);
		expect(screen.getByRole('header', { name: 'Delete Item' })).toBeOnTheScreen();
		expect(screen.getByText('Are you sure?')).toBeOnTheScreen();
		expect(screen.getByText('Warning icon')).toBeOnTheScreen();
		expect(screen.getByText('Extra Content')).toBeOnTheScreen();
		expect(within(screen.getByRole('button', { name: 'Review' })).getByText('Review icon')).toBeOnTheScreen();
		expect(confirm).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
		await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
		await fireEvent.press(screen.getByRole('button', { name: 'Review' }));
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(confirm).toHaveBeenCalledTimes(1);
		expect(third).toHaveBeenCalledTimes(1);
	});

	it('dismisses via backdrop or native back using explicit onClose before the cancel fallback', async () => {
		const onClose = jest.fn();
		await render(<ActionModals title="Confirm" actions={actions} onClose={onClose} />);
		await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
			'requestClose',
		);
		expect(onClose).toHaveBeenCalledTimes(2);
		expect(cancel).not.toHaveBeenCalled();
		expect(confirm).not.toHaveBeenCalled();
	});

	it('uses the original non-active action fallback when dismissed without onClose', async () => {
		await render(<ActionModals title="Confirm" actions={actions} />);
		await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
			'requestClose',
		);
		expect(cancel).toHaveBeenCalledTimes(2);
		expect(confirm).not.toHaveBeenCalled();
	});

	it('does not invoke a disabled cancel action through dismissal shortcuts', async () => {
		const review = jest.fn();
		const view = await render(
			<ActionModals
				title="Pending"
				actions={[
					...actions.map((action) => ({ ...action, disabled: true })),
					{ text: 'Review', active: false, onClick: review },
				]}
			/>,
		);
		await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
			'requestClose',
		);
		await fireEvent(screen.getByTestId('action-modal'), 'accessibilityEscape');
		expect(cancel).not.toHaveBeenCalled();
		expect(confirm).not.toHaveBeenCalled();
		expect(review).not.toHaveBeenCalled();
		await view.rerender(<ActionModals title="Pending" actions={actions} />);
		await fireEvent(screen.getByTestId('action-modal'), 'accessibilityEscape');
		expect(cancel).toHaveBeenCalledTimes(1);
	});

	it('disables action buttons while preserving the original onClose dismissal handler', async () => {
		const onClose = jest.fn();
		await render(
			<ActionModals
				title="Pending"
				onClose={onClose}
				actions={actions.map((action) => ({
					...action,
					disabled: true,
					icon: action.active ? <ActivityIndicator testID="pending-spinner" /> : undefined,
				}))}
			/>,
		);
		expect(screen.getByTestId('pending-spinner')).toBeOnTheScreen();
		for (const name of ['Cancel', 'Confirm']) {
			expect(screen.getByRole('button', { name })).toBeDisabled();
			await fireEvent.press(screen.getByRole('button', { name }));
		}
		await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
		await fireEvent(
			screen.container.queryAll((node) => typeof node.props.onRequestClose === 'function')[0]!,
			'requestClose',
		);
		expect(cancel).not.toHaveBeenCalled();
		expect(confirm).not.toHaveBeenCalled();
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('keeps a backend error visible in children and allows retry after pending actions are enabled again', async () => {
		const { rerender } = await render(
			<ActionModals title="Delete" actions={actions.map((action) => ({ ...action, disabled: true }))} />,
		);
		await rerender(
			<ActionModals title="Delete" actions={actions}>
				<Text accessibilityRole="alert">Protected by existing documents</Text>
			</ActionModals>,
		);
		expect(screen.getByRole('alert')).toHaveTextContent('Protected by existing documents');
		expect(screen.getByRole('button', { name: 'Confirm' })).not.toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
		expect(confirm).toHaveBeenCalledTimes(1);
	});

	it('honors native width limits and fullWidth rather than accepting inert web sizing props', async () => {
		const { rerender } = await render(<ActionModals title="Narrow" actions={actions} maxWidth="xs" fullWidth />);
		expect(screen.getByTestId('action-modal')).toHaveStyle({ maxWidth: 444, width: '100%' });
		await rerender(<ActionModals title="Wide" actions={actions} maxWidth="lg" />);
		expect(screen.getByTestId('action-modal')).toHaveStyle({ maxWidth: 1200, width: '92%' });
		await rerender(<ActionModals title="Unlimited" actions={actions} maxWidth={false} fullWidth />);
		expect(screen.getByTestId('action-modal')).toHaveStyle({ width: '100%' });
		expect(screen.getByTestId('action-modal').props.style.maxWidth).toBeUndefined();
	});

	describe('ActionModals', () => {
		const mockAction1 = jest.fn();
		const mockAction2 = jest.fn();

		const actions = [
			{ text: 'Cancel', active: false, onClick: mockAction1 },
			{ text: 'Confirm', active: true, onClick: mockAction2 },
		];

		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('renders modal with title and body', async () => {
			await render(<ActionModals title="Delete Item" body="Are you sure?" actions={actions} />);
			expect(screen.getByText('Delete Item')).toBeOnTheScreen();
			expect(screen.getByText('Are you sure?')).toBeOnTheScreen();
		});

		it('renders all action buttons with correct labels', async () => {
			await render(<ActionModals title="Confirm" actions={actions} />);
			expect(screen.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
			expect(screen.getByRole('button', { name: 'Confirm' })).toBeOnTheScreen();
		});

		it('calls correct action handlers on button clicks', async () => {
			await render(<ActionModals title="Confirm" actions={actions} />);
			await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
			await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
			expect(mockAction1).toHaveBeenCalled();
			expect(mockAction2).toHaveBeenCalled();
		});

		it('renders children inside content area', async () => {
			await render(
				<ActionModals title="With Children" actions={actions}>
					<Text>Extra Content</Text>
				</ActionModals>,
			);
			expect(screen.getByText('Extra Content')).toBeOnTheScreen();
		});
	});
});
