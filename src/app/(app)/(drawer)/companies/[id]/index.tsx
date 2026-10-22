import InfoRow from '@/components/shared/infoRow/infoRow';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetCompanyQuery, useSuspendCompanyMutation } from '@/store/services/company';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { useAppDispatch, useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { formatDate, parseEntityId, runWithCleanup } from '@/utils/helpers';
import { COMPANIES_EDIT, COMPANIES_LIST } from '@/utils/routes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import { colors } from '@/utils/themes';

type CompaniesViewProps = {
	id: number;
};

const CompaniesViewPageContent = (props: CompaniesViewProps) => {
	const { id } = props;
	const { t } = useLanguage();
	const { is_staff } = usePermission();
	const { onSuccess, onError } = useToast();
	const dispatch = useAppDispatch();
	const query = useGetCompanyQuery(
		{
			id,
		},
		{
			skip: !is_staff,
			refetchOnMountOrArgChange: true,
		},
	);
	const [suspendRecord, mutation] = useSuspendCompanyMutation();
	const [showSuspendModal, setShowSuspendModal] = useState(false);
	const mutationInProgress = useRef(false);
	const memberships = useAppSelector(getUserCompaniesState);
	const handleSuspend = async () => {
		if (!is_staff || mutationInProgress.current) return;
		mutationInProgress.current = true;
		await runWithCleanup(
			async () => {
				try {
					await suspendRecord({
						id,
					}).unwrap();
					dispatch(companiesSetUserCompaniesAction(memberships.filter((company) => company.id !== id)));
					onSuccess(t.companies.suspendSuccess);
					router.dismissTo(COMPANIES_LIST);
				} catch {
					onError(t.companies.suspendError);
				}
			},
			() => {
				setShowSuspendModal(false);
				mutationInProgress.current = false;
			},
		);
	};
	if (!is_staff) return <NoPermission />;
	if (query.error)
		return (
			<DetailsPage>
				<QueryError
					error={query.error}
					onRetry={() => void query.refetch()}
					loading={query.isFetching}
					disabled={mutation.isLoading}
				/>
			</DetailsPage>
		);
	const companyData = query.currentData;
	if (!companyData) return <ApiProgress />;
	return (
		<>
			<DetailsPage
				refreshing={query.isFetching}
				onRefresh={() => {
					if (!mutation.isLoading) void query.refetch();
				}}
				actions={
					<DetailsPageActions
						onEdit={() => router.push(COMPANIES_EDIT(id))}
						onSuspend={() => setShowSuspendModal(true)}
						loading={mutation.isLoading}
					/>
				}
			>
				<SectionCard>
					<View className="flex-row items-center gap-4">
						<EntityImage
							image={companyData.logo_cropped || companyData.logo}
							previewImage={companyData.logo}
							label={t.companies.logoLabel}
							size={112}
						/>
						<View className="min-w-0 flex-1 gap-3">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{companyData.raison_sociale}
							</Text>
							<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name="business" size={14} color={colors.brand} />
								<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">
									{t.companies.companyChip}
								</Text>
							</View>
						</View>
					</View>
				</SectionCard>
				<SectionCard title={t.companies.stampSection} icon="image">
					<EntityImage
						image={companyData.cachet_cropped || companyData.cachet}
						previewImage={companyData.cachet}
						label={t.companies.stampLabel}
						icon="image"
						large
						fullWidth
					/>
				</SectionCard>
				<SectionCard title={t.companies.generalSection} icon="business">
					<InfoRow
						icon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldRaisonSociale}
						value={companyData.raison_sociale}
					/>
					<InfoRow
						icon={<MaterialIcons name="groups" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldNbrEmploye}
						value={companyData.nbr_employe}
					/>
					<InfoRow
						icon={<MaterialIcons name="location-on" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldAdresse}
						value={companyData.adresse}
					/>
					<InfoRow
						icon={<MaterialIcons name="language" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldSiteWeb}
						value={companyData.site_web}
					/>
					<InfoRow
						icon={<MaterialIcons name="event" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldDateCreation}
						value={companyData.date_created ? formatDate(companyData.date_created) : null}
					/>
					<InfoRow
						icon={<MaterialIcons name="update" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldDateMaj}
						value={companyData.date_updated ? formatDate(companyData.date_updated) : null}
					/>
				</SectionCard>
				<SectionCard title={t.companies.adminSection} icon="account-balance">
					<InfoRow
						icon={<MaterialIcons name="credit-card" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldNumeroCompte}
						value={companyData.numero_du_compte}
					/>
					<InfoRow
						icon={<MaterialIcons name="fingerprint" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldICE}
						value={companyData.ICE}
					/>
					<InfoRow
						icon={<MaterialIcons name="description" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldRegistreCommerce}
						value={companyData.registre_de_commerce}
					/>
					<InfoRow
						icon={<MaterialIcons name="badge" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldIdentifiantFiscal}
						value={companyData.identifiant_fiscal}
					/>
					<InfoRow
						icon={<MaterialIcons name="receipt-long" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldTaxeProfessionnelle}
						value={companyData.tax_professionnelle}
					/>
					<InfoRow
						icon={<MaterialIcons name="verified-user" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldCNSS}
						value={companyData.CNSS}
					/>
				</SectionCard>
				<SectionCard title={t.companies.responsableSection} icon="person-outline">
					<InfoRow
						icon={<MaterialIcons name="person" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldCivilite}
						value={companyData.civilite_responsable}
					/>
					<InfoRow
						icon={<MaterialIcons name="badge" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldNomResponsable}
						value={companyData.nom_responsable}
					/>
					<InfoRow
						icon={<MaterialIcons name="smartphone" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldGsmResponsable}
						value={companyData.gsm_responsable}
					/>
				</SectionCard>
				<SectionCard title={t.companies.contactSection} icon="contacts">
					<InfoRow
						icon={<MaterialIcons name="mail-outline" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldEmail}
						value={companyData.email}
					/>
					<InfoRow
						icon={<MaterialIcons name="phone" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldTelephone}
						value={companyData.telephone}
					/>
					<InfoRow
						icon={<MaterialIcons name="print" size={20} color={colors.slate[400]} />}
						label={t.companies.fieldFax}
						value={companyData.fax}
					/>
				</SectionCard>
				<SectionCard title={t.companies.settingsSection} icon="settings">
					<InfoRow
						icon={<MaterialIcons name="currency-exchange" size={20} color={colors.slate[400]} />}
						label={t.companies.foreignCurrencyLabel}
						value={companyData.uses_foreign_currency ? t.common.yes : t.common.no}
					/>
					<InfoRow
						icon={<MaterialIcons name="inventory-2" size={20} color={colors.slate[400]} />}
						label={t.companies.stockManagementLabel}
						value={companyData.stock_management_enabled ? t.common.yes : t.common.no}
					/>
					<InfoRow
						icon={<MaterialIcons name="fact-check" size={20} color={colors.slate[400]} />}
						label={t.companies.inventoryManagementLabel}
						value={companyData.inventory_management_enabled ? t.common.yes : t.common.no}
					/>
				</SectionCard>
				<SectionCard title={t.companies.managersSection} icon="manage-accounts">
					{companyData.admins?.map((entry) => (
						<View key={entry.id} className="gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
							<View className="flex-row items-center gap-3">
								<EntityImage
									label={
										[entry.first_name, entry.last_name].filter(Boolean).join(' ').trim() ||
										t.users.userFallback(entry.id)
									}
									avatar
									icon="person-outline"
								/>
								<View className="flex-1 gap-2">
									<Text className="text-ink dark:text-slate-100 font-poppins-medium">
										{[entry.first_name, entry.last_name].filter(Boolean).join(' ').trim() ||
											t.users.userFallback(entry.id)}
									</Text>
									<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
										<MaterialIcons name="shield" size={14} color={colors.brand} />
										<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">
											{entry.role || t.common.noData}
										</Text>
									</View>
								</View>
							</View>
							<InfoRow
								icon={<MaterialIcons name="verified" size={20} color={colors.slate[400]} />}
								label={t.managedByTable.invoiceValidation}
								value={entry.can_validate_factures ? t.common.yes : t.common.no}
							/>
							<InfoRow
								icon={<MaterialIcons name="published-with-changes" size={20} color={colors.slate[400]} />}
								label={t.managedByTable.documentStatusChange}
								value={entry.can_change_document_status ? t.common.yes : t.common.no}
							/>
						</View>
					))}
					{!companyData.admins?.length && (
						<Text className="font-sans dark:text-slate-100 py-4 text-center text-sm text-slate-400">
							{t.companies.noManager}
						</Text>
					)}
				</SectionCard>
			</DetailsPage>
			{showSuspendModal && (
				<ConfirmationModal
					title={t.companies.suspendModalTitle}
					body={t.companies.suspendModalBody}
					recordName={companyData.raison_sociale}
					confirmText={t.companies.suspendBtn}
					action="suspend"
					loading={mutation.isLoading}
					onClose={() => setShowSuspendModal(false)}
					onConfirm={() => void handleSuspend()}
				/>
			)}
		</>
	);
};

const CompaniesViewPage = () => {
	const { t } = useLanguage();
	const params = useLocalSearchParams<{
		id?: string | string[];
	}>();
	const id = parseEntityId(params.id);
	if (id === null)
		return (
			<DetailsPage>
				<SectionCard>
					<ApiAlert errorDetails={t.notFound.message} />
					<PrimaryLoadingButton
						buttonText={t.common.back}
						onClick={() => router.dismissTo(COMPANIES_LIST)}
						inverted
						active
						loading={false}
					/>
				</SectionCard>
			</DetailsPage>
		);
	return <CompaniesViewPageContent key={id} id={id} />;
};

export default CompaniesViewPage;
