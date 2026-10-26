import { useRef, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { InventorySession, StockReceipt } from '@/types/stockTypes';
import {
	useCancelStockReceiptMutation,
	useValidateInventoryMutation,
	useValidateStockReceiptMutation,
} from '@/store/services/stock';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage } from '@/utils/helpers';
import { colors } from '@/utils/themes';

type Props = {
	record: StockReceipt | InventorySession;
	company_id: number;
	role: string;
	kind: 'receipt' | 'inventory';
	inventoryEnabled?: boolean;
	presentation?: 'menu' | 'bar';
	disabled?: boolean;
};

// Lists and details share the same guarded actions and compact confirmation.
// Validation posts the original web command; stock changes remain in Django.
const StockSessionActions = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [pendingAction, setPendingAction] = useState<'validate' | 'cancel' | null>(null);
	const pending = useRef(false);
	const [validateReceipt, validatingReceipt] = useValidateStockReceiptMutation();
	const [cancelReceipt, cancellingReceipt] = useCancelStockReceiptMutation();
	const [validateInventory, validatingInventory] = useValidateInventoryMutation();
	const receipt = props.kind === 'receipt';
	const allowed =
		!props.disabled &&
		props.record.company === props.company_id &&
		(receipt ? props.role === 'Logistique' : props.role === 'Caissier' && props.inventoryEnabled);
	const canValidate = allowed && props.record.status === 'draft';
	const canCancel = allowed && receipt && props.record.status === 'validated';
	const loading = validatingReceipt.isLoading || cancellingReceipt.isLoading || validatingInventory.isLoading;
	const confirm = async () => {
		if (!pendingAction || pending.current || (pendingAction === 'validate' ? !canValidate : !canCancel)) return;
		pending.current = true;
		try {
			const args = { company_id: props.company_id, id: props.record.id };
			if (pendingAction === 'cancel') await cancelReceipt(args).unwrap();
			else if (receipt) await validateReceipt(args).unwrap();
			else await validateInventory(args).unwrap();
			onSuccess(
				pendingAction === 'cancel'
					? t.stock.receiptCancelSuccess
					: receipt
						? t.stock.receiptValidateSuccess
						: t.stock.inventoryValidateSuccess,
			);
		} catch (error) {
			onError(
				extractApiErrorMessage(
					error,
					pendingAction === 'cancel'
						? t.stock.receiptCancelError
						: receipt
							? t.stock.receiptValidateError
							: t.stock.inventoryValidateError,
				),
			);
		} finally {
			pending.current = false;
			setPendingAction(null);
		}
	};
	if (!canValidate && !canCancel) return null;
	const actions = [
		...(canValidate
			? [
					{
						label: receipt ? t.stock.validateReceiptTitle : t.stock.validateInventoryTitle,
						onClick: () => setPendingAction('validate'),
						color: colors.conversion,
						icon: <MaterialIcons name="check-circle" size={22} color={colors.conversion} />,
					},
				]
			: []),
		...(canCancel
			? [
					{
						label: t.stock.cancelReceiptTitle,
						onClick: () => setPendingAction('cancel'),
						color: colors.danger,
						destructive: true,
						icon: <MaterialIcons name="cancel" size={22} color={colors.danger} />,
					},
				]
			: []),
	];
	return (
		<>
			{props.presentation === 'bar' ? (
				actions.map((action) => (
					<PrimaryLoadingButton
						key={action.label}
						buttonText={action.label}
						active={!loading}
						loading={loading}
						color={action.color}
						startIcon={action.icon}
						onClick={action.onClick}
					/>
				))
			) : (
				<ListCardActions disabled={loading} extraActions={actions} />
			)}
			{pendingAction && (
				<ConfirmationModal
					title={
						pendingAction === 'cancel'
							? t.stock.cancelReceiptTitle
							: receipt
								? t.stock.validateReceiptTitle
								: t.stock.validateInventoryTitle
					}
					body={
						pendingAction === 'cancel'
							? t.stock.cancelReceiptBody
							: receipt
								? t.stock.validateReceiptBody
								: t.stock.validateInventoryBody
					}
					recordName={props.record.reference || `${receipt ? 'REC' : 'INV'}-${props.record.id}`}
					confirmText={pendingAction === 'cancel' ? t.common.confirm : t.stock.validate}
					action={pendingAction === 'cancel' ? 'delete' : 'validate'}
					loading={loading}
					onClose={() => {
						if (!pending.current) setPendingAction(null);
					}}
					onConfirm={() => void confirm()}
				/>
			)}
		</>
	);
};

export default StockSessionActions;
