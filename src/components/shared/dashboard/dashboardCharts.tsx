import { Text, View } from 'react-native';
import { router } from 'expo-router';
import {
	useGetClientMultidimensionalProfileQuery,
	useGetCollectionRateQuery,
	useGetDiscountImpactAnalysisQuery,
	useGetKPICardsWithTrendsQuery,
	useGetMonthlyDocumentVolumeQuery,
	useGetMonthlyGlobalPerformanceQuery,
	useGetMonthlyObjectivesQuery,
	useGetMonthlyRevenueEvolutionQuery,
	useGetOverdueReceivablesQuery,
	useGetPaymentDelayByClientQuery,
	useGetPaymentStatusOverviewQuery,
	useGetPaymentTimelineQuery,
	useGetProductMarginVolumeQuery,
	useGetProductPriceVolumeAnalysisQuery,
	useGetQuoteConversionRateQuery,
	useGetSectionMicroTrendsQuery,
	useGetTopClientsByRevenueQuery,
	useGetTopProductsByQuantityQuery,
	useGetReceivablesByClientQuery,
	useGetUninvoicedDeliveriesQuery,
} from '@/store/services/dashboard';
import type { DateFilterParams } from '@/types/dashboardTypes';
import { getProfilState } from '@/store/selectors';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { dashboardChartColors as C, dashboardPieColors } from '@/utils/rawData';
import { colors } from '@/utils/themes';
import { formatNumber, formatNumberWithSpaces } from '@/utils/helpers';
import { DASHBOARD_OBJECTIFS_MENSUELS } from '@/utils/routes';
import { Line, Bar, Doughnut } from '@/components/shared/themedCharts/themedCharts';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ChartCard from './chartCard';

type Props = { dateParams: DateFilterParams; company_id: number; devise: 'MAD' | 'EUR' | 'USD' };

const money = (value: number, currency: string) => `${formatNumber(value)} ${currency}`;

export const KPICardsSection = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetKPICardsWithTrendsQuery(props.dateParams);
	const data = query.currentData?.currency_data?.[props.devise] ?? query.currentData;
	const cards = data
		? [
				{
					title: t.dashboard.kpiCA,
					data: data.current_month_revenue,
					tooltip: t.dashboard.kpiCATooltip,
					currency: props.devise,
				},
				{
					title: t.dashboard.kpiCreances,
					data: data.outstanding_receivables,
					tooltip: t.dashboard.kpiCreancesTooltip,
					currency: props.devise,
				},
				{
					title: t.dashboard.kpiMoyenneFacture,
					data: data.average_invoice_amount,
					tooltip: t.dashboard.kpiMoyenneTooltip,
					currency: props.devise,
				},
				{
					title: t.dashboard.kpiClientsActifs,
					data: data.active_clients,
					tooltip: t.dashboard.kpiClientsTooltip,
					currency: '',
				},
			]
		: [];
	return (
		<ChartCard
			title={t.dashboard.sectionKpi}
			query={query}
			empty={!data}
			emptyMessage={t.dashboard.noKpiData}
			infoTooltip={cards.map((card) => `${card.title}: ${card.tooltip}`).join('\n\n')}
		>
			{[cards.slice(0, 2), cards.slice(2)].map((row, index) => (
				<View
					key={index}
					className={'flex-row gap-4 ' + (index ? 'border-t border-slate-100 pt-3 dark:border-slate-700' : '')}
				>
					{row.map((card) => (
						<View key={card.title} className="min-w-0 flex-1 gap-2 py-1">
							<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">{card.title}</Text>
							<Text
								adjustsFontSizeToFit
								minimumFontScale={0.7}
								numberOfLines={1}
								className="font-poppins-semibold text-lg text-ink dark:text-slate-100"
							>
								{card.currency ? formatNumber(card.data.value) : formatNumberWithSpaces(card.data.value, 0)}
							</Text>
							{!!card.currency && <Text className="font-poppins-medium text-xs text-slate-400">{card.currency}</Text>}
							{card.data.trend.length > 1 && card.data.trend.some((value) => value !== 0) && (
								<Line
									sparkline
									height={28}
									data={{
										labels: card.data.trend.map(() => ''),
										datasets: [{ label: card.title, data: card.data.trend, color: C.primary }],
									}}
								/>
							)}
						</View>
					))}
				</View>
			))}
		</ChartCard>
	);
};

