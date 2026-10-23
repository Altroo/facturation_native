import { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import {
	useAddFactureProFormaMutation,
	useEditFactureProFormaMutation,
	useGetFactureProFormaQuery,
	useGetNumFactureProFormaQuery,
	usePatchStatutMutation,
} from '@/store/services/factureProForma';
import { parseEntityId } from '@/utils/helpers';
import { colors } from '@/utils/themes';
import CompanyDocumentFormContent from '@/components/shared/company-documents-form/companyDocumentFormContent';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

const FactureProFormaFormPage = () => {
	const params = useLocalSearchParams<{
		id?: string | string[];
		company_id?: string | string[];
		scrollToLines?: string;
	}>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompanyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const token = useInitAccessToken();
	const [addData, adding] = useAddFactureProFormaMutation();
	const [updateData, editing] = useEditFactureProFormaMutation();
	const [patchStatut, patching] = usePatchStatutMutation();
	const { t } = useLanguage();
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const invalidParams = id === null || requestedCompanyId === null;
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalidParams });
	const documentQuery = useGetFactureProFormaQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalidParams || id === undefined, refetchOnMountOrArgChange: true },
	);
	const eligibleCompanies = (companiesQuery.currentData ?? []).filter(
		(company) => company.role === 'Caissier' || company.role === 'Commercial',
	);
	// Verify edit permissions against the API's company, never a caller's URL alone.
	const companyId =
		id !== undefined
			? documentQuery.currentData?.company
			: (requestedCompanyId ?? selectedCompanyId ?? eligibleCompanies[0]?.id);
	const company = eligibleCompanies.find((item) => item.id === companyId);
	const companyQuery = useGetCompanyQuery({ id: company?.id ?? 0 }, { skip: !token || !company || invalidParams });
	const numberQuery = useGetNumFactureProFormaQuery(
		{ company_id: company?.id ?? 0 },
		{ skip: !token || !company || invalidParams || id !== undefined, refetchOnMountOrArgChange: true },
	);
	if (invalidParams) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return <QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />;
	if (id !== undefined && !documentQuery.currentData)
		return documentQuery.isError ? (
			<QueryError error={documentQuery.error} onRetry={() => void documentQuery.refetch()} />
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
			documentType="facture-pro-forma"
			addData={addData}
			updateData={updateData}
			patchStatut={patchStatut}
			mutationLoading={adding.isLoading || editing.isLoading || patching.isLoading}
			key={`${company.id}:${id ?? 'new'}`}
			id={id}
			company={companyQuery.currentData}
			role={company.role}
			canChangeStatus={!!company.can_change_document_status}
			rawData={documentQuery.currentData}
			initialNumber={documentQuery.currentData?.numero_facture ?? numberQuery.currentData?.numero_facture ?? ''}
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

export default FactureProFormaFormPage;
