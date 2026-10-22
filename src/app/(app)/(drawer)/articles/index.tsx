import { router } from 'expo-router';
import ArticlesListLayout from '@/components/shared/articlesList/articlesList';
import { useBulkArchiveArticlesMutation, usePatchArchiveMutation } from '@/store/services/article';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { ARTICLES_ADD } from '@/utils/routes';

const ArticlesListPage = () => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const [patchArchive] = usePatchArchiveMutation();
	const [bulkArchiveArticles] = useBulkArchiveArticlesMutation();

	// Undo belongs to this page's archive action. Keep the original IDs, even if
	// the user switches companies before pressing the toast's undo button.
	const undoArchive = async (ids: number[], bulk: boolean) => {
		try {
			if (bulk) {
				const result = await bulkArchiveArticles({ ids, archived: false }).unwrap();
				onSuccess(t.articles.bulkUnarchiveSuccess(result.updated));
			} else {
				await patchArchive({ id: ids[0], data: { archived: false } }).unwrap();
				onSuccess(t.articles.unarchiveSuccess);
			}
		} catch (error) {
			onError(extractApiErrorMessage(error, bulk ? t.articles.bulkUnarchiveError : t.articles.unarchiveError));
		}
	};

	const archiveArticles = async (ids: number[], bulk: boolean) => {
		if (bulk) {
			const result = await bulkArchiveArticles({ ids, archived: true }).unwrap();
			onSuccess(t.articles.bulkArchiveSuccess(result.updated), {
				label: t.common.undo,
				onPress: () => void undoArchive(ids, true),
			});
		} else {
			await patchArchive({ id: ids[0], data: { archived: true } }).unwrap();
			onSuccess(t.articles.archiveSuccess, {
				label: t.common.undo,
				onPress: () => void undoArchive(ids, false),
			});
		}
	};

	return (
		<ArticlesListLayout
			archived={false}
			archiveAction={{
				label: t.common.archive,
				bulkLabel: t.articles.bulkArchiveBtn,
				bulkTitle: t.articles.bulkArchiveModalTitle,
				bulkBody: t.articles.bulkArchiveModalBody,
				error: t.articles.archiveError,
				bulkError: t.articles.bulkArchiveError,
				onConfirm: archiveArticles,
			}}
			createAction={{
				label: t.articles.newArticle,
				// Expo Router puts company_id in the destination URL, like Next.js.
				// The form reads it with useLocalSearchParams.
				onPress: (company_id) => router.push({ pathname: ARTICLES_ADD, params: { company_id: String(company_id) } }),
			}}
		/>
	);
};

export default ArticlesListPage;
