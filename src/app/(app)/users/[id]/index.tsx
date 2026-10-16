import { runWithCleanup } from '@/utils/runWithCleanup';
import type { UsersViewInfoRowProps, UsersViewProps } from '@/types/usersTypes';
import type { EntityImageProps } from '@/types/uiTypes';
import ImagePreview from '@/components/htmlElements/modals/imagePreview/imagePreview';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useRef, useState, isValidElement } from 'react';
import { ActivityIndicator, ScrollView, Text, View, Image, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useGetUserQuery, useDeleteUserMutation } from '@/store/services/account';
import { getProfilState } from '@/store/selectors';
import { useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { parseEntityId, USERS_EDIT, USERS_LIST } from '@/utils/routes';
import { extractApiErrorMessage, normalizeApiError, formatDate } from '@/utils/helpers';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';

const InfoRow = ({ icon, label, value }: UsersViewInfoRowProps) => {
	const { t } = useLanguage();
	const empty = value === null || value === undefined || value === '';
	return (
		<View className="flex-row items-start gap-3 py-2">
			{icon}
			<View className="flex-1 gap-1">
				<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">{label}</Text>
				{isValidElement(value) ? (
					value
				) : (
					<Text
						selectable
						className={
							'text-sm leading-6 ' +
							(empty ? 'font-sans text-slate-400' : 'font-poppins-medium text-ink dark:text-slate-100')
						}
					>
						{empty ? t.common.noData : value}
					</Text>
				)}
			</View>
		</View>
	);
};

const EntityImage = ({
	image,
	previewImage,
	label,
	icon = 'business',
	avatar = false,
	large = false,
}: EntityImageProps) => {
	const [open, setOpen] = useState(false);
	const [failedUri, setFailedUri] = useState<string | null>(null);
	const uri = typeof image === 'string' ? image : '';
	const fullUri = typeof previewImage === 'string' && previewImage ? previewImage : uri;
	const visibleImage = !!uri && failedUri !== uri;
	const size = large ? 88 : 56;
	return (
		<>
			<Pressable
				accessibilityRole={visibleImage ? 'button' : undefined}
				accessibilityLabel={label}
				disabled={!visibleImage}
				onPress={() => setOpen(true)}
				className={
					'items-center justify-center overflow-hidden border border-slate-200 bg-blue-50 dark:border-slate-700 dark:bg-slate-800 ' +
					(avatar ? 'rounded-full' : 'rounded-2xl')
				}
				style={{
					width: size,
					height: size,
				}}
			>
				{visibleImage ? (
					<Image
						accessibilityLabel={label}
						source={{
							uri,
						}}
						onError={() => setFailedUri(uri)}
						style={{
							width: size,
							height: size,
						}}
						resizeMode={avatar ? 'cover' : 'contain'}
					/>
				) : (
					<MaterialIcons name={icon} size={large ? 38 : 27} color="#0274d7" />
				)}
			</Pressable>
			{open && <ImagePreview uri={fullUri} label={label} visible onClose={() => setOpen(false)} />}
		</>
	);
};
const UsersViewClient = ({ id }: UsersViewProps) => {
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
	const deleteModalActions = [
		{
			text: t.common.cancel,
			active: false,
			color: '#64748b',
			disabled: mutation.isLoading,
			onClick: () => setShowDeleteModal(false),
		},
		{
			text: t.common.delete,
			active: true,
			color: '#dc2626',
			disabled: mutation.isLoading,
			icon: mutation.isLoading ? (
				<ActivityIndicator color="#ffffff" />
			) : (
				<MaterialIcons name="delete-outline" size={20} color="#ffffff" />
			),
			onClick: () => void handleDelete(),
		},
	];
	if (!allowed) return <NoPermission />;
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
						<View className="flex-1 gap-2">
							<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
								{name}
							</Text>
							<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{userData.email}</Text>
						</View>
					</View>
					<View className="flex-row flex-wrap gap-2">
						<Text className="font-sans text-ink dark:text-slate-100 self-start rounded-full bg-slate-100 px-3 py-1.5 text-xs dark:bg-slate-800">
							ID: {userData.id}
						</Text>
						{userData.is_staff && (
							<View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800">
								<MaterialIcons name="admin-panel-settings" size={14} color="#0274d7" />
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
								color={userData.is_active ? '#059669' : '#64748b'}
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
							startIcon={<MaterialIcons name="edit" size={20} color="#fff" />}
						/>
					)}
				</View>
				<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
					<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
						<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">
							<MaterialIcons name="person-outline" size={21} color="#0274d7" />
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
									color="#94a3b8"
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
							<MaterialIcons name="business" size={21} color="#0274d7" />
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
											<MaterialIcons name="shield" size={14} color="#0274d7" />
											<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">{entry.role}</Text>
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
						startIcon={<MaterialIcons name="delete-outline" size={20} color="#dc2626" />}
					/>
				)}
			</ScrollView>
			{showDeleteModal && (
				<ActionModals
					title={t.users.deleteModalTitle}
					body={t.users.deleteModalBody}
					titleIcon={<MaterialIcons name="warning-amber" size={30} color="#dc2626" />}
					titleIconColor="#fef2f2"
					maxWidth="xs"
					fullWidth
					onClose={() => setShowDeleteModal(false)}
					actions={deleteModalActions}
				>
					{!!name && <Text className="font-poppins-medium text-base text-ink dark:text-slate-100">{name}</Text>}
				</ActionModals>
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
	return <UsersViewClient key={id} id={id} />;
};

export default UsersViewPage;
