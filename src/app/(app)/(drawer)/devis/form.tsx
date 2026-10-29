import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import {
	useAddDeviMutation,
	useEditDeviMutation,
	useGetDeviQuery,
	useGetNumDevisQuery,
	usePatchStatutMutation,
} from '@/store/services/devi';
import { parseEntityId } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import CompanyDocumentFormContent from '@/components/shared/company-documents-form/companyDocumentFormContent';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import type { SearchParams } from '@/types/_initTypes';

type LocalSearchParams = SearchParams & { scrollToLines?: string };

const DevisFormPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompanyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const token = useInitAccessToken();
	const [addData, adding] = useAddDeviMutation();
	const [updateData, editing] = useEditDeviMutation();
	const [patchStatut, patching] = usePatchStatutMutation();
	const { t } = useLanguage();
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const invalidParams = id === null || requestedCompanyId === null;
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalidParams });
	const quoteQuery = useGetDeviQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalidParams || id === undefined, refetchOnMountOrArgChange: true },
	);
	const eligibleCompanies = (companiesQuery.currentData ?? []).filter(
		(company) => company.role === 'Caissier' || company.role === 'Commercial',
	);
	// Verify edit permissions against the API's company, never a caller's URL alone.
	const companyId =
		id !== undefined
			? quoteQuery.currentData?.company
			: (requestedCompanyId ?? selectedCompanyId ?? eligibleCompanies[0]?.id);
	const company = eligibleCompanies.find((item) => item.id === companyId);
	const companyQuery = useGetCompanyQuery({ id: company?.id ?? 0 }, { skip: !token || !company || invalidParams });
	const numberQuery = useGetNumDevisQuery(
		{ company_id: company?.id ?? 0 },
		{ skip: !token || !company || invalidParams || id !== undefined, refetchOnMountOrArgChange: true },
	);
	if (invalidParams) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return <QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />;
	if (id !== undefined && !quoteQuery.currentData)
		return quoteQuery.isError ? (
			<QueryError error={quoteQuery.error} onRetry={() => void quoteQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (!company || (requestedCompanyId !== undefined && requestedCompanyId !== company.id)) return <NoPermission />;
	if (!companyQuery.currentData)
		return companyQuery.isError ? (
			<QueryError error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
		) : (
			<ApiProgress />
		);
	if (id === undefined && (numberQuery.isLoading || numberQuery.isUninitialized)) return <ApiProgress />;
	return (
		<CompanyDocumentFormContent
			documentType="devis"
			addData={addData}
			updateData={updateData}
			patchStatut={patchStatut}
			mutationLoading={adding.isLoading || editing.isLoading || patching.isLoading}
			key={`${company.id}:${id ?? 'new'}`}
			id={id}
			company={companyQuery.currentData}
			role={company.role}
			canChangeStatus={!!company.can_change_document_status}
			rawData={quoteQuery.currentData}
			initialNumber={quoteQuery.currentData?.numero_devis ?? numberQuery.currentData?.numero_devis ?? ''}
			numberQuery={numberQuery}
			scrollToLines={params.scrollToLines === 'true'}
			companySelect={
				id === undefined && requestedCompanyId === undefined
					? (disabled) => (
							<CustomAutoCompleteSelect
								label={t.shared.selectCompany}
								items={eligibleCompanies.map((item) => ({ code: item.raison_sociale, value: String(item.id) }))}
								value={{ code: company.raison_sociale, value: String(company.id) }}
								noOptionsText={t.shared.noCompaniesFound}
								disabled={disabled}
								onChange={(_event, value) => {
									if (value) setSelectedCompanyId(Number(value.value));
								}}
								startIcon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
							/>
						)
					: undefined
			}
		/>
	);
};

export default DevisFormPage;
