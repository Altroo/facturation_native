import { useRef } from 'react';
import type { LogistiqueSupplier } from '@/types/logistiqueTypes';
import { useDeleteLogistiqueSupplierMutation } from '@/store/services/logistique';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import { useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage } from '@/utils/helpers';

type Props = {
	supplier: LogistiqueSupplier;
	onClose: () => void;
	onDeleted?: () => void;
};

const LogistiqueSupplierDeleteDialog = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [deleteSupplier, mutation] = useDeleteLogistiqueSupplierMutation();
	const pending = useRef(false);
	const linked = props.supplier.total_dossiers > 0;
	const confirm = async () => {
		if (linked || pending.current) return;
		pending.current = true;
		try {
			await deleteSupplier({ id: props.supplier.id, company_id: props.supplier.company }).unwrap();
			onSuccess(t.logistique.supplierDeleted);
			props.onClose();
			props.onDeleted?.();
		} catch (error) {
			onError(extractApiErrorMessage(error, t.logistique.supplierDeleteError));
		} finally {
			pending.current = false;
		}
	};
	return (
		<ConfirmationModal
			title={t.logistique.supplierDeleteTitle}
			body={linked ? t.logistique.supplierInUse : t.logistique.supplierDeleteBody}
			recordName={props.supplier.nom}
			confirmText={t.common.delete}
			confirmDisabled={linked}
			loading={mutation.isLoading}
			onClose={() => {
				if (!pending.current) props.onClose();
			}}
			onConfirm={() => void confirm()}
		/>
	);
};

export default LogistiqueSupplierDeleteDialog;
