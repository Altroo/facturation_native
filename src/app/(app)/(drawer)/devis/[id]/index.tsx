import { useRef, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useGetDeviQuery, useDeleteDeviMutation } from '@/store/services/devi';
import { useGetArticlesListQuery } from '@/store/services/article';
import {
	calculateDocumentTotals,
	extractApiErrorMessage,
	formatDate,
	formatNumberWithSpaces,
	isNectarRaisonSociale,
	parseEntityId,
} from '@/utils/helpers';
import { openDevisPdf } from '@/utils/apiHelpers';
import { DEVIS_EDIT, DEVIS_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';
import type { DeviFactureLineFormValues } from '@/types/devisTypes';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import DocumentStatus from '@/components/shared/documentStatus/documentStatus';
import DocumentPdfModal from '@/components/shared/documentPdfModal/documentPdfModal';
import FactureDevisTotalsCard from '@/components/shared/factureDevistotalCard/factureDevisTotalsCard';
import LinesGrid from '@/components/shared/linesGrid/linesGrid';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';

type Props = { id: number; company_id: number };

const DevisViewContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const companies = useAppSelector(getUserCompaniesState);
	const company = companies.find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const canEdit = company?.role === 'Caissier' || company?.role === 'Commercial';
	const canDelete = company?.role === 'Caissier';
	const canPrint = canView && company?.role !== 'Lecture';
	const query = useGetDeviQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	const quote = query.currentData;
	const belongsToCompany = quote?.company === props.company_id;
	const articleIds = [...new Set((quote?.lignes ?? []).map((line) => line.article))];
	const articlesQuery = useGetArticlesListQuery(
		{ company_id: props.company_id, with_pagination: false, ids: articleIds.join(',') },
		{ skip: !canView || !belongsToCompany || !articleIds.length },
	);
	const articles = Array.isArray(articlesQuery.currentData) ? articlesQuery.currentData : [];
	const [deleteDevi, mutation] = useDeleteDeviMutation();
	const [showDelete, setShowDelete] = useState(false);
	const [showPdf, setShowPdf] = useState(false);
	const pending = useRef(false);
	const isNectar = isNectarRaisonSociale(company?.raison_sociale);
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const handleDelete = async () => {
		if (!canDelete || !belongsToCompany || pending.current) return;
		pending.current = true;
		try {
			await deleteDevi({ id: props.id }).unwrap();
			onSuccess(t.devis.deleteSuccess);
			router.dismissTo(DEVIS_LIST);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.devis.deleteError));
		} finally {
			pending.current = false;
			setShowDelete(false);
		}
	};
	if (!canView) return <NoPermission />;
	if (!quote)
		return query.isError ? (
			<View className="p-5">
				<QueryError error={query.error} onRetry={() => void query.refetch()} />
			</View>
		) : (
			<ApiProgress />
		);
	if (!belongsToCompany) return <NoPermission />;
	const lines: DeviFactureLineFormValues[] = quote.lignes.map((line) => ({
		...line,
		designation: line.designation ?? line.article_designation ?? '',
	}));
	const calculated = calculateDocumentTotals(lines, articles, quote.remise_type, quote.remise);
	// The saved document's server totals are authoritative. Article metadata is
	// only used for tax labels/photos and the web's purchase-cost summary.
	const totals = {
		...calculated,
		totalHT: Number(quote.total_ht),
		totalTVA: Number(quote.total_tva),
		totalTTC: Number(quote.total_ttc),
		totalTTCApresRemise: Number(quote.total_ttc_apres_remise),
	};
	return (
		<>
			<DetailsPage
				refreshing={query.isFetching}
				onRefresh={() => {
					if (!query.isFetching && !mutation.isLoading) {
						void query.refetch();
						if (articleIds.length && !articlesQuery.isFetching) void articlesQuery.refetch();
					}
				}}
				actions={
					canEdit || canDelete ? (
						<DetailsPageActions
							disabled={mutation.isLoading}
							loading={mutation.isLoading}
							onEdit={
								canEdit
									? () => {
											const route = DEVIS_EDIT(props.id);
											router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
										}
									: undefined
							}
							onDelete={canDelete ? () => setShowDelete(true) : undefined}
						/>
					) : undefined
				}
			>
				{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
				<FactureDevisTotalsCard
					totals={totals}
					devise={quote.devise || 'MAD'}
					showDiscountTotal={!isNectar}
					showPurchaseTotal={!isNectar}
				/>
				<SectionCard title={t.documentView.documentInfoSection} icon="description">
					<DocumentStatus statut={quote.statut} />
					<InfoRow icon={icon('tag')} label={t.devis.documentNumberLabel} value={quote.numero_devis} />
					<InfoRow icon={icon('event')} label={t.devis.documentDateLabel} value={formatDate(quote.date_devis, false)} />
					<InfoRow icon={icon('local-shipping')} label={t.logistique.fieldFournisseur} value={quote.fournisseur} />
					<InfoRow
						icon={icon('mail-outline')}
						label={t.logistique.fieldSupplierEmail}
						value={quote.fournisseur_email}
					/>
					{isNectar && (
						<InfoRow
							icon={icon('event-available')}
							label={t.documentForm.fieldDateEcheanceLabel}
							value={formatDate(quote.date_echeance, false)}
						/>
					)}
					{canPrint && (
						<PrimaryLoadingButton
							buttonText={t.common.print}
							loading={false}
							active={!mutation.isLoading}
							inverted
							startIcon={icon('picture-as-pdf')}
							onClick={() => setShowPdf(true)}
						/>
					)}
				</SectionCard>
				<SectionCard title={t.documentView.clientSection} icon="person-outline">
					<InfoRow icon={icon('person-outline')} label={t.documentView.clientLabel} value={quote.client_name} />
				</SectionCard>
				<SectionCard title={t.documentView.paymentSection} icon="payments">
					<InfoRow icon={icon('payments')} label={t.documentView.modePaiementLabel} value={quote.mode_paiement_name} />
					<InfoRow
						icon={icon('receipt')}
						label={t.devis.fieldNumeroDemandePrix}
						value={quote.numero_demande_prix_client}
					/>
				</SectionCard>
				{articlesQuery.isError && (
					<QueryError variant="banner" error={articlesQuery.error} onRetry={() => void articlesQuery.refetch()} />
				)}
				<LinesGrid
					title={t.devis.linesTitle}
					rows={lines}
					articles={articles}
					devise={quote.devise || 'MAD'}
					disableRemise={isNectar}
				/>
				{!isNectar && !!quote.remise_type && (
					<SectionCard title={t.documentView.remiseGlobaleSection} icon="sell">
						<InfoRow
							icon={icon('sell')}
							label={t.documentView.remiseAppliedLabel}
							value={`${formatNumberWithSpaces(quote.remise, 2)} ${quote.remise_type === 'Pourcentage' ? '%' : quote.devise || 'MAD'}`}
						/>
					</SectionCard>
				)}
				{!isNectar && (
					<SectionCard title={t.documentView.remarqueSection} icon="notes">
						<InfoRow icon={icon('notes')} label={t.documentView.remarqueLabel} value={quote.remarque} />
					</SectionCard>
				)}
				<SectionCard title={t.documentView.systemInfoSection} icon="info-outline">
					<InfoRow icon={icon('event')} label={t.common.dateCreation} value={formatDate(quote.date_created)} />
					<InfoRow icon={icon('update')} label={t.common.dateMaj} value={formatDate(quote.date_updated)} />
					<InfoRow
						icon={icon('person-outline')}
						label={t.documentView.createdByLabel}
						value={quote.created_by_user_name}
					/>
				</SectionCard>
			</DetailsPage>
			{showPdf && (
				<DocumentPdfModal
					onClose={() => setShowPdf(false)}
					onOpen={(type, language) => openDevisPdf(props.id, props.company_id, type, language)}
				/>
			)}
			{showDelete && (
				<ConfirmationModal
					title={t.devis.deleteModalTitle}
					body={t.devis.deleteModalBody}
					recordName={quote.numero_devis}
					action="delete"
					confirmText={t.common.delete}
					loading={mutation.isLoading}
					onConfirm={() => void handleDelete()}
					onClose={() => {
						if (!pending.current) setShowDelete(false);
					}}
				/>
			)}
		</>
	);
};

const DevisViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <DevisViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default DevisViewPage;
