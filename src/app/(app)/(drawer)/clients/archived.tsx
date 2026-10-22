import ClientsListLayout from '@/components/shared/clientsList/clientsList';
import { useBulkArchiveClientsMutation, usePatchArchiveMutation } from '@/store/services/client';
import { useLanguage, useToast } from '@/utils/hooks';

const ClientsArchivedPage = () => {
	const { t } = useLanguage();
	const { onSuccess } = useToast();
	const [patchArchive] = usePatchArchiveMutation();
	const [bulkArchiveClients] = useBulkArchiveClientsMutation();

	// This page owns restoring clients. Django uses the same PATCH endpoints as
	// archiving, with archived: false. RTK Query refreshes both subscribed lists.
	const restoreClients = async (ids: number[], bulk: boolean) => {
		if (bulk) {
			const result = await bulkArchiveClients({ ids, archived: false }).unwrap();
			onSuccess(t.clients.bulkUnarchiveSuccess(result.updated));
		} else {
			await patchArchive({ id: ids[0], data: { archived: false } }).unwrap();
			onSuccess(t.clients.unarchiveSuccess);
		}
	};

	return (
		<ClientsListLayout
			archived
			archiveAction={{
				label: t.common.unarchive,
				bulkLabel: t.clients.bulkUnarchiveBtn,
				bulkTitle: t.clients.bulkUnarchiveModalTitle,
				bulkBody: t.clients.bulkUnarchiveModalBody,
				error: t.clients.unarchiveError,
				bulkError: t.clients.bulkUnarchiveError,
				onConfirm: restoreClients,
			}}
		/>
	);
};

export default ClientsArchivedPage;
