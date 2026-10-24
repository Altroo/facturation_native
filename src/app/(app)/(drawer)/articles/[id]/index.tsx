import { useRef, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useGetArticleQuery, useDeleteArticleMutation } from '@/store/services/article';
import {
	calculateSalePriceTTC,
	extractApiErrorMessage,
	formatDate,
	formatNumberWithSpaces,
	isNectarRaisonSociale,
	parseEntityId,
} from '@/utils/helpers';
import { ARTICLES_EDIT, ARTICLES_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';
import InfoRow from '@/components/shared/infoRow/infoRow';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import EntityImage from '@/components/shared/entityImage/entityImage';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';

type Props = { id: number; company_id: number };

const ArticlesViewPageContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const companies = useAppSelector(getUserCompaniesState);
	const company = companies.find((item) => item.id === props.company_id);
	const canView = !!token && !!company && ['Caissier', 'Lecture', 'Comptable', 'Commercial'].includes(company.role);
	const canEdit = company?.role === 'Caissier' || company?.role === 'Commercial';
	const query = useGetArticleQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	// currentData never displays a previous article while a new route is loading.
	const article = query.currentData;
	const [deleteArticle, mutation] = useDeleteArticleMutation();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const pending = useRef(false);
	const isNectar = isNectarRaisonSociale(company?.raison_sociale);
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const money = (value: number | null | undefined, currency: string) =>
		`${formatNumberWithSpaces(value ?? 0, 2)} ${currency}`;
	const handleDelete = async () => {
		if (!canEdit || !article || article.company !== props.company_id || pending.current) return;
		pending.current = true;
		try {
			await deleteArticle({ id: props.id }).unwrap();
			onSuccess(t.articles.deleteSuccess);
			router.dismissTo(ARTICLES_LIST);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.articles.deleteError));
		} finally {
			pending.current = false;
			setShowDeleteModal(false);
		}
	};
	if (!canView) return <NoPermission />;
	if (!article)
		return query.isError ? (
			<View className="p-5">
				<QueryError error={query.error} onRetry={() => void query.refetch()} />
			</View>
		) : (
			<ApiProgress />
		);
	// A valid record ID is not enough: retain the selected company's boundary.
	if (article.company !== props.company_id) return <NoPermission />;
	return (
		<>
			<DetailsPage
				refreshing={query.isFetching}
				onRefresh={() => {
					if (!query.isFetching && !mutation.isLoading) void query.refetch();
				}}
				actions={
					canEdit ? (
						<DetailsPageActions
							disabled={mutation.isLoading}
							loading={mutation.isLoading}
							onEdit={() => {
								const route = ARTICLES_EDIT(props.id);
								router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
							}}
							onDelete={() => setShowDeleteModal(true)}
						/>
					) : undefined
				}
			>
				{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
				{!!article.photo && (
					<SectionCard title={t.articles.photoSection} icon="photo">
						<EntityImage fullWidth image={article.photo} label={t.articles.fieldPhoto} icon="inventory-2" />
					</SectionCard>
				)}
				<SectionCard title={t.articles.identitySection} icon="inventory-2">
					<CustomBadge label={article.type_article === 'Produit' ? t.articles.typeProduit : t.articles.typeService} />
					<InfoRow icon={icon('tag')} label={t.articles.colReference} value={article.reference} />
					<InfoRow icon={icon('description')} label={t.articles.colDesignation} value={article.designation} />
				</SectionCard>
				<SectionCard title={t.articles.pricesSection} icon="payments">
					{!isNectar && (
						<InfoRow
							icon={icon('shopping-cart')}
							label={t.articles.colPrixAchat}
							value={money(article.prix_achat, article.devise_prix_achat)}
						/>
					)}
					<InfoRow
						icon={icon('payments')}
						label={isNectar ? t.articles.colPrixHT : t.articles.colPrixVente}
						value={money(article.prix_vente, article.devise_prix_vente)}
					/>
					{isNectar && (
						<InfoRow
							icon={icon('receipt')}
							label={t.articles.colPrixTTC}
							value={money(
								calculateSalePriceTTC(Number(article.prix_vente ?? 0), Number(article.tva ?? 0)),
								article.devise_prix_vente,
							)}
						/>
					)}
					<InfoRow
						icon={icon('percent')}
						label={t.articles.fieldTva}
						value={`${formatNumberWithSpaces(article.tva, 2)} %`}
					/>
				</SectionCard>
				<SectionCard title={t.articles.classificationSection} icon="category">
					<InfoRow icon={icon('category')} label={t.articles.fieldCategorie} value={article.categorie_name} />
					<InfoRow icon={icon('place')} label={t.articles.fieldEmplacement} value={article.emplacement_name} />
					<InfoRow icon={icon('straighten')} label={t.articles.fieldUnite} value={article.unite_name} />
					<InfoRow icon={icon('sell')} label={t.articles.fieldMarque} value={article.marque_name} />
				</SectionCard>
				{article.stock_management_enabled && article.type_article === 'Produit' && (
					<SectionCard title={t.articles.stockSection} icon="warehouse">
						<InfoRow
							icon={icon('inventory-2')}
							label={t.articles.physicalQuantity}
							value={formatNumberWithSpaces(article.physical_quantity, 3)}
						/>
						<InfoRow
							icon={icon('lock-outline')}
							label={t.articles.reservedQuantity}
							value={formatNumberWithSpaces(article.reserved_quantity, 3)}
						/>
						<InfoRow
							icon={icon('check-circle-outline')}
							label={t.articles.availableQuantity}
							value={formatNumberWithSpaces(article.available_quantity, 3)}
						/>
						<InfoRow
							icon={icon('local-shipping')}
							label={t.articles.incomingQuantity}
							value={formatNumberWithSpaces(article.incoming_quantity, 3)}
						/>
						<InfoRow
							icon={icon('warning-amber')}
							label={t.articles.stockMinimum}
							value={formatNumberWithSpaces(article.stock_minimum, 3)}
						/>
					</SectionCard>
				)}
				<SectionCard title={t.articles.remarkSection} icon="notes">
					<InfoRow label="" value={article.remarque} />
				</SectionCard>
				<SectionCard title={t.articles.datesSection} icon="event">
					<InfoRow icon={icon('event')} label={t.common.dateCreation} value={formatDate(article.date_created)} />
					<InfoRow icon={icon('update')} label={t.common.dateMaj} value={formatDate(article.date_updated)} />
				</SectionCard>
			</DetailsPage>
			{showDeleteModal && (
				<ConfirmationModal
					title={t.articles.deleteModalTitle}
					body={t.common.irreversible}
					recordName={article.reference}
					action="delete"
					confirmText={t.common.delete}
					loading={mutation.isLoading}
					onConfirm={() => void handleDelete()}
					onClose={() => setShowDeleteModal(false)}
				/>
			)}
		</>
	);
};

const ArticlesViewPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return <ArticlesViewPageContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default ArticlesViewPage;
