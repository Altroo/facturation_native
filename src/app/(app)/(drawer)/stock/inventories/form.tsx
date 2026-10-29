import { useLocalSearchParams } from 'expo-router';
import { parseEntityId } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockFormContent from '@/components/shared/stock/stockFormContent';
import type { SearchParams } from '@/types/_initTypes';

type LocalSearchParams = Omit<SearchParams, 'id'>;

const StockInventoryFormPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const { t } = useLanguage();
	const companyId = parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={companyId} allowedRoles={['Caissier']} requireInventory>
			{() => <StockFormContent key={companyId} company_id={companyId} kind="inventory" />}
		</StockFormWrapper>
	);
};

export default StockInventoryFormPage;
