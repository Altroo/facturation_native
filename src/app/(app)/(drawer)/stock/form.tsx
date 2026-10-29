import { useLocalSearchParams } from 'expo-router';
import { parseEntityId } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockFormContent from '@/components/shared/stock/stockFormContent';
import { SearchParams } from '@/types/_initTypes';

type LocalSearchParams = Omit<SearchParams, 'id'> & { balance_id?: string | string[] };

const StockAdjustmentFormPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const { t } = useLanguage();
	const companyId = parseEntityId(params.company_id);
	const balanceId = params.balance_id === undefined ? undefined : parseEntityId(params.balance_id);
	if (companyId === null || balanceId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={companyId} allowedRoles={['Caissier']}>
			{() => (
				<StockFormContent
					key={`${companyId}:${balanceId ?? 'new'}`}
					company_id={companyId}
					kind="adjustment"
					balance_id={balanceId}
				/>
			)}
		</StockFormWrapper>
	);
};

export default StockAdjustmentFormPage;
