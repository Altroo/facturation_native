import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useGetFactureProFormaQuery, useDeleteFactureProFormaMutation } from '@/store/services/factureProForma';
import { openFactureProFormaPdf } from '@/utils/apiHelpers';
import { parseEntityId } from '@/utils/helpers';
import CompanyDocumentViewContent from '@/components/shared/company-documents-view/companyDocumentsWrapperView';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	id: number;
	company_id: number;
};

const FactureProFormaViewContent = (props: Props) => {
	const token = useInitAccessToken();
	const company = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const query = useGetFactureProFormaQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	const [deleteRecord, mutation] = useDeleteFactureProFormaMutation();
	return (
		<CompanyDocumentViewContent
			{...props}
			documentType="facture-pro-forma"
			query={query}
			deleteRecord={deleteRecord}
			deleting={mutation.isLoading}
			openPdf={(type, language) => openFactureProFormaPdf(props.id, props.company_id, type, language)}
		/>
	);
};

const FactureProFormaViewPage = () => {
	const params = useLocalSearchParams<SearchParams>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <FactureProFormaViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default FactureProFormaViewPage;
