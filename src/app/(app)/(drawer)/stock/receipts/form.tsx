import { useLocalSearchParams } from 'expo-router';
import { parseEntityId } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockFormContent from '@/components/shared/stock/stockFormContent';

const StockReceiptFormPage = () => {
	const params = useLocalSearchParams<{ company_id?: string | string[] }>();
	const { t } = useLanguage();
	const companyId = parseEntityId(params.company_id);
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={companyId} allowedRoles={['Logistique']}>
			{() => <StockFormContent key={companyId} company_id={companyId} kind="receipt" />}
		</StockFormWrapper>
	);
};

export default StockReceiptFormPage;