export const MonthlyObjectivesSection = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetMonthlyObjectivesQuery(props.dateParams);
	const { is_staff } = useAppSelector(getProfilState);
	const data = query.currentData;
	const revenue =
		props.devise === 'EUR' ? data?.revenue_eur : props.devise === 'USD' ? data?.revenue_usd : data?.revenue;
	const objectives = data
		? [
				{
					title: t.dashboard.objectifCA(props.devise),
					data: revenue ?? data.revenue,
					unit: props.devise,
					tooltip: t.dashboard.objectifCATooltip,
				},
				{
					title: t.dashboard.objectifFactures,
					data: data.invoices,
					unit: '',
					tooltip: t.dashboard.objectifFacturesTooltip,
				},
				{
					title: t.dashboard.objectifConversion,
					data: data.conversion,
					unit: '%',
					tooltip: t.dashboard.objectifConversionTooltip,
				},
			]
		: [];
	if (!data?.objectives_set)
		return (
			<ChartCard
				title={t.dashboard.sectionObjectifs}
				query={query}
				empty={!data}
				emptyMessage={t.dashboard.noObjectifsData}
			>
				<Text className="font-sans text-sm leading-6 text-slate-500 dark:text-slate-300">
					{t.dashboard.objectifsNotSet}
				</Text>
				{is_staff && (
					<PrimaryLoadingButton
						buttonText={t.dashboard.configureObjectifs}
						loading={false}
						active
						inverted
						onClick={() => router.push(DASHBOARD_OBJECTIFS_MENSUELS(props.company_id))}
					/>
				)}
			</ChartCard>
		);
	return (
		<ChartCard
			title={t.dashboard.sectionObjectifs}
			query={query}
			infoTooltip={objectives.map((item) => item.tooltip).join('\n\n')}
		>
			{objectives.map((objective, index) => {
				const percentage = Math.max(0, Math.min(100, objective.data.percentage));
				return (
					<View
						key={objective.title}
						className={
							'flex-row items-center gap-4 ' + (index ? 'border-t border-slate-100 pt-3 dark:border-slate-700' : '')
						}
					>
						<View className="w-24">
							<Doughnut
								sparkline
								height={88}
								centerLabel={`${objective.data.percentage.toFixed(1)}%`}
								data={{
									labels: [t.dashboard.atteint, t.dashboard.restant],
									datasets: [
										{
											label: objective.title,
											data: [percentage, 100 - percentage],
											color: C.success,
											colors: [C.success, C.errorLight],
										},
									],
								}}
							/>
						</View>
						<View className="min-w-0 flex-1 gap-2">
							<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{objective.title}</Text>
							<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
								{formatNumberWithSpaces(objective.data.current, objective.unit === '' ? 0 : 2)} {objective.unit}
							</Text>
							<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
								/ {formatNumberWithSpaces(objective.data.objective, objective.unit === '' ? 0 : 2)} {objective.unit}
							</Text>
						</View>
					</View>
				);
			})}
		</ChartCard>
	);
};

