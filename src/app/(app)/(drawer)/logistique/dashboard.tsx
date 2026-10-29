import type { ComponentProps, ReactNode } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import BottomNavigation from '@/components/shared/bottomNavigation/bottomNavigation';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ChartCard from '@/components/shared/dashboard/chartCard';
import { Line, Bar, Doughnut } from '@/components/shared/themedCharts/themedCharts';
import QueryError from '@/components/shared/queryError/queryError';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import EmptyState from '@/components/shared/emptyState/emptyState';
import { useGetLogistiqueDashboardQuery } from '@/store/services/logistique';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage } from '@/utils/hooks';
import { formatNumberWithSpaces, parseNumber } from '@/utils/helpers';
import { colors, listSpacing, dashboardChartColors as C, dashboardPieColors } from '@/utils/themes';

type Props = {
	company_id: number;
	tabs: ReactNode;
};

const LogistiqueDashboardContent = (props: Props) => {
	const { t } = useLanguage();
	const token = useInitAccessToken();
	const query = useGetLogistiqueDashboardQuery({ company_id: props.company_id }, { skip: !token });
	const stats = query.currentData;
	if (!stats)
		return (
			<View className="flex-1 gap-4 p-4">
				{props.tabs}
				{query.isError ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : <ApiProgress />}
			</View>
		);
	const metrics: {
		title: string;
		value: number;
		icon: ComponentProps<typeof MaterialIcons>['name'];
		color?: string;
	}[] = [
		{ title: t.logistique.totalOrders, value: stats.total_commandes, icon: 'inventory-2' },
		{ title: t.logistique.inProgress, value: stats.commandes_en_cours, icon: 'pending-actions' },
		{ title: t.logistique.delays, value: stats.retards, icon: 'schedule', color: colors.danger },
		{ title: t.logistique.pendingPayments, value: stats.paiements_en_attente, icon: 'payments', color: colors.warning },
		{ title: t.logistique.deliveries, value: stats.livraisons, icon: 'local-shipping', color: colors.success },
		{ title: t.logistique.swiftMissing, value: stats.swift_manquant, icon: 'account-balance', color: colors.warning },
		{ title: t.logistique.docsMissing, value: stats.documents_non_recus, icon: 'description', color: colors.warning },
		{ title: t.logistique.transitNotStarted, value: stats.transit_non_lance, icon: 'warehouse' },
	];
	const flow = stats.monthly_flow ?? [];
	const suppliers = stats.kpi_fournisseurs ?? [];
	const maxCost = Math.max(1, ...suppliers.map((row) => parseNumber(row.cout_total) ?? 0));
	const maxOrders = Math.max(1, ...suppliers.map((row) => row.total_commandes));
	const pie = (labels: string[], values: number[], label: string): ComponentProps<typeof Doughnut>['data'] => ({
		labels,
		datasets: [{ label, data: values, color: C.primary, colors: dashboardPieColors }],
	});
	const charts: {
		key: string;
		title: string;
		tooltip: string;
		variant: 'line' | 'bar' | 'donut';
		data: ComponentProps<typeof Line>['data'];
	}[] = [
		{
			key: 'flow',
			title: t.logistique.flowChartTitle,
			tooltip: t.logistique.flowChartTooltip,
			variant: 'line',
			data: {
				labels: flow.map((row) => row.month),
				datasets: [
					{ label: t.logistique.createdOrders, data: flow.map((row) => row.commandes), color: C.primary },
					{ label: t.logistique.completedDeliveries, data: flow.map((row) => row.livraisons), color: C.success },
					{ label: t.logistique.validatedPayments, data: flow.map((row) => row.paiements), color: C.warning },
				],
			},
		},
		{
			key: 'workflow',
			title: t.logistique.workflowChartTitle,
			tooltip: t.logistique.workflowChartTooltip,
			variant: 'donut',
			data: pie(
				(stats.statuts_workflow ?? []).map((row) => row.statut),
				(stats.statuts_workflow ?? []).map((row) => row.total),
				t.logistique.totalOrders,
			),
		},
		{
			key: 'payments',
			title: t.logistique.paymentChartTitle,
			tooltip: t.logistique.paymentChartTooltip,
			variant: 'donut',
			data: pie(
				(stats.statuts_paiement ?? []).map((row) => row.statut_paiement),
				(stats.statuts_paiement ?? []).map((row) => row.total),
				t.logistique.colPaiement,
			),
		},
		{
			key: 'alerts',
			title: t.logistique.alertChartTitle,
			tooltip: t.logistique.alertChartTooltip,
			variant: 'bar',
			data: {
				labels: [
					t.logistique.delays,
					t.logistique.pendingPayments,
					t.logistique.swiftMissing,
					t.logistique.docsMissing,
					t.logistique.transitNotStarted,
				],
				datasets: [
					{
						label: t.logistique.colAlerts,
						data: [
							stats.retards,
							stats.paiements_en_attente,
							stats.swift_manquant,
							stats.documents_non_recus,
							stats.transit_non_lance,
						],
						color: C.warning,
					},
				],
			},
		},
		{
			key: 'costs',
			title: t.logistique.costBreakdownChartTitle,
			tooltip: t.logistique.costBreakdownChartTooltip,
			variant: 'donut',
			data: pie(
				[
					t.logistique.fieldCoutAchat,
					t.logistique.fieldCoutTransport,
					t.logistique.fieldFraisTransit,
					t.logistique.fieldFraisDouane,
					t.logistique.fieldTva,
					t.logistique.fieldLivraisonLocale,
					t.logistique.fieldAutresFrais,
				],
				[
					stats.couts_detail?.achat,
					stats.couts_detail?.transport,
					stats.couts_detail?.transit,
					stats.couts_detail?.douane,
					stats.couts_detail?.tva,
					stats.couts_detail?.livraison_locale,
					stats.couts_detail?.autres,
				].map((value) => parseNumber(value ?? 0) ?? 0),
				t.logistique.logisticsCosts,
			),
		},
		{
			key: 'trend',
			title: t.logistique.costTrendChartTitle,
			tooltip: t.logistique.costTrendChartTooltip,
			variant: 'line',
			data: {
				labels: flow.map((row) => row.month),
				datasets: [
					{
						label: t.logistique.monthlyCosts,
						data: flow.map((row) => parseNumber(row.cout_total) ?? 0),
						color: C.secondary,
					},
				],
			},
		},
		{
			key: 'supplier-share',
			title: t.logistique.supplierCostShareChartTitle,
			tooltip: t.logistique.supplierCostShareChartTooltip,
			variant: 'donut',
			data: pie(
				suppliers.map((row) => row.fournisseur || t.common.noData),
				suppliers.map((row) => parseNumber(row.cout_total) ?? 0),
				t.logistique.logisticsCosts,
			),
		},
	];
	return (
		<FlatList
			testID="logistique-dashboard"
			data={charts}
			keyExtractor={(item) => item.key}
			initialNumToRender={2}
			maxToRenderPerBatch={1}
			windowSize={5}
			contentContainerStyle={{ padding: listSpacing, paddingBottom: 48, gap: listSpacing }}
			refreshControl={
				<RefreshControl
					refreshing={query.isFetching}
					onRefresh={() => {
						if (!query.isFetching) void query.refetch();
					}}
					tintColor={colors.brand}
					colors={[colors.brand]}
				/>
			}
			ListHeaderComponent={
				<View style={{ gap: listSpacing }}>
					{props.tabs}
					{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
					<SectionCard title={t.logistique.logisticsCosts} icon="request-quote">
						<Text
							testID="logistique-total-cost"
							numberOfLines={1}
							adjustsFontSizeToFit
							minimumFontScale={0.7}
							className="font-poppins-semibold text-2xl text-ink dark:text-slate-100"
						>
							{formatNumberWithSpaces(stats.couts_detail?.total ?? stats.couts_logistiques, 2)}{' '}
							<Text className="text-sm text-slate-400">MAD</Text>
						</Text>
					</SectionCard>
					<SectionCard title={t.dashboard.sectionKpi} icon="analytics">
						{Array.from({ length: 4 }, (_, row) => (
							<View
								key={row}
								className={`flex-row gap-4 ${row ? 'border-t border-slate-100 pt-3 dark:border-slate-700' : ''}`}
							>
								{metrics.slice(row * 2, row * 2 + 2).map((metric) => (
									<View key={metric.title} className="min-w-0 flex-1 justify-between gap-2 py-1">
										<View className="flex-row items-center gap-2">
											<MaterialIcons name={metric.icon} size={18} color={colors.slate[400]} />
											<Text className="flex-1 font-sans text-xs text-slate-500 dark:text-slate-300">
												{metric.title}
											</Text>
										</View>
										<Text
											className="font-poppins-semibold text-xl text-ink dark:text-slate-100"
											style={metric.color ? { color: metric.color } : undefined}
										>
											{formatNumberWithSpaces(metric.value, 0)}
										</Text>
									</View>
								))}
							</View>
						))}
					</SectionCard>
					<SectionCard title={t.logistique.supplierKpiSection} icon="business">
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
							{t.logistique.supplierKpiComparisonHint}
						</Text>
						{!suppliers.length ? (
							<EmptyState message={t.logistique.noSupplierKpi} />
						) : (
							suppliers.map((supplier, index) => (
								<View
									key={supplier.fournisseur || index}
									className={`gap-3 ${index ? 'border-t border-slate-200 pt-4 dark:border-slate-600' : ''}`}
								>
									<Text className="font-poppins-semibold text-sm text-ink dark:text-slate-100">
										{supplier.fournisseur || t.common.noData}
									</Text>
									{[
										{
											label: t.logistique.colCoutTotal,
											value: `${formatNumberWithSpaces(supplier.cout_total, 2)} MAD`,
											ratio: (parseNumber(supplier.cout_total) ?? 0) / maxCost,
											color: C.primary,
										},
										{
											label: t.logistique.ordersCount,
											value: formatNumberWithSpaces(supplier.total_commandes, 0),
											ratio: supplier.total_commandes / maxOrders,
											color: C.success,
										},
									].map((metric) => (
										<View key={metric.label} className="gap-1.5">
											<View className="flex-row items-center justify-between gap-3">
												<Text className="flex-1 font-sans text-xs text-slate-500 dark:text-slate-400">
													{metric.label}
												</Text>
												<Text className="shrink font-poppins-semibold text-sm text-ink dark:text-slate-100">
													{metric.value}
												</Text>
											</View>
											<View className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
												<View
													style={{
														height: '100%',
														width: `${Math.min(100, Math.max(0, metric.ratio * 100))}%`,
														backgroundColor: metric.color,
													}}
												/>
											</View>
										</View>
									))}
								</View>
							))
						)}
					</SectionCard>
				</View>
			}
			renderItem={({ item }) => (
				<ChartCard
					title={item.title}
					infoTooltip={item.tooltip}
					query={query}
					empty={!item.data.datasets.some((set) => set.data.some((value) => value > 0))}
					emptyMessage={t.logistique.noChartData}
				>
					{item.variant === 'line' ? (
						<Line data={item.data} />
					) : item.variant === 'bar' ? (
						<Bar horizontal data={item.data} />
					) : (
						<Doughnut data={item.data} showPercentages />
					)}
				</ChartCard>
			)}
		/>
	);
};

const LogistiqueDashboardPage = () => (
	<View className="flex-1 bg-slate-50 dark:bg-night">
		<CompanyDocumentsWrapperList>
			{(company) => (
				<LogistiqueDashboardContent key={company.company_id} company_id={company.company_id} tabs={company.tabs} />
			)}
		</CompanyDocumentsWrapperList>
		<BottomNavigation />
	</View>
);

export default LogistiqueDashboardPage;
