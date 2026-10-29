import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import {
	useGetFactureClientQuery,
	useDeleteFactureClientMutation,
	usePatchStatutMutation,
} from '@/store/services/factureClient';
import InvoicePaymentsSection from '@/components/shared/facture-client/invoice-payments-section';
import { openFactureClientPdf } from '@/utils/apiHelpers';
import { parseEntityId } from '@/utils/helpers';
import CompanyDocumentViewContent from '@/components/shared/company-documents-view/companyDocumentsWrapperView';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	id: number;
	company_id: number;
};

const FactureClientViewContent = (props: Props) => {
	const token = useInitAccessToken();
	const company = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const query = useGetFactureClientQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	const [deleteRecord, mutation] = useDeleteFactureClientMutation();
	const [patchStatut, validation] = usePatchStatutMutation();
	return (
		<CompanyDocumentViewContent
			{...props}
			documentType="facture-client"
			query={query}
			deleteRecord={deleteRecord}
			deleting={mutation.isLoading}
			validating={validation.isLoading}
			validateRecord={() => patchStatut({ id: props.id, data: { statut: 'Accepté' } }).unwrap()}
			extraSections={
				<InvoicePaymentsSection
					companyId={props.company_id}
					factureClientId={props.id}
					token={token ?? undefined}
					canManagePayments={
						(company?.role === 'Caissier' || company?.role === 'Commercial') && query.currentData?.statut === 'Accepté'
					}
				/>
			}
			openPdf={(type, language) => openFactureClientPdf(props.id, props.company_id, type, language)}
		/>
	);
};

const FactureClientViewPage = () => {
	const params = useLocalSearchParams<SearchParams>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <FactureClientViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default FactureClientViewPage;
