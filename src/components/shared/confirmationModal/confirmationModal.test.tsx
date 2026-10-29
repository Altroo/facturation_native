import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import ConfirmationModal from './confirmationModal';
import { translations } from '@/translations';
import { colors } from '@/utils/themes';

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

describe('ConfirmationModal', () => {
	it.each(['delete', 'suspend', 'archive', 'unarchive', 'convert', 'validate'] as const)(
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
			if (action === 'convert') {
				const icon = screen.container.queryAll((node) => node.props.name === 'receipt-long')[0];
				expect(icon).toHaveProp('color', colors.conversion);
				expect(screen.getByRole('button', { name: 'Proceed' })).toHaveStyle({ backgroundColor: colors.conversion });
			}
			if (action === 'validate') {
				expect(screen.getByRole('button', { name: 'Proceed' })).toHaveStyle({ backgroundColor: colors.conversion });
				expect(screen.container.queryAll((node) => node.props.name === 'check-circle')[0]).toHaveProp(
					'color',
					colors.conversion,
				);
			}
			if (action === 'archive' || action === 'unarchive') {
				const icon = screen.container.queryAll((node) => node.props.name === action)[0];
				expect(icon).toHaveProp('color', colors.warning);
			}
			expect(onConfirm).not.toHaveBeenCalled();
			await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.cancel }));
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(onConfirm).not.toHaveBeenCalled();
			await fireEvent.press(screen.getByRole('button', { name: 'Proceed' }));
			expect(onConfirm).toHaveBeenCalledTimes(1);
		},
	);

	it('can disable deletion while leaving cancel available for linked records', async () => {
		const onConfirm = jest.fn();
		const onClose = jest.fn();
		await render(
			<ConfirmationModal
				title="Delete supplier?"
				body="Supplier has linked dossiers."
				confirmText="Delete"
				onConfirm={onConfirm}
				onClose={onClose}
				confirmDisabled
			/>,
		);
		expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
		await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
		expect(onConfirm).not.toHaveBeenCalled();
		await fireEvent.press(screen.getByRole('button', { name: translations.fr.common.cancel }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

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
});
