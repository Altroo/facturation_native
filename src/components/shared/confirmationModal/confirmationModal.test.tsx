import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import ConfirmationModal from './confirmationModal';
import { translations } from '@/translations';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

it.each(['delete', 'suspend', 'archive'] as const)(
	'only confirms %s after an explicit confirm press',
	async (action) => {
		const onConfirm = jest.fn();
		const onClose = jest.fn();
		await render(
			<ConfirmationModal
				title="Confirm change"
				body="Proceed?"
				recordName="Atlas Services"
				confirmText="Proceed"
				action={action}
				onConfirm={onConfirm}
				onClose={onClose}
			>
				<Text>Selected record</Text>
			</ConfirmationModal>,
		);
		expect(screen.getByText('Selected record')).toBeOnTheScreen();
		expect(screen.getByText('Atlas Services')).toBeOnTheScreen();
		expect(onConfirm).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.cancel }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: 'Proceed' }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	},
);

it('blocks both confirmation and dismissal while pending, then enables them again', async () => {
	const onConfirm = jest.fn();
	const onClose = jest.fn();
	const props = { title: 'Delete record', body: 'Proceed?', confirmText: 'Delete', onConfirm, onClose };
	const { rerender } = await render(<ConfirmationModal {...props} loading />);
	for (const button of screen.getAllByRole('button')) {
		expect(button).toBeDisabled();
		await fireEvent.press(button);
	}
	await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
	await fireEvent(screen.getByTestId('action-modal'), 'accessibilityEscape');
	expect(onClose).not.toHaveBeenCalled();
	expect(onConfirm).not.toHaveBeenCalled();
	expect(screen.getByRole('button', { name: 'Delete' })).toHaveProp('accessibilityState', {
		busy: true,
		disabled: true,
	});
	await rerender(<ConfirmationModal {...props} />);
	await fireEvent.press(screen.getByTestId('action-modal-backdrop', { includeHiddenElements: true }));
	expect(onClose).toHaveBeenCalledTimes(1);
	await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
	expect(onConfirm).toHaveBeenCalledTimes(1);
});
