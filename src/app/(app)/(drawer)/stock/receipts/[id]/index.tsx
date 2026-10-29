import { useLocalSearchParams } from 'expo-router';
import { parseEntityId } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import StockFormWrapper from '@/components/shared/stock/stockFormWrapper';
import StockSessionView from '@/components/shared/stock/stockSessionView';
import type { SearchParams } from '@/types/_initTypes';

const StockReceiptPage = () => {
	const params = useLocalSearchParams<SearchParams>();
	const { t } = useLanguage();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<StockFormWrapper company_id={company_id} requireStock={false}>
			{({ company, role }) => (
				<StockSessionView
					key={`${company_id}:${id}`}
					id={id}
					company_id={company_id}
					company={company}
					role={role}
					kind="receipt"
				/>
			)}
		</StockFormWrapper>
	);
};

export default StockReceiptPage;
