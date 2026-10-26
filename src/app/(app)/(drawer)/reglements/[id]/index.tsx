import { useRef, useState, type ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetReglementQuery, useDeleteReglementMutation } from '@/store/services/reglement';
import { getUserCompaniesState } from '@/store/selectors';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, formatDate, formatNumberWithSpaces, parseEntityId } from '@/utils/helpers';
import { openReglementPdf } from '@/utils/apiHelpers';
import { CLIENTS_VIEW, FACTURE_CLIENT_VIEW, REGLEMENTS_EDIT, REGLEMENTS_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import TextButton from '@/components/nativeElements/buttons/textButton/textButton';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import InfoRow from '@/components/shared/infoRow/infoRow';
import DocumentStatus from '@/components/shared/documentStatus/documentStatus';
import DocumentPdfModal from '@/components/shared/documentPdfModal/documentPdfModal';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import ReglementFinancialSummary from '@/components/shared/reglements/reglementFinancialSummary';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = { id: number; company_id: number };

const ReglementViewContent = (props: Props) => {
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const company = useAppSelector(getUserCompaniesState).find((item) => item.id === props.company_id);
	const canView = !!company && ['Caissier', 'Commercial', 'Comptable', 'Lecture'].includes(company.role);
	const query = useGetReglementQuery({ id: props.id }, { skip: !token || !canView, refetchOnMountOrArgChange: true });
	const [deleteRecord, mutation] = useDeleteReglementMutation();
	const [confirmation, setConfirmation] = useState(false);
	const [pdfOpen, setPdfOpen] = useState(false);
	const pending = useRef(false);
	const payment = query.currentData;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={18} color={colors.slate[400]} />
	);
	if (!token) return <ApiProgress />;
	if (!canView) return <NoPermission />;
	if (query.isError) return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
	if (!payment) return <ApiProgress />;
	// Route company_id supplies context, never proof that this payment belongs to it.
	if (payment.company !== props.company_id) return <NoPermission />;
	const remove = async () => {
		if (company.role !== 'Caissier' || pending.current) return;
		pending.current = true;
		try {
			await deleteRecord({ id: props.id }).unwrap();
			onSuccess(t.reglements.deleteSuccess);
			router.dismissTo(REGLEMENTS_LIST);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.reglements.deleteError));
		} finally {
			pending.current = false;
			setConfirmation(false);
		}
	};
	return (
		<>
			<DetailsPage
				onRefresh={() => {
					if (!mutation.isLoading && !query.isFetching) void query.refetch();
				}}
				refreshing={query.isFetching}
				actions={
					company.role === 'Caissier' ? (
						<DetailsPageActions
							disabled={mutation.isLoading}
							loading={mutation.isLoading}
							onEdit={
								payment.statut === 'Valide'
									? () => {
											const route = REGLEMENTS_EDIT(props.id);
											router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
										}
									: undefined
							}
							onDelete={() => setConfirmation(true)}
						/>
					) : undefined
				}
			>
				<SectionCard title={t.reglements.statusSection} icon="fact-check">
					<DocumentStatus statut={payment.statut} />
				</SectionCard>
				<ReglementFinancialSummary payment={payment} showPayment />
				<SectionCard title={t.reglements.infoFacture} icon="receipt-long">
					<InfoRow
						dense
						icon={icon('receipt-long')}
						label={t.reglements.colNumeroFacture}
						value={
							<TextButton
								buttonText={payment.facture_client_numero || t.common.noData}
								onClick={() => {
									const route = FACTURE_CLIENT_VIEW(payment.facture_client);
									router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
								}}
							/>
						}
					/>
					<InfoRow
						dense
						icon={icon('person-outline')}
						label={t.reglements.colClient}
						value={
							payment.client && payment.client_name ? (
								<TextButton
									buttonText={payment.client_name}
									onClick={() => {
										const route = CLIENTS_VIEW(payment.client!);
										router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
									}}
								/>
							) : (
								payment.client_name
							)
						}
					/>
				</SectionCard>
				<SectionCard title={t.reglements.detailsReglement} icon="payments">
					<InfoRow
						dense
						icon={icon('payments')}
						label={t.reglements.fieldModeReglement}
						value={payment.mode_reglement_name}
					/>
					<InfoRow
						dense
						icon={icon('paid')}
						label={t.reglements.colMontant}
						value={`${formatNumberWithSpaces(payment.montant, 2)} ${payment.devise || 'MAD'}`}
					/>
					<InfoRow dense icon={icon('tag')} label={t.reglements.fieldLibelle} value={payment.libelle} />
				</SectionCard>
				<SectionCard title={t.clients.datesSection} icon="event">
					<InfoRow
						dense
						icon={icon('event')}
						label={t.reglements.colDateReglement}
						value={formatDate(payment.date_reglement, false)}
					/>
					<InfoRow dense icon={icon('event')} label={t.common.dateCreation} value={formatDate(payment.date_created)} />
					<InfoRow dense icon={icon('update')} label={t.common.dateMaj} value={formatDate(payment.date_updated)} />
				</SectionCard>
				{!!payment.observations && (
					<SectionCard title={t.reglements.fieldObservations} icon="notes">
						<InfoRow dense label="" value={payment.observations} />
					</SectionCard>
				)}
				{company.role !== 'Lecture' && (
					<PrimaryLoadingButton
						buttonText={t.reglements.printReceipt}
						active={!mutation.isLoading}
						loading={false}
						inverted
						startIcon={<MaterialIcons name="picture-as-pdf" size={20} color={colors.brand} />}
						onClick={() => setPdfOpen(true)}
					/>
				)}
			</DetailsPage>
			{confirmation && (
				<ConfirmationModal
					title={t.reglements.deleteModalTitle}
					body={t.reglements.deleteModalBody}
					recordName={payment.libelle || payment.facture_client_numero || undefined}
					action="delete"
					confirmText={t.common.delete}
					loading={mutation.isLoading}
					onClose={() => {
						if (!pending.current) setConfirmation(false);
					}}
					onConfirm={() => void remove()}
				/>
			)}
			{pdfOpen && (
				<DocumentPdfModal
					normal
					onClose={() => setPdfOpen(false)}
					onOpen={(_type, language) => openReglementPdf(props.id, props.company_id, language)}
				/>
			)}
		</>
	);
};

const ReglementViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <ReglementViewContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default ReglementViewPage;
