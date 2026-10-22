import { router } from 'expo-router';
import ClientsListLayout from '@/components/shared/clientsList/clientsList';
import { useBulkArchiveClientsMutation, usePatchArchiveMutation } from '@/store/services/client';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { CLIENTS_ADD } from '@/utils/routes';

const ClientsListPage = () => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [patchArchive] = usePatchArchiveMutation();
	const [bulkArchiveClients] = useBulkArchiveClientsMutation();

	// Undo belongs to this page's archive action. Keep the original IDs, even if
	// the user switches companies before pressing the toast's undo button.
	const undoArchive = async (ids: number[], bulk: boolean) => {
		try {
			if (bulk) {
				const result = await bulkArchiveClients({ ids, archived: false }).unwrap();
				onSuccess(t.clients.bulkUnarchiveSuccess(result.updated));
			} else {
				await patchArchive({ id: ids[0], data: { archived: false } }).unwrap();
				onSuccess(t.clients.unarchiveSuccess);
			}
		} catch (error) {
			onError(extractApiErrorMessage(error, bulk ? t.clients.bulkUnarchiveError : t.clients.unarchiveError));
		}
	};

	const archiveClients = async (ids: number[], bulk: boolean) => {
		if (bulk) {
			const result = await bulkArchiveClients({ ids, archived: true }).unwrap();
			onSuccess(t.clients.bulkArchiveSuccess(result.updated), {
				label: t.common.undo,
				onPress: () => void undoArchive(ids, true),
			});
		} else {
			await patchArchive({ id: ids[0], data: { archived: true } }).unwrap();
			onSuccess(t.clients.archiveSuccess, {
				label: t.common.undo,
				onPress: () => void undoArchive(ids, false),
			});
		}
	};

	return (
		<ClientsListLayout
			archived={false}
			archiveAction={{
				label: t.common.archive,
				bulkLabel: t.clients.bulkArchiveBtn,
				bulkTitle: t.clients.bulkArchiveModalTitle,
				bulkBody: t.clients.bulkArchiveModalBody,
				error: t.clients.archiveError,
				bulkError: t.clients.bulkArchiveError,
				onConfirm: archiveClients,
			}}
			createAction={{
				label: t.clients.newClient,
				// Expo Router puts company_id in the destination URL, like Next.js.
				// The form reads it with useLocalSearchParams.
				onPress: (company_id) => router.push({ pathname: CLIENTS_ADD, params: { company_id: String(company_id) } }),
			}}
		/>
	);
};

export default ClientsListPage;
