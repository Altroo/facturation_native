import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import { useLanguage } from '@/utils/hooks';
import type { StockMovementType, StockState } from '@/types/stockTypes';

type Props = {
	kind: 'balance' | 'movement' | 'receipt' | 'inventory';
	value: StockMovementType | StockState | 'draft' | 'validated' | 'cancelled';
};

const StockStatus = (props: Props) => {
	const { t } = useLanguage();
	const labels = {
		opening: t.stock.opening,
		adjustment: t.stock.adjustment,
		receipt: t.stock.receipt,
		delivery: t.stock.delivery,
		inventory: t.stock.inventory,
		reversal: t.stock.reversal,
		disponible: t.stock.availableState,
		minimum: t.stock.minimumState,
		a_approvisionner: t.stock.supplyState,
		draft: t.stock.draft,
		validated: props.kind === 'receipt' ? t.stock.validatedReceipt : t.stock.validated,
		cancelled: props.kind === 'receipt' ? t.stock.cancelledReceipt : t.stock.cancelled,
	};
	const tone = ['validated', 'disponible', 'receipt'].includes(props.value)
		? 'success'
		: ['cancelled', 'a_approvisionner', 'delivery'].includes(props.value)
			? 'danger'
			: ['minimum', 'adjustment'].includes(props.value)
				? 'warning'
				: ['inventory', 'reversal'].includes(props.value)
					? 'info'
					: 'neutral';
	return <CustomBadge label={labels[props.value]} tone={tone} variant="outlined" />;
};

export default StockStatus;
