import ArticlesListLayout from '@/components/shared/articlesList/articlesList';
import { useBulkArchiveArticlesMutation, usePatchArchiveMutation } from '@/store/services/article';
import { useLanguage, useToast } from '@/utils/hooks';

const ArticlesArchivedPage = () => {
	const { t } = useLanguage();
	const { onSuccess } = useToast();
	const [patchArchive] = usePatchArchiveMutation();
	const [bulkArchiveArticles] = useBulkArchiveArticlesMutation();

	// This page owns restoring articles. Django uses the same PATCH endpoints as
	// archiving, with archived: false. RTK Query refreshes both subscribed lists.
	const restoreArticles = async (ids: number[], bulk: boolean) => {
		if (bulk) {
			const result = await bulkArchiveArticles({ ids, archived: false }).unwrap();
			onSuccess(t.articles.bulkUnarchiveSuccess(result.updated));
		} else {
			await patchArchive({ id: ids[0], data: { archived: false } }).unwrap();
			onSuccess(t.articles.unarchiveSuccess);
		}
	};

	return (
		<ArticlesListLayout
			archived
			archiveAction={{
				label: t.common.unarchive,
				bulkLabel: t.articles.bulkUnarchiveBtn,
				bulkTitle: t.articles.bulkUnarchiveModalTitle,
				bulkBody: t.articles.bulkUnarchiveModalBody,
				error: t.articles.unarchiveError,
				bulkError: t.articles.bulkUnarchiveError,
				onConfirm: restoreArticles,
			}}
		/>
	);
};

export default ArticlesArchivedPage;
