import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useGetBonDeLivraisonQuery, useDeleteBonDeLivraisonMutation } from '@/store/services/bonDeLivraison';
import { openBonDeLivraisonPdf } from '@/utils/apiHelpers';
import { parseEntityId } from '@/utils/helpers';
import CompanyDocumentViewContent from '@/components/shared/company-documents-view/companyDocumentsWrapperView';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';

type Props = { id: number; company_id: number };
const BonDeLivraisonViewContent = (props: Props) => {
	const token = useInitAccessToken();
	const company = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const query = useGetBonDeLivraisonQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	const [deleteRecord, mutation] = useDeleteBonDeLivraisonMutation();
	return (
		<CompanyDocumentViewContent
			{...props}
			documentType="bon-de-livraison"
			query={query}
			deleteRecord={deleteRecord}
			deleting={mutation.isLoading}
			openPdf={(type, language) => openBonDeLivraisonPdf(props.id, props.company_id, type, language)}
		/>
	);
};

const BonDeLivraisonViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <BonDeLivraisonViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default BonDeLivraisonViewPage;
