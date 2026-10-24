import { useState, type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CompanyDocumentsListContent from '@/components/shared/company-documents-list/companyDocumentsListContent';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import QueryError from '@/components/shared/queryError/queryError';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
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
	const [currency, setCurrency] = useState<'MAD' | 'EUR' | 'USD'>('MAD');
	const selectedCurrency = usesForeignCurrency ? currency : 'MAD';
	// Django's company-wide totals do not depend on the currently loaded page.
	const stats = statsByCurrency?.[selectedCurrency];
	const statistics = [
		{
			label: t.facturesClient.statsCA,
			value: stats?.chiffre_affaire_total,
			icon: 'account-balance-wallet',
			color: colors.brand,
		},
		{
			label: t.facturesClient.statsReglements,
			value: stats?.total_reglements,
			icon: 'check-circle-outline',
			color: colors.success,
		},
		{
			label: t.facturesClient.statsImpayes,
			value: stats?.total_impayes,
			icon: 'pending-actions',
			color: colors.danger,
		},
	] as const;
	return (
		<CompanyDocumentsListContent
			{...listProps}
			documentType="facture-client"
			header={
				<View className="gap-3">
					{!!companyError && <QueryError variant="banner" error={companyError} onRetry={onRetryCompany} />}
					{usesForeignCurrency && (
						<CustomChoiceButtons
							label={t.documentForm.deviseLabel}
							items={[
								{ label: 'MAD', value: 'MAD' },
								{ label: 'EUR', value: 'EUR' },
								{ label: 'USD', value: 'USD' },
							]}
							value={currency}
							onChange={setCurrency}
							columns={3}
							compact
							hideLabel
						/>
					)}
					<SectionCard>
						<View className="gap-3">
							{statistics.map((statistic, index) => (
								<View
									key={statistic.label}
									className={
										'flex-row items-center gap-3 ' +
										(index < statistics.length - 1 ? 'border-b border-slate-100 pb-3 dark:border-slate-700' : '')
									}
								>
									<MaterialIcons name={statistic.icon} size={21} color={statistic.color} />
									<Text className="min-w-0 flex-1 font-sans text-xs text-slate-500 dark:text-slate-400">
										{statistic.label}
									</Text>
									<Text numberOfLines={1} className="font-poppins-semibold text-sm" style={{ color: statistic.color }}>
										{formatNumberWithSpaces(statistic.value ?? 0, 2)} {selectedCurrency}
									</Text>
								</View>
							))}
						</View>
					</SectionCard>
				</View>
			}
		/>
	);
};

export default FactureClientListContent;
