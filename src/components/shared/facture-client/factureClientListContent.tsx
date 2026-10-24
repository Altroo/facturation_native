import type { ComponentProps } from 'react';
import CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import CompanyDocumentStats from '@/components/shared/company-documents-list/companyDocumentStats';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import type { FactureClientListResponseType } from '@/types/companyDocumentsTypes';

type Props = Omit<ComponentProps<typeof CompanyDocumentsListContent>, 'documentType' | 'header'> & {
	usesForeignCurrency: boolean;
	statsByCurrency?: FactureClientListResponseType['stats_by_currency'];
	companyError?: unknown;
	onRetryCompany: () => void;
};

// Pages own their endpoints, filters and actions. This parent keeps only the
// invoice presentation shared by the regular and unpaid lists.
const FactureClientListContent = (props: Props) => {
	const { usesForeignCurrency, statsByCurrency, companyError, onRetryCompany, ...listProps } = props;
	const { t } = useLanguage();
	const statistics: ComponentProps<typeof CompanyDocumentStats>['statistics'] = [
		{
			label: t.facturesClient.statsCA,
			field: 'chiffre_affaire_total',
			icon: 'account-balance-wallet',
			color: colors.brand,
		},
		{
			label: t.facturesClient.statsReglements,
			field: 'total_reglements',
			icon: 'check-circle-outline',
			color: colors.success,
		},
		{
			label: t.facturesClient.statsImpayes,
			field: 'total_impayes',
			icon: 'pending-actions',
			color: colors.danger,
		},
	];
	return (
		<CompanyDocumentsListContent
			{...listProps}
			documentType="facture-client"
			header={
				<CompanyDocumentStats
					usesForeignCurrency={usesForeignCurrency}
					statsByCurrency={statsByCurrency}
					statistics={statistics}
					error={companyError}
					onRetry={onRetryCompany}
				/>
			}
		/>
	);
};

export default FactureClientListContent;
