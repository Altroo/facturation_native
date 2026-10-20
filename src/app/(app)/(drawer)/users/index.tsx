import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import type { ColumnDef, FilterModel, SortModel } from 'expo-flash-datagrid';
import type { UserClass } from '@/models/classes';
import PaginatedDataGrid, {
	extractCustomFilterParams,
	getServerFilterOperators,
	getInfiniteRows,
} from '@/components/shared/paginatedDataGrid/paginatedDataGrid';
import {
	useGetUsersInfiniteListInfiniteQuery,
	useDeleteUserMutation,
	useBulkDeleteUsersMutation,
} from '@/store/services/account';
import { getProfilState } from '@/store/selectors';
import { useAppSelector, useLanguage, usePermission, useToast } from '@/utils/hooks';
import { extractApiErrorMessage, normalizeApiError, formatDate, runWithCleanup } from '@/utils/helpers';
import { USERS_ADD, USERS_VIEW, USERS_EDIT } from '@/utils/routes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import SelectAllControl from '@/components/shared/selectAllControl/selectAllControl';
import { colors } from '@/utils/themes';

const UsersListPage = () => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const { is_staff } = usePermission();
	const profile = useAppSelector(getProfilState);
	const [searchTerm, setSearchTerm] = useState('');
	const [sortModel, setSortModel] = useState<SortModel>([]);
	const ordering = sortModel[0] ? `${sortModel[0].sort === 'desc' ? '-' : ''}${sortModel[0].field}` : '';
	const [filterModel, setFilterModel] = useState<FilterModel>({
		items: [],
		logicOperator: 'and',
	});
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
	const [deleteRecord, deleteMutation] = useDeleteUserMutation();
	const [bulkDeleteUsers, bulkMutation] = useBulkDeleteUsersMutation();
	const deletionInProgress = useRef(false);
	const deleting = deleteMutation.isLoading || bulkMutation.isLoading;
	const query = useGetUsersInfiniteListInfiniteQuery(
		{
			pageSize: MODULES_PAGE_SIZE,
			search: searchTerm,
			...(ordering ? { ordering } : {}),
			...extractCustomFilterParams(filterModel).params,
		},
		{
			skip: !is_staff,
			refetchOnMountOrArgChange: true,
		},
	);
	const data = query.currentData;
	const rows = getInfiniteRows(data?.pages).filter((user) => user.id !== profile?.id);
	const loadedIds = rows.flatMap(({ id }) => (typeof id === 'number' && id > 0 ? [id] : []));
	const loadedIdsKey = loadedIds.join(',');
	const [previousLoadedIdsKey, setPreviousLoadedIdsKey] = useState(loadedIdsKey);
	// Reconcile before rendering when refetch or invalidation replaces the loaded pages.
	if (previousLoadedIdsKey !== loadedIdsKey) {
		setPreviousLoadedIdsKey(loadedIdsKey);
		setSelectedUserIds((previous) => {
			const next = previous.filter((id) => loadedIds.includes(id));
			return next.length === previous.length ? previous : next;
		});
		if (selectedUserId !== null && !loadedIds.includes(selectedUserId)) setShowDeleteModal(false);
		if (selectedUserIds.some((id) => !loadedIds.includes(id))) setShowBulkDeleteModal(false);
	}
	if (!is_staff) return <NoPermission />;
	const count = data?.pages[0]?.count ?? 0;
	const loadMore = () => {
		if (query.hasNextPage && !query.isFetching && !query.error && !deleting) void query.fetchNextPage();
	};
	const refresh = () => {
		if (query.isFetching || deleting) return;
		setSelectedUserIds([]);
		void query.refetch();
	};
	const editable = !!profile.id && profile.is_staff;
	const allLoadedSelected = loadedIds.length > 0 && loadedIds.every((id) => selectedUserIds.includes(id));
	const someLoadedSelected = loadedIds.some((id) => selectedUserIds.includes(id));
	const deleteHandler = async () => {
		if (!editable || !selectedUserId || selectedUserId === profile?.id || deletionInProgress.current) return;
		deletionInProgress.current = true;
		await runWithCleanup(
			async () => {
				try {
					await deleteRecord({ id: selectedUserId }).unwrap();
					onSuccess(t.users.deleteSuccess);
				} catch (err) {
					onError(extractApiErrorMessage(err, t.users.deleteError));
				}
			},
			() => {
				setShowDeleteModal(false);
				deletionInProgress.current = false;
			},
		);
	};
	const deleteModalActions = [
		{
			text: t.common.cancel,
			active: false,
			onClick: () => setShowDeleteModal(false),
			icon: <MaterialIcons name="close" size={20} color={colors.slate[500]} />,
			color: colors.slate[500],
			disabled: deleting,
		},
		{
			text: t.common.delete,
			active: true,
			onClick: deleteHandler,
			icon: deleting ? (
				<ActivityIndicator color={colors.white} />
			) : (
				<MaterialIcons name="delete-outline" size={20} color={colors.white} />
			),
			color: colors.danger,
			disabled: deleting,
		},
	];
	const showDeleteModalCall = (id: number) => {
		setSelectedUserId(id);
		setShowDeleteModal(true);
	};
	const bulkDeleteHandler = async () => {
		if (
			!editable ||
			!selectedUserIds.length ||
			selectedUserIds.includes(profile?.id ?? 0) ||
			deletionInProgress.current
		)
			return;
		deletionInProgress.current = true;
		await runWithCleanup(
			async () => {
				try {
					await bulkDeleteUsers({ ids: selectedUserIds }).unwrap();
					onSuccess(t.users.bulkDeleteSuccess(selectedUserIds.length));
				} catch (err) {
					onError(extractApiErrorMessage(err, t.users.bulkDeleteError));
				}
			},
			() => {
				setSelectedUserIds([]);
				setShowBulkDeleteModal(false);
				deletionInProgress.current = false;
			},
		);
	};
	const bulkDeleteModalActions = [
		{
			text: t.common.cancel,
			active: false,
			onClick: () => setShowBulkDeleteModal(false),
			icon: <MaterialIcons name="close" size={20} color={colors.slate[500]} />,
			color: colors.slate[500],
			disabled: deleting,
		},
		{
			text: t.users.bulkDeleteBtn(selectedUserIds.length),
			active: true,
			onClick: bulkDeleteHandler,
			icon: deleting ? (
				<ActivityIndicator color={colors.white} />
			) : (
				<MaterialIcons name="delete-outline" size={20} color={colors.white} />
			),
			color: colors.danger,
			disabled: deleting,
		},
	];
	const operators = getServerFilterOperators<Partial<UserClass>>();
	const columns: ColumnDef<Partial<UserClass>>[] = [
		{
			field: 'first_name',
			headerName: t.users.colNom,
		},
		{
			field: 'last_name',
			headerName: t.users.colPrenom,
		},
		{
			field: 'email',
			headerName: t.users.colEmail,
		},
		{
			field: 'gender',
			headerName: t.users.colSexe,
			filterOperators: operators.string.filter(({ value }) => value === 'equals'),
			filterSelectOptions: [
				{
					value: 'H',
					label: t.users.filterSexeHomme,
				},
				{
					value: 'F',
					label: t.users.filterSexeFemme,
				},
			],
			filterForceOperator: 'equals',
			filterHideOperator: true,
		},
		{
			field: 'is_staff',
			headerName: t.users.colAdmin,
			type: 'boolean',
		},
		{
			field: 'is_active',
			headerName: t.users.colActive,
			type: 'boolean',
		},
		{
			field: 'date_joined',
			headerName: t.users.colDateInscription,
			type: 'date',
		},
		{
			field: 'last_login',
			headerName: t.users.colDerniereConnexion,
			type: 'date',
		},
	];
	const renderRow = (user: Partial<UserClass>) => (
		<View className="py-2">
			<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
				{editable && !!user.id && (
					<Pressable
						accessibilityRole="checkbox"
						accessibilityLabel={t.users.selectUser(
							[user.first_name, user.last_name].filter(Boolean).join(' ') ||
								user.email ||
								t.users.userFallback(user.id),
						)}
						accessibilityState={{
							checked: selectedUserIds.includes(user.id),
							disabled: deleting,
						}}
						disabled={deleting}
						onPress={() => {
							const id = user.id;
							if (id)
								setSelectedUserIds((previous) =>
									previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
								);
						}}
						className={'min-h-11 flex-row items-center gap-3 py-2 ' + (deleting ? 'opacity-50' : '')}
					>
						<MaterialIcons
							name={selectedUserIds.includes(user.id) ? 'check-box' : 'check-box-outline-blank'}
							size={24}
							color={selectedUserIds.includes(user.id) ? colors.brand : colors.slate[400]}
						/>
						<Text className="font-sans text-ink dark:text-slate-100 flex-1 text-sm">
							{t.users.selectUser(
								[user.first_name, user.last_name].filter(Boolean).join(' ') ||
									user.email ||
									t.users.userFallback(user.id),
							)}
						</Text>
					</Pressable>
				)}
				<View className="flex-row items-center gap-3">
					<EntityImage
						image={user.avatar_cropped || user.avatar}
						previewImage={user.avatar}
						label={[user.first_name, user.last_name].filter(Boolean).join(' ') || t.users.fieldAvatar}
						avatar
						icon="person-outline"
					/>
					<View className="flex-1 gap-1">
						<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-lg">
							{user.first_name} {user.last_name}
						</Text>
						<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{user.email}</Text>
					</View>
				</View>
				<View className="flex-row flex-wrap gap-2">
					{user.is_staff && (
						<View
							className={
								'flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 bg-blue-50 dark:bg-slate-800'
							}
						>
							<MaterialIcons name={'admin-panel-settings'} size={14} color={colors.brand} />
							<Text className={'font-poppins-medium text-xs text-brand dark:text-blue-300'}>{t.users.adminChip}</Text>
						</View>
					)}
					<View
						className={
							'flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 ' +
							(user.is_active ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-slate-100 dark:bg-slate-800')
						}
					>
						<MaterialIcons
							name={user.is_active ? 'check-circle-outline' : 'remove-circle-outline'}
							size={14}
							color={user.is_active ? colors.success : colors.slate[500]}
						/>
						<Text
							className={
								'font-poppins-medium text-xs ' +
								(user.is_active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400')
							}
						>
							{user.is_active ? t.users.activeChip : t.users.inactiveChip}
						</Text>
					</View>
				</View>
				<View className="gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
					<View className="flex-row items-center gap-2">
						<MaterialIcons name="groups" size={17} color={colors.slate[400]} />
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
							{t.users.colSexe}: {user.gender || '-'}
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<MaterialIcons name="event" size={17} color={colors.slate[400]} />
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
							{t.users.colDateInscription}: {formatDate(user.date_joined ?? null)}
						</Text>
					</View>
					<View className="flex-row items-center gap-2">
						<MaterialIcons name="login" size={17} color={colors.slate[400]} />
						<Text className="font-sans text-xs text-slate-500 dark:text-slate-400">
							{t.users.colDerniereConnexion}: {formatDate(user.last_login ?? null)}
						</Text>
					</View>
				</View>
				<View className="mt-1 flex-row gap-3">
					<View className="flex-1">
						<PrimaryLoadingButton
							buttonText={t.common.view}
							inverted
							onClick={() => {
								if (user.id) router.push(USERS_VIEW(user.id));
							}}
							active={!deleting}
							loading={false}
							startIcon={<MaterialIcons name="visibility" size={20} color={colors.brand} />}
						/>
					</View>
					{editable && (
						<View className="flex-1">
							<PrimaryLoadingButton
								buttonText={t.common.edit}
								inverted
								onClick={() => {
									if (user.id) router.push(USERS_EDIT(user.id));
								}}
								active={!deleting}
								loading={false}
								startIcon={<MaterialIcons name="edit" size={20} color={colors.brand} />}
							/>
						</View>
					)}
				</View>
				{editable && !!user.id && (
					<PrimaryLoadingButton
						buttonText={t.common.delete}
						danger
						inverted
						onClick={() => {
							if (user.id) showDeleteModalCall(user.id);
						}}
						active={!deleting}
						loading={false}
						startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
					/>
				)}
			</View>
		</View>
	);
	const axiosError = normalizeApiError(query.error);
	return (
		<>
			<View className="flex-1 gap-3 bg-slate-50 p-4 dark:bg-night">
				<View className="flex-row items-center gap-4 py-1">
					<View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-panel">
						<MaterialIcons name={'people-outline'} size={25} color={colors.brand} />
					</View>
					<View className="flex-1 gap-1">
						<Text accessibilityRole="header" className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
							{t.users.listTitle}
						</Text>
					</View>
				</View>
				{editable && (
					<View className="flex-row flex-wrap gap-2">
						<PrimaryLoadingButton
							buttonText={t.users.newUser}
							onClick={() => router.push(USERS_ADD)}
							active={!deleting}
							loading={false}
							startIcon={<MaterialIcons name="person-add" size={20} color={colors.white} />}
						/>
					</View>
				)}
				{editable && (
					<View className="gap-2">
						<SelectAllControl
							accessibilityLabel={t.users.selectLoaded}
							description={t.shared.loadedItems(loadedIds.length)}
							checked={allLoadedSelected ? true : someLoadedSelected ? 'mixed' : false}
							selectedCount={selectedUserIds.length}
							disabled={deleting || query.isFetching || !!query.error || !loadedIds.length}
							onPress={() =>
								setSelectedUserIds((previous) =>
									allLoadedSelected
										? previous.filter((id) => !loadedIds.includes(id))
										: [...new Set([...previous, ...loadedIds])],
								)
							}
						/>
						{!!selectedUserIds.length && (
							<View className="flex-row flex-wrap gap-2">
								<PrimaryLoadingButton
									buttonText={t.users.bulkDeleteBtn(selectedUserIds.length)}
									danger
									inverted
									onClick={() => setShowBulkDeleteModal(true)}
									active={!(deleting || query.isFetching || !!query.error)}
									loading={false}
									startIcon={<MaterialIcons name="delete-outline" size={20} color={colors.danger} />}
								/>
								<PrimaryLoadingButton
									buttonText={t.users.clearSelection}
									inverted
									onClick={() => setSelectedUserIds([])}
									active={!deleting}
									loading={false}
								/>
							</View>
						)}
					</View>
				)}
				{!!query.error && !query.isFetchNextPageError && (
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
						<PrimaryLoadingButton
							buttonText={t.common.retry}
							inverted
							onClick={refresh}
							active
							loading={false}
							startIcon={<MaterialIcons name="refresh" size={20} color={colors.brand} />}
						/>
					</View>
				)}
				<PaginatedDataGrid<Partial<UserClass>>
					testID="users-grid"
					rows={rows}
					columns={columns}
					sorting={{
						ordering,
						sortModel,
						onSortModelChange: (model) => {
							if (JSON.stringify(model) === JSON.stringify(sortModel)) return;
							setSortModel(model);
							setSelectedUserIds([]);
							setShowDeleteModal(false);
							setShowBulkDeleteModal(false);
						},
					}}
					getRowId={(row) => String(row.id)}
					rowCount={count ?? 0}
					isLoading={query.isFetching && !data}
					disabled={deleting}
					onRefresh={refresh}
					refreshing={query.isFetching && !query.isFetchingNextPage && !!data}
					onEndReached={loadMore}
					isFetchingNextPage={query.isFetchingNextPage}
					hasNextPage={query.hasNextPage}
					loadMoreError={query.isFetchNextPageError}
					onRetryLoadMore={() => {
						if (!query.isFetching) void query.fetchNextPage();
					}}
					renderRow={renderRow}
					filterModel={filterModel}
					onFilterModelChange={(value) => {
						setFilterModel(value);
						setSelectedUserIds([]);
						setShowDeleteModal(false);
						setShowBulkDeleteModal(false);
					}}
					searchTerm={searchTerm}
					setSearchTerm={(value) => {
						setSearchTerm(value);
						setSelectedUserIds([]);
						setShowDeleteModal(false);
						setShowBulkDeleteModal(false);
					}}
					selectedIds={selectedUserIds}
				/>
			</View>
			{showDeleteModal && editable && (
				<ActionModals
					title={t.users.deleteModalTitle}
					body={t.users.deleteModalBody}
					titleIcon={<MaterialIcons name="warning-amber" size={30} color={colors.danger} />}
					titleIconColor={colors.dangerBackground}
					maxWidth="xs"
					fullWidth
					onClose={() => setShowDeleteModal(false)}
					actions={deleteModalActions}
				/>
			)}
			{showBulkDeleteModal && editable && (
				<ActionModals
					title={t.users.bulkDeleteModalTitle(selectedUserIds.length)}
					body={t.users.bulkDeleteModalBody(selectedUserIds.length)}
					titleIcon={<MaterialIcons name="warning-amber" size={30} color={colors.danger} />}
					titleIconColor={colors.dangerBackground}
					maxWidth="xs"
					fullWidth
					onClose={() => setShowBulkDeleteModal(false)}
					actions={bulkDeleteModalActions}
				/>
			)}
		</>
	);
};

export default UsersListPage;
