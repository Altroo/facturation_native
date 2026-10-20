import InfoRow from '@/components/shared/infoRow/infoRow';
import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetCompanyQuery, useSuspendCompanyMutation } from '@/store/services/company';
import { companiesSetUserCompaniesAction } from '@/store/actions/companiesActions';
import { useAppDispatch, useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { normalizeApiError, formatDate, parseEntityId, runWithCleanup } from '@/utils/helpers';
import { COMPANIES_EDIT, COMPANIES_LIST } from '@/utils/routes';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';

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
	const suspendModalActions = [
		{
			text: t.common.cancel,
			active: false,
			color: '#64748b',
			disabled: mutation.isLoading,
			onClick: () => setShowSuspendModal(false),
		},
		{
			text: t.companies.suspendBtn,
			active: true,
			color: '#dc2626',
			disabled: mutation.isLoading,
			icon: mutation.isLoading ? (
				<ActivityIndicator color="#ffffff" />
			) : (
				<MaterialIcons name="delete-outline" size={20} color="#ffffff" />
			),
			onClick: () => void handleSuspend(),
		},
	];
	if (!is_staff) return <NoPermission />;
	const axiosError = normalizeApiError(query.error);
	if (query.error)
		return (
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<ApiAlert
						errorDetails={
							axiosError.status_code === 0
								? t.errors.networkError
								: axiosError.status_code === 403
									? t.noPermission.description
									: axiosError.status_code === 404
										? t.notFound.message
										: axiosError.message
						}
					/>
					<PrimaryLoadingButton buttonText={t.common.retry} onClick={query.refetch} inverted active loading={false} />
				</View>
			</ScrollView>
		);
	const companyData = query.currentData;
	if (!companyData) return <ApiProgress />;
	return (
		<>
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="flex-row items-center gap-4">
						<EntityImage
							image={companyData.logo_cropped || companyData.logo}
							previewImage={companyData.logo}
							label={t.companies.logoLabel}
							large
						/>
						<View className="flex-1 gap-3">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{companyData.raison_sociale}
							</Text>
							<Text className="font-sans text-ink dark:text-slate-100 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
								ID: {companyData.id}
							</Text>
							<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name="business" size={14} color="#0274d7" />
								<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">
									{t.companies.companyChip}
								</Text>
							</View>
						</View>
					</View>
					<PrimaryLoadingButton
						buttonText={t.common.edit}
						onClick={() => router.push(COMPANIES_EDIT(id))}
						active={!mutation.isLoading}
						loading={false}
						startIcon={<MaterialIcons name="edit" size={20} color="#fff" />}
					/>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="business" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.generalSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="business"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldRaisonSociale}
							value={companyData.raison_sociale}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="groups"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldNbrEmploye}
							value={companyData.nbr_employe}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="location-on"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldAdresse}
							value={companyData.adresse}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="language"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldSiteWeb}
							value={companyData.site_web}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="event"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldDateCreation}
							value={formatDate(companyData.date_created ?? null)}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="update"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldDateMaj}
							value={formatDate(companyData.date_updated ?? null)}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="account-balance" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.adminSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="credit-card"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldNumeroCompte}
							value={companyData.numero_du_compte}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="fingerprint"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldICE}
							value={companyData.ICE}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="description"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldRegistreCommerce}
							value={companyData.registre_de_commerce}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="badge"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldIdentifiantFiscal}
							value={companyData.identifiant_fiscal}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="receipt-long"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldTaxeProfessionnelle}
							value={companyData.tax_professionnelle}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="verified-user"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldCNSS}
							value={companyData.CNSS}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="person-outline" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.responsableSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="person"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldCivilite}
							value={companyData.civilite_responsable}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="badge"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldNomResponsable}
							value={companyData.nom_responsable}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="smartphone"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldGsmResponsable}
							value={companyData.gsm_responsable}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="contacts" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.contactSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="mail-outline"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldEmail}
							value={companyData.email}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="phone"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldTelephone}
							value={companyData.telephone}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="print"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.fieldFax}
							value={companyData.fax}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="image" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.stampSection}
							</Text>
						</View>
					</View>
					<>
						<EntityImage
							image={companyData.cachet_cropped || companyData.cachet}
							previewImage={companyData.cachet}
							label={t.companies.stampLabel}
							icon="image"
							large
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="settings" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.settingsSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="currency-exchange"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.foreignCurrencyLabel}
							value={companyData.uses_foreign_currency ? t.common.yes : t.common.no}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="inventory-2"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.stockManagementLabel}
							value={companyData.stock_management_enabled ? t.common.yes : t.common.no}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="fact-check"
									size={20}
									color="#94a3b8"
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.companies.inventoryManagementLabel}
							value={companyData.inventory_management_enabled ? t.common.yes : t.common.no}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="manage-accounts" size={21} color="#0274d7" />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.companies.managersSection}
							</Text>
						</View>
						<Text className="text-ink dark:text-slate-100 rounded-full bg-slate-100 px-3 py-1 font-poppins-medium text-xs dark:bg-slate-800">
							{companyData.admins?.length ?? 0}
						</Text>
					</View>
					<>
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
										<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">ID: {entry.id}</Text>
										<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
											<MaterialIcons name="shield" size={14} color="#0274d7" />
											<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">
												{entry.role || t.common.noData}
											</Text>
										</View>
									</View>
								</View>
								<InfoRow
									icon={
										<MaterialIcons
											name="verified"
											size={20}
											color="#94a3b8"
											style={{
												marginTop: 3,
											}}
										/>
									}
									label={t.managedByTable.invoiceValidation}
									value={entry.can_validate_factures ? t.common.yes : t.common.no}
								/>
								<InfoRow
									icon={
										<MaterialIcons
											name="published-with-changes"
											size={20}
											color="#94a3b8"
											style={{
												marginTop: 3,
											}}
										/>
									}
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
					</>
				</View>
				<PrimaryLoadingButton
					buttonText={t.companies.suspendBtn}
					danger
					inverted
					onClick={() => {
						setShowSuspendModal(true);
					}}
					active={!mutation.isLoading}
					loading={false}
					startIcon={<MaterialIcons name="block" size={20} color="#dc2626" />}
				/>
			</ScrollView>
			{showSuspendModal && (
				<ActionModals
					title={t.companies.suspendModalTitle}
					body={t.companies.suspendModalBody}
					titleIcon={<MaterialIcons name="warning-amber" size={30} color="#dc2626" />}
					titleIconColor="#fef2f2"
					maxWidth="xs"
					fullWidth
					onClose={() => setShowSuspendModal(false)}
					actions={suspendModalActions}
				>
					{!!companyData.raison_sociale && (
						<Text className="font-poppins-medium text-base text-ink dark:text-slate-100">
							{companyData.raison_sociale}
						</Text>
					)}
				</ActionModals>
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
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<ApiAlert errorDetails={t.notFound.message} />
					<PrimaryLoadingButton
						buttonText={t.common.back}
						onClick={() => router.dismissTo(COMPANIES_LIST)}
						inverted
						active
						loading={false}
					/>
				</View>
			</ScrollView>
		);
	return <CompaniesViewPageContent key={id} id={id} />;
};

export default CompaniesViewPage;
