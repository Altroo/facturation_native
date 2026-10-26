import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, subMonths } from 'date-fns';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import CustomChoiceButtons from '@/components/nativeElements/customChoiceButtons/customChoiceButtons';
import CustomDateInput from '@/components/nativeElements/customDateInput/customDateInput';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import {
	CashFlowCharts,
	ClientCharts,
	CommercialCharts,
	DiscountMarginCharts,
	FinancialCharts,
	GlobalCharts,
	KPICardsSection,
	MonthlyObjectivesSection,
	OperationalCharts,
} from '@/components/shared/dashboard/dashboardCharts';
import { useGetCompanyQuery } from '@/store/services/company';
import { useGetClientsListQuery } from '@/store/services/client';
import { dashboardApi } from '@/store/services/dashboard';
import type { DateFilterParams } from '@/types/dashboardTypes';
import type { DropDownType } from '@/types/accountTypes';
import { useAppDispatch, useLanguage } from '@/utils/hooks';
import { colors, listSpacing } from '@/utils/themes';

type Props = {
	company_id: number;
	tabs: ReactNode;
};

const DashboardContent = (props: Props) => {
	const { t } = useLanguage();
	const dispatch = useAppDispatch();
	const [dateFrom, setDateFrom] = useState(() => format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
	const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
	const [selectedDevise, setSelectedDevise] = useState<'MAD' | 'EUR' | 'USD'>('MAD');
	const [selectedClient, setSelectedClient] = useState<DropDownType | null>(null);
	const [projectRef, setProjectRef] = useState('');
	const [projectInput, setProjectInput] = useState('');
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const company = useGetCompanyQuery({ id: props.company_id });
	const clients = useGetClientsListQuery(
		{ company_id: props.company_id, with_pagination: false },
		{ skip: !filtersOpen },
	);
	const rawClients = Array.isArray(clients.currentData) ? clients.currentData : (clients.currentData?.results ?? []);
	const currency = company.currentData?.uses_foreign_currency ? selectedDevise : 'MAD';
	const dateParams: DateFilterParams = {
		company_id: props.company_id,
		date_from: dateFrom || undefined,
		date_to: dateTo || undefined,
		devise: currency,
		client_id: selectedClient ? Number(selectedClient.value) : undefined,
		project: projectRef.trim() || undefined,
	};
	const sections = [
		{ key: 'kpi', title: t.dashboard.sectionKpi, component: KPICardsSection },
		{ key: 'objectives', title: t.dashboard.sectionObjectifs, component: MonthlyObjectivesSection },
		{ key: 'financial', title: t.dashboard.sectionFinancier, component: FinancialCharts },
		{ key: 'commercial', title: t.dashboard.sectionCommercial, component: CommercialCharts },
		{ key: 'operational', title: t.dashboard.sectionOperationnel, component: OperationalCharts },
		{ key: 'cashflow', title: t.dashboard.sectionTresorerie, component: CashFlowCharts },
		{ key: 'clients', title: t.dashboard.sectionClients, component: ClientCharts },
		{ key: 'discount', title: t.dashboard.sectionRemises, component: DiscountMarginCharts },
		{ key: 'global', title: t.dashboard.sectionGlobal, component: GlobalCharts },
	];
	const reset = () => {
		setDateFrom(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
		setDateTo(format(new Date(), 'yyyy-MM-dd'));
		setSelectedClient(null);
		setProjectRef('');
		setProjectInput('');
	};
	const refresh = async () => {
		setRefreshing(true);
		try {
			dispatch(dashboardApi.util.invalidateTags(['Dashboard', 'MonthlyObjectivesSettings']));
			await Promise.all(dispatch(dashboardApi.util.getRunningQueriesThunk()));
		} finally {
			setRefreshing(false);
		}
	};
	return (
		<FlatList
			testID="dashboard-list"
			data={sections}
			keyExtractor={(item) => item.key}
			// Only nearby sections mount and start their API requests on mobile.
			initialNumToRender={2}
			maxToRenderPerBatch={1}
			windowSize={5}
			keyboardShouldPersistTaps="handled"
			contentContainerStyle={{ padding: listSpacing, paddingBottom: 48, gap: 24 }}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => {
						void refresh();
					}}
					tintColor={colors.brand}
					colors={[colors.brand]}
				/>
			}
			ListHeaderComponent={
				<View className="gap-4">
					{props.tabs}
					{company.currentData?.uses_foreign_currency && (
						<CustomChoiceButtons
							label={t.documentForm.deviseLabel}
							items={[
								{ value: 'MAD', label: 'MAD' },
								{ value: 'EUR', label: 'EUR' },
								{ value: 'USD', label: 'USD' },
							]}
							value={currency}
							onChange={setSelectedDevise}
							compact
							hideLabel
							columns={3}
						/>
					)}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t.dataGrid.toolbarFilters}
						accessibilityState={{ expanded: filtersOpen }}
						onPress={() => setFiltersOpen(!filtersOpen)}
						className="flex-row items-center gap-3 rounded-xl bg-white px-4 py-3 dark:bg-panel"
					>
						<MaterialIcons name="filter-list" size={22} color={colors.brand} />
						<View className="flex-1 gap-1">
							<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">
								{t.dataGrid.toolbarFilters}
							</Text>
							<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
								{dateFrom ? dateFrom.split('-').reverse().join('/') : '…'} →{' '}
								{dateTo ? dateTo.split('-').reverse().join('/') : '…'}
							</Text>
						</View>
						<MaterialIcons name={filtersOpen ? 'expand-less' : 'expand-more'} size={24} color={colors.slate[400]} />
					</Pressable>
					{filtersOpen && (
						<SectionCard>
							<CustomDateInput
								label={t.dashboard.dateFrom}
								value={dateFrom}
								onChange={setDateFrom}
								maximumDate={dateTo || format(new Date(), 'yyyy-MM-dd')}
							/>
							<CustomDateInput
								label={t.dashboard.dateTo}
								value={dateTo}
								onChange={setDateTo}
								minimumDate={dateFrom}
								maximumDate={format(new Date(), 'yyyy-MM-dd')}
							/>
							<CustomAutoCompleteSelect
								label={t.dashboard.filterClient}
								value={selectedClient}
								onChange={(_event, value) => setSelectedClient(value)}
								items={rawClients.map((client) => ({
									value: String(client.id),
									code:
										client.raison_sociale ||
										[client.nom, client.prenom].filter(Boolean).join(' ') ||
										client.code_client ||
										t.dashboard.noName,
								}))}
								noOptionsText={t.dashboard.noClientFound}
								startIcon={<MaterialIcons name="person-outline" size={20} color={colors.slate[400]} />}
							/>
							<CustomTextInput
								label={t.dashboard.filterProject}
								value={projectInput}
								onChangeText={setProjectInput}
								onEndEditing={() => setProjectRef(projectInput)}
								placeholder={t.dashboard.filterProject}
								returnKeyType="done"
								startIcon={<MaterialIcons name="work-outline" size={20} color={colors.slate[400]} />}
							/>
							<PrimaryLoadingButton
								buttonText={t.dashboard.resetDates}
								loading={false}
								active
								inverted
								onClick={reset}
								startIcon={<MaterialIcons name="restart-alt" size={20} color={colors.brand} />}
							/>
						</SectionCard>
					)}
				</View>
			}
			renderItem={({ item }) => (
				<View className="gap-3">
					{item.key !== 'kpi' && item.key !== 'objectives' && (
						<Text accessibilityRole="header" className="font-poppins-semibold text-lg text-ink dark:text-slate-100">
							{item.title}
						</Text>
					)}
					<item.component dateParams={dateParams} company_id={props.company_id} devise={currency} />
				</View>
			)}
		/>
	);
};

const DashboardPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(args) => <DashboardContent key={args.company_id} {...args} />}
		</CompanyDocumentsWrapperList>
		<BottomNavigation />
	</View>
);

export default DashboardPage;