export const FinancialCharts = (props: Props) => {
	const { t } = useLanguage();
	const revenue = useGetMonthlyRevenueEvolutionQuery(props.dateParams);
	const payment = useGetPaymentStatusOverviewQuery(props.dateParams);
	const collection = useGetCollectionRateQuery(props.dateParams);
	const receivables = useGetReceivablesByClientQuery(props.dateParams);
	const rate = Math.max(0, Math.min(100, collection.currentData?.rate ?? 0));
	const balance = receivables.currentData;
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartCA}
				description={t.dashboard.chartCADesc}
				infoTooltip={t.dashboard.tooltipEvolutionCA}
				query={revenue}
				empty={!revenue.currentData?.length}
				emptyMessage={t.dashboard.noRevenue}
			>
				{revenue.currentData && (
					<Line
						data={{
							labels: revenue.currentData.map((item) => item.month),
							datasets: [
								{
									label: t.dashboard.caLabel(props.devise),
									data: revenue.currentData.map((item) => item.revenue),
									color: C.primary,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartReceivables}
				description={t.dashboard.chartReceivablesDesc}
				infoTooltip={t.dashboard.tooltipReceivables}
				query={receivables}
				empty={!balance?.clients.length}
				emptyMessage={t.dashboard.noReceivables}
			>
				{balance && (
					<>
						<Text className="font-poppins-semibold text-xl text-ink dark:text-slate-100">
							{money(balance.total_amount, balance.currency)}
						</Text>
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
							{t.dashboard.allClientsBalance} ·{' '}
							{t.dashboard.visibleDebtors(balance.clients.length, balance.client_count)}
						</Text>
						<Bar
							horizontal
							stacked
							data={{
								labels: balance.clients.map((item) => item.client_name),
								datasets: [
									{
										label: t.dashboard.overdueBalance,
										data: balance.clients.map((item) => item.overdue),
										color: C.error,
									},
									{
										label: t.dashboard.notDueBalance,
										data: balance.clients.map((item) => item.not_due),
										color: C.primary,
									},
									{
										label: t.dashboard.undatedBalance,
										data: balance.clients.map((item) => item.no_due_date),
										color: colors.slate[400],
									},
								],
							}}
						/>
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
							{t.dashboard.currentDocumentScope(balance.as_of.split('-').reverse().join('/'))}
						</Text>
					</>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartPaiements}
				description={t.dashboard.chartPaiementsDesc}
				infoTooltip={t.dashboard.tooltipPaiements}
				query={payment}
				empty={!payment.currentData?.some((item) => item.count > 0)}
				emptyMessage={t.dashboard.noPaiement}
			>
				{payment.currentData && (
					<Bar
						horizontal
						data={{
							labels: payment.currentData.map((item) => item.status),
							datasets: [
								{
									label: t.dashboard.collected,
									data: payment.currentData.map((item) => item.count),
									color: C.primary,
									colors: [C.success, C.warning, C.error],
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartRecouvrement}
				description={t.dashboard.chartRecouvrementDesc}
				infoTooltip={t.dashboard.tooltipRecouvrement}
				query={collection}
				empty={!collection.currentData?.total_invoiced}
				emptyMessage={t.dashboard.noEncaissement}
			>
				{collection.currentData && (
					<>
						<Doughnut
							centerLabel={`${collection.currentData.rate.toFixed(1)}%`}
							data={{
								labels: [t.dashboard.encaisse, t.dashboard.restant],
								datasets: [
									{ label: '%', data: [rate, 100 - rate], color: C.success, colors: [C.success, C.errorLight] },
								],
							}}
						/>
						<Text className="font-sans text-sm text-ink dark:text-slate-100">
							{t.dashboard.facture2}: {money(collection.currentData.total_invoiced, props.devise)}
						</Text>
						<Text className="font-sans text-sm text-ink dark:text-slate-100">
							{t.dashboard.encaisse}: {money(collection.currentData.total_collected, props.devise)}
						</Text>
					</>
				)}
			</ChartCard>
		</View>
	);
};

export const CommercialCharts = (props: Props) => {
	const { t } = useLanguage();
	const clients = useGetTopClientsByRevenueQuery(props.dateParams);
	const products = useGetTopProductsByQuantityQuery(props.dateParams);
	const conversion = useGetQuoteConversionRateQuery(props.dateParams);
	const price = useGetProductPriceVolumeAnalysisQuery(props.dateParams);
	const top = [...(price.currentData ?? [])].sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 10);
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartTopClients}
				description={t.dashboard.chartTopClientsDesc}
				infoTooltip={t.dashboard.tooltipTopClients}
				query={clients}
				empty={!clients.currentData?.length}
				emptyMessage={t.dashboard.noClientFound}
			>
				{clients.currentData && (
					<Bar
						horizontal
						data={{
							labels: clients.currentData.map((item) => item.client_name),
							datasets: [
								{
									label: t.dashboard.caLabel(props.devise),
									data: clients.currentData.map((item) => item.revenue),
									color: C.primary,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartTopProduits}
				description={t.dashboard.chartTopProduitsDesc}
				infoTooltip={t.dashboard.tooltipTopProduits}
				query={products}
				empty={!products.currentData?.length}
				emptyMessage={t.dashboard.noProduitFound}
			>
				{products.currentData && (
					<Bar
						horizontal
						data={{
							labels: products.currentData.map((item) => item.designation),
							datasets: [
								{
									label: t.dashboard.qteLabel,
									data: products.currentData.map((item) => item.quantity),
									color: C.secondary,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartTauxConversion}
				description={t.dashboard.chartTauxConversionDesc}
				infoTooltip={t.dashboard.tooltipConversion}
				query={conversion}
				empty={!conversion.currentData?.some((item) => item.count > 0)}
				emptyMessage={t.dashboard.noDevisFound}
			>
				{conversion.currentData && (
					<Doughnut
						showPercentages
						data={{
							labels: conversion.currentData.map((item) => item.status),
							datasets: [
								{
									label: t.dashboard.devis,
									data: conversion.currentData.map((item) => item.count),
									color: C.primary,
									colors: dashboardPieColors,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartPrixVolume}
				description={t.dashboard.chartPrixVolumeDesc}
				infoTooltip={t.dashboard.tooltipPrixVolume}
				query={price}
				empty={!top.length}
				emptyMessage={t.dashboard.noProduit}
			>
				<Bar
					horizontal
					data={{
						labels: top.map((item) => item.designation || t.dashboard.noName),
						datasets: [
							{ label: t.dashboard.qteLabel, data: top.map((item) => item.total_quantity), color: C.primary },
							{
								label: t.dashboard.prixMoyLabel(props.devise),
								data: top.map((item) => item.average_price),
								color: C.secondary,
								secondary: true,
							},
						],
					}}
				/>
			</ChartCard>
		</View>
	);
};

export const OperationalCharts = (props: Props) => {
	const { t } = useLanguage();
	const deliveries = useGetUninvoicedDeliveriesQuery(props.dateParams);
	const volume = useGetMonthlyDocumentVolumeQuery(props.dateParams);
	const data = deliveries.currentData;
	const labels = {
		'0_7': t.dashboard.age0To7,
		'8_30': t.dashboard.age8To30,
		'31_60': t.dashboard.age31To60,
		over_60: t.dashboard.ageOver60,
	};
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartUninvoicedDeliveries}
				description={t.dashboard.chartUninvoicedDeliveriesDesc}
				infoTooltip={t.dashboard.tooltipUninvoicedDeliveries}
				query={deliveries}
				empty={!data?.total_count}
				emptyMessage={t.dashboard.noUninvoicedDeliveries}
			>
				{data && (
					<>
						<Text className="font-poppins-semibold text-xl text-ink dark:text-slate-100">
							{money(data.total_amount, data.currency)}
						</Text>
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
							{t.dashboard.uninvoicedBalance} · {t.dashboard.uninvoicedDeliveryCount(data.total_count)}
						</Text>
						<Bar
							horizontal
							data={{
								labels: data.buckets.map((item) => labels[item.key]),
								datasets: [
									{
										label: t.dashboard.chartAmountTTC(data.currency),
										data: data.buckets.map((item) => item.amount),
										color: C.warning,
										colors: [C.primary, C.warning, colors.maintenance, C.error],
									},
								],
							}}
						/>
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-300">
							{t.dashboard.currentDocumentScope(data.as_of.split('-').reverse().join('/'))}
						</Text>
					</>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartVolumeDocuments}
				description={t.dashboard.chartVolumeDocumentsDesc}
				infoTooltip={t.dashboard.tooltipVolumeDocuments}
				query={volume}
				empty={!volume.currentData?.length}
				emptyMessage={t.dashboard.noDocumentFound}
			>
				{volume.currentData && (
					<Line
						data={{
							labels: volume.currentData.map((item) => item.month),
							datasets: [
								{ label: t.dashboard.devis, data: volume.currentData.map((item) => item.devis), color: C.primary },
								{
									label: t.dashboard.factures,
									data: volume.currentData.map((item) => item.factures),
									color: C.success,
								},
								{ label: t.dashboard.bls, data: volume.currentData.map((item) => item.bdl), color: C.warning },
							],
						}}
					/>
				)}
			</ChartCard>
		</View>
	);
};

export const CashFlowCharts = (props: Props) => {
	const { t } = useLanguage();
	const timeline = useGetPaymentTimelineQuery(props.dateParams);
	const overdue = useGetOverdueReceivablesQuery(props.dateParams);
	const delay = useGetPaymentDelayByClientQuery(props.dateParams);
	const top = [...(delay.currentData ?? [])].sort((a, b) => b.average_delay_days - a.average_delay_days).slice(0, 10);
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartChronologie}
				description={t.dashboard.chartChronologieDesc}
				infoTooltip={t.dashboard.tooltipChronologie}
				query={timeline}
				empty={!timeline.currentData?.length}
				emptyMessage={t.dashboard.noPaiementData}
			>
				{timeline.currentData && (
					<Line
						data={{
							labels: timeline.currentData.map((item) => item.date),
							datasets: [
								{
									label: t.dashboard.factureDevise(props.devise),
									data: timeline.currentData.map((item) => item.invoiced),
									color: C.primary,
								},
								{
									label: t.dashboard.encaisseLabel(props.devise),
									data: timeline.currentData.map((item) => item.collected),
									color: C.success,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartCreances}
				description={t.dashboard.chartCreancesDesc}
				infoTooltip={t.dashboard.tooltipCreances}
				query={overdue}
				empty={!overdue.currentData?.some((item) => item.count > 0 || item.amount > 0)}
				emptyMessage={t.dashboard.noCreanceData}
			>
				{overdue.currentData && (
					<Bar
						horizontal
						data={{
							labels: overdue.currentData.map((item) => item.period),
							datasets: [
								{ label: t.dashboard.collected, data: overdue.currentData.map((item) => item.count), color: C.warning },
								{
									label: t.dashboard.montantLabel(props.devise),
									data: overdue.currentData.map((item) => item.amount),
									color: C.error,
									secondary: true,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartDelaiPaiement}
				description={t.dashboard.chartDelaiPaiementDesc}
				infoTooltip={t.dashboard.tooltipDelaiPaiement}
				query={delay}
				empty={!top.length}
				emptyMessage={t.dashboard.noDelai}
			>
				<Bar
					horizontal
					data={{
						labels: top.map((item) => item.client_name),
						datasets: [
							{
								label: t.dashboard.delaiLabel,
								data: top.map((item) => item.average_delay_days),
								color: C.success,
								colors: top.map((item) =>
									item.average_delay_days > 60 ? C.error : item.average_delay_days > 30 ? C.warning : C.success,
								),
							},
						],
					}}
				/>
			</ChartCard>
		</View>
	);
};

export const ClientCharts = (props: Props) => {
	const { t } = useLanguage();
	const query = useGetClientMultidimensionalProfileQuery(props.dateParams);
	const client = query.currentData?.[0];
	return (
		<ChartCard
			title={t.dashboard.chartMeilleursClient}
			description={t.dashboard.chartMeilleursClientDesc}
			infoTooltip={t.dashboard.tooltipMeilleursClient}
			query={query}
			empty={!client}
			emptyMessage={t.dashboard.noClientFound}
		>
			{client && (
				<>
					<Text className="font-poppins-medium text-base text-ink dark:text-slate-100">{client.client_name}</Text>
					<Bar
						horizontal
						data={{
							labels: [
								t.dashboard.metricVolume,
								t.dashboard.metricFrequence,
								t.dashboard.metricMontantMoy,
								t.dashboard.metricRapidite,
								t.dashboard.metricAcceptRate,
							],
							datasets: [
								{
									label: client.client_name,
									data: [
										client.metrics.volume / 10000,
										client.metrics.frequency,
										client.metrics.avg_amount / 1000,
										client.metrics.payment_speed,
										client.metrics.acceptance_rate,
									],
									color: C.primary,
								},
							],
						}}
					/>
				</>
			)}
		</ChartCard>
	);
};

export const DiscountMarginCharts = (props: Props) => {
	const { t } = useLanguage();
	const discount = useGetDiscountImpactAnalysisQuery(props.dateParams);
	const margin = useGetProductMarginVolumeQuery(props.dateParams);
	const discounts = [...(discount.currentData ?? [])]
		.sort((a, b) => b.discount_amount - a.discount_amount)
		.slice(0, 10);
	const margins = [...(margin.currentData ?? [])].sort((a, b) => b.average_margin - a.average_margin).slice(0, 10);
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartRemises}
				description={t.dashboard.chartRemisesDesc}
				infoTooltip={t.dashboard.tooltipRemises}
				query={discount}
				empty={!discounts.length}
				emptyMessage={t.dashboard.noRemise}
			>
				<Bar
					horizontal
					data={{
						labels: discounts.map((item) => `${item.document_type} ${item.document_id}`),
						datasets: [
							{
								label: t.dashboard.montantTTC(props.devise),
								data: discounts.map((item) => item.total_amount),
								color: C.primary,
							},
							{
								label: t.dashboard.remiseDevise(props.devise),
								data: discounts.map((item) => item.discount_amount),
								color: C.warning,
							},
						],
					}}
				/>
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartMarges}
				description={t.dashboard.chartMargesDesc}
				infoTooltip={t.dashboard.tooltipMarges}
				query={margin}
				empty={!margins.length}
				emptyMessage={t.dashboard.noMarge}
			>
				<Bar
					horizontal
					data={{
						labels: margins.map((item) => item.designation || t.dashboard.noName),
						datasets: [
							{
								label: t.dashboard.margeMoyLabel(props.devise),
								data: margins.map((item) => item.average_margin),
								color: C.success,
							},
							{
								label: t.dashboard.qteLabel,
								data: margins.map((item) => item.total_quantity),
								color: C.info,
								secondary: true,
							},
						],
					}}
				/>
			</ChartCard>
		</View>
	);
};

export const GlobalCharts = (props: Props) => {
	const { t } = useLanguage();
	const comparison = useGetMonthlyGlobalPerformanceQuery(props.dateParams);
	const trends = useGetSectionMicroTrendsQuery(props.dateParams);
	const data = comparison.currentData;
	const sections = trends.currentData
		? [
				{ title: t.dashboard.trendFinancier, values: trends.currentData.financial, color: C.primary },
				{ title: t.dashboard.trendCommercial, values: trends.currentData.commercial, color: C.success },
				{ title: t.dashboard.trendOperationnel, values: trends.currentData.operational, color: C.warning },
				{ title: t.dashboard.trendTresorerie, values: trends.currentData.cashflow, color: C.secondary },
			]
		: [];
	return (
		<View className="gap-4">
			<ChartCard
				title={t.dashboard.chartComparaison}
				description={t.dashboard.chartComparaisonDesc}
				infoTooltip={t.dashboard.tooltipComparaison}
				query={comparison}
				empty={!data || !(data.current.revenue || data.current.quotes || data.previous.revenue || data.previous.quotes)}
				emptyMessage={t.dashboard.noPerformance}
			>
				{data && (
					<Bar
						horizontal
						data={{
							labels: [
								t.dashboard.metricCA10k,
								t.dashboard.metricDevis2,
								t.dashboard.metricConversion,
								t.dashboard.metricEncaisse10k,
								t.dashboard.metricNouvClients,
							],
							datasets: [
								{
									label: t.dashboard.moisEnCours,
									data: [
										data.current.revenue / 10000,
										data.current.quotes,
										data.current.conversion,
										data.current.collection / 10000,
										data.current.new_clients,
									],
									color: C.primary,
								},
								{
									label: t.dashboard.moisPrecedent,
									data: [
										data.previous.revenue / 10000,
										data.previous.quotes,
										data.previous.conversion,
										data.previous.collection / 10000,
										data.previous.new_clients,
									],
									color: C.secondary,
								},
							],
						}}
					/>
				)}
			</ChartCard>
			<ChartCard
				title={t.dashboard.chartMicroTendances}
				description={t.dashboard.chartTendancesDesc}
				infoTooltip={t.dashboard.tooltipMicroTendances}
				query={trends}
				empty={!sections.some((item) => item.values.length)}
				emptyMessage={t.dashboard.noTendances}
			>
				{sections.map((section) => (
					<View key={section.title} className="gap-2 py-2">
						<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">{section.title}</Text>
						{section.values.length ? (
							<Line
								sparkline
								height={70}
								data={{
									labels: section.values.map((_, index) => String(index)),
									datasets: [{ label: section.title, data: section.values, color: section.color }],
								}}
							/>
						) : (
							<Text className="font-sans text-sm text-slate-400">{t.dashboard.noData}</Text>
						)}
					</View>
				))}
			</ChartCard>
		</View>
	);
};
