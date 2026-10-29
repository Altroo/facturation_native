import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useGetDeviQuery, useDeleteDeviMutation } from '@/store/services/devi';
import { openDevisPdf } from '@/utils/apiHelpers';
import { parseEntityId } from '@/utils/helpers';
import CompanyDocumentViewContent from '@/components/shared/company-documents-view/companyDocumentsWrapperView';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	id: number;
	company_id: number;
};

const DevisViewContent = (props: Props) => {
	const token = useInitAccessToken();
	const company = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const query = useGetDeviQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	const [deleteRecord, mutation] = useDeleteDeviMutation();
	return (
		<CompanyDocumentViewContent
			{...props}
			documentType="devis"
			query={query}
			deleteRecord={deleteRecord}
			deleting={mutation.isLoading}
			openPdf={(type, language) => openDevisPdf(props.id, props.company_id, type, language)}
		/>
	);
};

const DevisViewPage = () => {
	const params = useLocalSearchParams<SearchParams>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <DevisViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default DevisViewPage;
