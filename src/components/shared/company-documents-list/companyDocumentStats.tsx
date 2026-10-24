import { useState, type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import QueryError from '@/components/shared/queryError/queryError';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces } from '@/utils/helpers';
import type { CurrencyStats } from '@/types/companyDocumentsTypes';

type Props = {
	usesForeignCurrency: boolean;
	statsByCurrency?: Partial<Record<'MAD' | 'EUR' | 'USD', Partial<CurrencyStats>>>;
	statistics: Array<{
		label: string;
		field: keyof CurrencyStats;
		icon: ComponentProps<typeof MaterialIcons>['name'];
		color: string;
	}>;
	error?: unknown;
	onRetry: () => void;
};

// Invoices and credit notes use the same compact currency controls and totals.
const CompanyDocumentStats = (props: Props) => {
	const { t } = useLanguage();
	const [currency, setCurrency] = useState<'MAD' | 'EUR' | 'USD'>('MAD');
	const selectedCurrency = props.usesForeignCurrency ? currency : 'MAD';
	const stats = props.statsByCurrency?.[selectedCurrency];
	return (
		<View className="gap-3">
			{!!props.error && <QueryError variant="banner" error={props.error} onRetry={props.onRetry} />}
			{props.usesForeignCurrency && (
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
					{props.statistics.map((statistic, index) => (
						<View
							key={statistic.field}
							className={
								'flex-row items-center gap-3 ' +
								(index < props.statistics.length - 1 ? 'border-b border-slate-100 pb-3 dark:border-slate-700' : '')
							}
						>
							<MaterialIcons name={statistic.icon} size={21} color={statistic.color} />
							<Text className="min-w-0 flex-1 font-sans text-xs text-slate-500 dark:text-slate-400">
								{statistic.label}
							</Text>
							<Text numberOfLines={1} className="font-poppins-semibold text-sm" style={{ color: statistic.color }}>
								{formatNumberWithSpaces(stats?.[statistic.field] ?? 0, 2)} {selectedCurrency}
							</Text>
						</View>
					))}
				</View>
			</SectionCard>
		</View>
	);
};

export default CompanyDocumentStats;
