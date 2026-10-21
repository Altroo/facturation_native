import EntityImage from '@/components/shared/entityImage/entityImage';
import NoPermission from '@/components/shared/noPermission/noPermission';
import QueryError from '@/components/shared/queryError/queryError';
import ListCard from '@/components/shared/listCard/listCard';
import ListCardActions from '@/components/shared/listCardActions/listCardActions';
import InfoRow from '@/components/shared/infoRow/infoRow';
import CustomBooleanBadge from '@/components/nativeElements/customBooleanBadge/customBooleanBadge';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
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
import { extractApiErrorMessage, formatDate, runWithCleanup } from '@/utils/helpers';
import { USERS_ADD, USERS_VIEW, USERS_EDIT } from '@/utils/routes';
import { MODULES_PAGE_SIZE } from '@/utils/rawData';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
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
	const selectedUser = rows.find((user) => user.id === selectedUserId);
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
		<ListCard
			selection={
				editable && user.id
					? {
							label: t.users.selectUser(
								[user.first_name, user.last_name].filter(Boolean).join(' ') ||
									user.email ||
									t.users.userFallback(user.id),
							),
							checked: selectedUserIds.includes(user.id),
							disabled: deleting,
							onChange: () => {
								const id = user.id;
								if (!id) return;
								setSelectedUserIds((previous) =>
									previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id],
								);
							},
						}
					: undefined
			}
			testID={`user-card-${user.id}`}
			disabled={deleting}
			accessibilityLabel={`${t.common.view} ${[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || t.users.userFallback(user.id ?? 0)}`}
			onPress={() => {
				if (user.id) router.push(USERS_VIEW(user.id));
			}}
			actions={
				<ListCardActions
					disabled={deleting}
					onEdit={editable && user.id ? () => router.push(USERS_EDIT(user.id!)) : undefined}
					onDelete={editable && user.id ? () => showDeleteModalCall(user.id!) : undefined}
				/>
			}
			header={
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
					</View>
				</View>
			}
		>
			<View className="flex-row flex-wrap gap-2">
				<CustomBooleanBadge label={t.users.colAdmin} value={user.is_staff} showValue={false} />
				<CustomBooleanBadge label={t.users.colActive} value={user.is_active} />
			</View>
			<View className="gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
				<InfoRow
					dense
					icon={<MaterialIcons name="mail-outline" size={18} color={colors.slate[400]} />}
					label={t.users.colEmail}
					value={user.email}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="groups" size={17} color={colors.slate[400]} />}
					label={t.users.colSexe}
					value={user.gender || '-'}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="event" size={17} color={colors.slate[400]} />}
					label={t.users.colDateInscription}
					value={formatDate(user.date_joined ?? null)}
				/>
				<InfoRow
					dense
					icon={<MaterialIcons name="login" size={17} color={colors.slate[400]} />}
					label={t.users.colDerniereConnexion}
					value={formatDate(user.last_login ?? null)}
				/>
			</View>
		</ListCard>
	);
	return (
		<>
			<PaginatedDataGrid<Partial<UserClass>>
				createAction={editable ? { label: t.users.newUser, onPress: () => router.push(USERS_ADD) } : undefined}
				selectionControl={
					editable && (
						<SelectAllControl
							compact
							accessibilityLabel={someLoadedSelected ? t.shared.clearSelection : t.users.selectLoaded}
							description={t.shared.loadedItems(loadedIds.length)}
							checked={allLoadedSelected ? true : someLoadedSelected ? 'mixed' : false}
							selectedCount={selectedUserIds.length}
							disabled={deleting || query.isFetching || !!query.error || !loadedIds.length}
							onPress={() =>
								setSelectedUserIds((previous) =>
									someLoadedSelected
										? previous.filter((id) => !loadedIds.includes(id))
										: [...new Set([...previous, ...loadedIds])],
								)
							}
						/>
					)
				}
				header={
					!!query.error &&
					!query.isFetchNextPageError && (
						<QueryError error={query.error} onRetry={refresh} loading={query.isFetching} disabled={deleting} />
					)
				}
				selectionActions={
					editable && (
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
						</View>
					)
				}
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
			{showDeleteModal && editable && (
				<ConfirmationModal
					title={t.users.deleteModalTitle}
					body={t.common.irreversible}
					recordName={
						selectedUser
							? [selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.email
							: undefined
					}
					confirmText={t.common.delete}
					action="delete"
					loading={deleting}
					onClose={() => setShowDeleteModal(false)}
					onConfirm={() => void deleteHandler()}
				/>
			)}
			{showBulkDeleteModal && editable && (
				<ConfirmationModal
					title={t.users.bulkDeleteModalTitle(selectedUserIds.length)}
					body={t.common.irreversible}
					confirmText={t.users.bulkDeleteBtn(selectedUserIds.length)}
					action="delete"
					loading={deleting}
					onClose={() => setShowBulkDeleteModal(false)}
					onConfirm={() => void bulkDeleteHandler()}
				/>
			)}
		</>
	);
};

export default UsersListPage;
