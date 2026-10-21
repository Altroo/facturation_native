import InfoRow from '@/components/shared/infoRow/infoRow';
import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetUserQuery, useDeleteUserMutation } from '@/store/services/account';
import { getProfilState } from '@/store/selectors';
import { useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { USERS_EDIT, USERS_LIST } from '@/utils/routes';
import { extractApiErrorMessage, formatDate, parseEntityId, runWithCleanup } from '@/utils/helpers';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import { colors } from '@/utils/themes';

type UsersViewProps = {
	id: number;
};

const UsersViewPageContent = (props: UsersViewProps) => {
	const { id } = props;
	const { t } = useLanguage();
	const { is_staff } = usePermission();
	const { onSuccess, onError } = useToast();
	const profile = useAppSelector(getProfilState);
	const allowed = is_staff && id !== profile?.id;
	const query = useGetUserQuery(
		{
			id,
		},
		{
			skip: !allowed,
			refetchOnMountOrArgChange: true,
		},
	);
	const [deleteRecord, mutation] = useDeleteUserMutation();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const mutationInProgress = useRef(false);
	const handleDelete = async () => {
		if (!allowed || (!profile.id && profile.is_staff) || mutationInProgress.current) return;
		mutationInProgress.current = true;
		await runWithCleanup(
			async () => {
				try {
					await deleteRecord({
						id,
					}).unwrap();
					onSuccess(t.users.deleteSuccess);
					router.dismissTo(USERS_LIST);
				} catch (error) {
					const message = extractApiErrorMessage(error, t.users.deleteError);
					onError(message);
				}
			},
			() => {
				setShowDeleteModal(false);
				mutationInProgress.current = false;
			},
		);
	};
	if (!allowed) return <NoPermission />;
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
				<QueryError
					error={query.error}
					onRetry={() => void query.refetch()}
					loading={query.isFetching}
					disabled={mutation.isLoading}
				/>
			</ScrollView>
		);
	const userData = query.currentData;
	if (!userData) return <ApiProgress />;
	const editable = !!profile.id && profile.is_staff;
	const name = [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email;
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
							image={userData.avatar_cropped || userData.avatar}
							previewImage={userData.avatar}
							label={t.users.fieldAvatar}
							avatar
							icon="person-outline"
							large
						/>
						<View className="min-w-0 flex-1 gap-2">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{name}
							</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
								<Text numberOfLines={1} selectable className="font-sans text-sm text-slate-500 dark:text-slate-400">
									{userData.email}
								</Text>
							</ScrollView>
						</View>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Text className="font-sans text-ink dark:text-slate-100 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
							ID: {userData.id}
						</Text>
						{userData.is_staff && (
							<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name="admin-panel-settings" size={14} color={colors.brand} />
								<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">{t.users.adminChip}</Text>
							</View>
						)}
						<View
							className={
								'flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ' +
								(userData.is_active ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-slate-100 dark:bg-slate-800')
							}
						>
							<MaterialIcons
								name={userData.is_active ? 'check-circle-outline' : 'remove-circle-outline'}
								size={14}
								color={userData.is_active ? colors.success : colors.slate[500]}
							/>
							<Text
								className={
									'font-poppins-medium text-xs ' +
									(userData.is_active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400')
								}
							>
								{userData.is_active ? t.users.activeChip : t.users.inactiveChip}
							</Text>
						</View>
					</View>
					{editable && (
						<PrimaryLoadingButton
							buttonText={t.common.edit}
							onClick={() => router.push(USERS_EDIT(id))}
							active={!mutation.isLoading}
							loading={false}
							startIcon={<MaterialIcons name="edit" size={20} color={colors.white} />}
						/>
					)}
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="person-outline" size={21} color={colors.brand} />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.users.generalInfoSection}
							</Text>
						</View>
					</View>
					<>
						<InfoRow
							icon={
								<MaterialIcons
									name="person"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colNom}
							value={userData.first_name}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="badge"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colPrenom}
							value={userData.last_name}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="mail-outline"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colEmail}
							value={userData.email}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="groups"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colSexe}
							value={userData.gender}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="admin-panel-settings"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colAdmin}
							value={userData.is_staff ? t.common.yes : t.common.no}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="check-circle-outline"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colActive}
							value={userData.is_active ? t.common.yes : t.common.no}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="event"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colDateInscription}
							value={formatDate(userData.date_joined ?? null)}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="update"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.common.dateMaj}
							value={formatDate(userData.date_updated ?? null)}
						/>
						<InfoRow
							icon={
								<MaterialIcons
									name="login"
									size={20}
									color={colors.slate[400]}
									style={{
										marginTop: 3,
									}}
								/>
							}
							label={t.users.colDerniereConnexion}
							value={formatDate(userData.last_login ?? null)}
						/>
					</>
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="business" size={21} color={colors.brand} />
						</View>
						<View className="flex-1 gap-1">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-base">
								{t.users.companiesSection}
							</Text>
						</View>
						<Text className="text-ink dark:text-slate-100 rounded-full bg-slate-100 px-3 py-1 font-poppins-medium text-xs dark:bg-slate-800">
							{userData.companies.length}
						</Text>
					</View>
					<>
						{userData.companies.map((entry) => (
							<View key={entry.company_id} className="gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
								<View className="flex-row items-center gap-3">
									<EntityImage label={entry.raison_sociale} />
									<View className="flex-1 gap-2">
										<Text className="text-ink dark:text-slate-100 font-poppins-medium">{entry.raison_sociale}</Text>
										<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
											ID: {entry.membership_id}
										</Text>
										<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
											<MaterialIcons name="shield" size={14} color={colors.brand} />
											<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">{entry.role}</Text>
										</View>
									</View>
								</View>
								<InfoRow
									icon={
										<MaterialIcons
											name="verified"
											size={20}
											color={colors.slate[400]}
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
											color={colors.slate[400]}
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
						{!userData.companies.length && (
							<Text className="font-sans dark:text-slate-100 py-4 text-center text-sm text-slate-400">
								{t.users.noCompany}
							</Text>
						)}
					</>
				</View>
				{editable && (
					<PrimaryLoadingButton
						buttonText={t.common.delete}
						danger
						inverted
						onClick={() => {
							setShowDeleteModal(true);
						}}
						active={!mutation.isLoading}
						loading={false}
						startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
					/>
				)}
			</ScrollView>
			{showDeleteModal && (
				<ConfirmationModal
					title={t.users.deleteModalTitle}
					body={t.users.deleteModalBody}
					confirmText={t.common.delete}
					action="delete"
					loading={mutation.isLoading}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={() => void handleDelete()}
				>
					{!!name && <Text className="font-poppins-medium text-base text-ink dark:text-slate-100">{name}</Text>}
				</ConfirmationModal>
			)}
		</>
	);
};

const UsersViewPage = () => {
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
						onClick={() => router.dismissTo(USERS_LIST)}
						inverted
						active
						loading={false}
					/>
				</View>
			</ScrollView>
		);
	return <UsersViewPageContent key={id} id={id} />;
};

export default UsersViewPage;
