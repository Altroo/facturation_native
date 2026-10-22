import { useRef, useState, type ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { format, isMatch } from 'date-fns';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { getUserCompaniesState } from '@/store/selectors';
import { useDeleteClientMutation, useGetClientHistoryQuery, useGetClientQuery } from '@/store/services/client';
import {
	extractApiErrorMessage,
	formatDate,
	formatNumberWithSpaces,
	parseEntityId,
	runWithCleanup,
} from '@/utils/helpers';
import { openClientStatementPdf } from '@/utils/apiHelpers';
import { CLIENTS_EDIT, CLIENTS_LIST } from '@/utils/routes';
import { colors, listSpacing } from '@/utils/themes';
import type { AccountStatementRow, StatementEntryType, StatementType } from '@/types/clientTypes';
import InfoRow from '@/components/shared/infoRow/infoRow';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import DetailsPage from '@/components/shared/detailsPage/detailsPage';
import DetailsPageActions from '@/components/shared/detailsPageActions/detailsPageActions';
import ListCard from '@/components/shared/listCard/listCard';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import PdfLanguageModal from '@/components/shared/pdfLanguageModal/pdfLanguageModal';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import CustomTabs from '@/components/nativeElements/customTabs/customTabs';
import DateRangeFilterInput from '@/components/shared/dateRangeFilter/dateRangeFilterOperator';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';

type Props = { id: number; company_id: number };

const ClientsViewPageContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const companies = useAppSelector(getUserCompaniesState);
	const company = companies.find((item) => item.id === props.company_id);
	// The parent layout handles authentication; company.role controls actions
	// here as on the web. Django remains responsible for enforcing permissions.
	const canView = !!token && !!company;
	const canEdit = company?.role === 'Caissier' || company?.role === 'Commercial';
	const canPrint = canEdit || company?.role === 'Comptable';
	const query = useGetClientQuery({ id: props.id }, { skip: !canView, refetchOnMountOrArgChange: true });
	// currentData belongs to these exact query arguments. data could still hold
	// the previous client's response while a different ID is being fetched.
	const client = query.currentData;
	const matchesCompany = client?.company === props.company_id;
	const historyQuery = useGetClientHistoryQuery(
		{ id: props.id },
		{ skip: !canView || !matchesCompany, refetchOnMountOrArgChange: true },
	);
	const history = historyQuery.currentData;
	const [deleteRecord, mutation] = useDeleteClientMutation();
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [showLanguageModal, setShowLanguageModal] = useState(false);
	const [historyTab, setHistoryTab] = useState(0);
	const [statementDateFrom, setStatementDateFrom] = useState('');
	const [statementDateTo, setStatementDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
	const [statementType, setStatementType] = useState<StatementType>('all');
	const [pdfLoading, setPdfLoading] = useState(false);
	const mutationInProgress = useRef(false);
	const pdfInProgress = useRef(false);
	const invalidDateValue = [statementDateFrom, statementDateTo].some(
		(value) => value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !isMatch(value, 'yyyy-MM-dd')),
	);
	const invalidDateRange =
		invalidDateValue || (!!statementDateFrom && !!statementDateTo && statementDateFrom > statementDateTo);
	const clientDisplayName =
		client?.raison_sociale || [client?.nom, client?.prenom].filter(Boolean).join(' ') || client?.code_client || '';
	const isPM = client?.client_type === 'PM' || client?.client_type === 'CD';
	const clientTypeLabel =
		client?.client_type === 'PM'
			? t.clients.typePersonneMorale
			: client?.client_type === 'CD'
				? t.clients.typeClientDivers
				: t.clients.typePersonnePhysique;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const formatMoney = (value: string | number | null | undefined, devise = 'MAD') =>
		`${formatNumberWithSpaces(parseMoney(value ?? 0), 2)} ${devise || 'MAD'}`;
	const formatStatementDate = (value: string) => {
		const [year, month, day] = value.slice(0, 10).split('-');
		return year && month && day ? `${day}/${month}/${year}` : '';
	};
	const parseMoney = (value: string | number | null) => {
		const amount = Number(
			String(value ?? 0)
				.replace(/\s/g, '')
				.replace(',', '.'),
		);
		return Number.isFinite(amount) ? amount : 0;
	};

	// Same calculation as the web: invoices debit the account; credit notes and
	// payments credit it. These filters narrow the fetched history, not the
	// server-side search and filters used by the main clients list.
	const typeOrder: Record<StatementEntryType, number> = { opening: 0, invoice: 1, credit_note: 2, payment: 3 };
	const accountStatementRows: AccountStatementRow[] = [
		...(history?.factures ?? []).map((row): AccountStatementRow => ({
			id: `invoice-${row.id}`,
			type: 'invoice',
			date: row.date_facture,
			dueDate: row.date_echeance || row.date_facture,
			piece: t.clients.statementInvoicePiece,
			label: `N° : ${row.numero_facture ?? '-'}`,
			devise: row.devise || 'MAD',
			debit: parseMoney(row.total_ttc_apres_remise),
			credit: 0,
		})),
		...(history?.avoirs ?? []).map((row): AccountStatementRow => ({
			id: `credit-note-${row.id}`,
			type: 'credit_note',
			date: row.date_avoir,
			dueDate: row.date_avoir,
			piece: t.clients.statementCreditNotePiece,
			label: row.facture_origine_numero
				? `Avoir fact N°(${row.facture_origine_numero})`
				: `N° : ${row.numero_avoir ?? '-'}`,
			devise: row.devise || 'MAD',
			debit: 0,
			credit: parseMoney(row.total_ttc_apres_remise),
		})),
		...(history?.reglements ?? []).map((row): AccountStatementRow => ({
			id: `payment-${row.id}`,
			type: 'payment',
			date: row.date_reglement,
			dueDate: row.date_echeance || row.date_reglement,
			piece: t.clients.statementPaymentPiece,
			label: `Reg fact N°(${row.facture_client_numero || row.libelle || '-'}) ${clientDisplayName}`,
			devise: row.devise || 'MAD',
			debit: 0,
			credit: parseMoney(row.montant),
		})),
	]
		.filter((row) => {
			const date = row.date?.slice(0, 10) || '';
			return (
				!invalidDateRange &&
				(statementType === 'all' || row.type === statementType) &&
				(!statementDateFrom || date >= statementDateFrom) &&
				(!statementDateTo || date <= statementDateTo)
			);
		})
		.sort(
			(a, b) =>
				(a.date || '').localeCompare(b.date || '') ||
				typeOrder[a.type] - typeOrder[b.type] ||
				a.label.localeCompare(b.label),
		);
	// The web inserts a blank opening line. It must not enable PDF export when
	// there are no matching documents, or appear for an invalid date range.
	const hasStatementDocuments = accountStatementRows.length > 0;
	if (statementDateFrom && statementType === 'all' && !invalidDateRange && hasStatementDocuments) {
		accountStatementRows.unshift({
			id: 'opening-balance',
			type: 'opening',
			date: statementDateFrom,
			dueDate: '',
			piece: '',
			label: '',
			devise: accountStatementRows[0].devise,
			debit: 0,
			credit: 0,
		});
	}
	// Keep currencies separate: combining MAD and EUR produces a false balance.
	const totals: Record<string, { debit: number; credit: number }> = {};
	accountStatementRows.forEach((row) => {
		const total = totals[row.devise] ?? { debit: 0, credit: 0 };
		total.debit += row.debit;
		total.credit += row.credit;
		totals[row.devise] = total;
	});

	// Normalize display fields only; the API response stays unchanged in RTK Query.
	const historyGroups = [
		(history?.devis ?? []).map((row) => ({
			id: row.id,
			reference: row.numero_devis,
			date: row.date_devis,
			status: row.statut,
			extra: '',
			amount: row.total_ttc_apres_remise,
			devise: row.devise,
		})),
		(history?.factures ?? []).map((row) => ({
			id: row.id,
			reference: row.numero_facture,
			date: row.date_facture,
			status: row.statut,
			extra: row.statut_paiement,
			amount: row.total_ttc_apres_remise,
			devise: row.devise,
		})),
		(history?.avoirs ?? []).map((row) => ({
			id: row.id,
			reference: row.numero_avoir,
			date: row.date_avoir,
			status: row.statut,
			extra: '',
			amount: row.total_ttc_apres_remise,
			devise: row.devise,
		})),
		(history?.reglements ?? []).map((row) => ({
			id: row.id,
			reference: row.libelle || row.facture_client_numero,
			date: row.date_reglement,
			status: row.statut,
			extra: row.mode_reglement_name,
			amount: row.montant,
			devise: row.devise,
		})),
	];
	const historyRows = historyGroups[historyTab];
	const historyLabels = [
		t.clients.historyDevis,
		t.clients.historyFactures,
		t.clients.historyAvoirs,
		t.clients.historyReglements,
	];
	const statementOptions: Array<{ type: StatementType; label: string }> = [
		{ type: 'all', label: t.clients.statementAllTypes },
		{ type: 'invoice', label: t.clients.historyFactures },
		{ type: 'credit_note', label: t.clients.historyAvoirs },
		{ type: 'payment', label: t.clients.historyReglements },
	];

	const handleDelete = async () => {
		if (!canView || !canEdit || !matchesCompany || mutationInProgress.current) return;
		// A ref blocks duplicate taps immediately, before isLoading rerenders.
		mutationInProgress.current = true;
		await runWithCleanup(
			async () => {
				try {
					await deleteRecord({ id: props.id }).unwrap();
					onSuccess(t.clients.deleteSuccess);
					router.dismissTo(CLIENTS_LIST);
				} catch (error) {
					onError(extractApiErrorMessage(error, t.clients.deleteError));
				}
			},
			() => {
				mutationInProgress.current = false;
				setShowDeleteModal(false);
			},
		);
	};
	const handleLanguageSelect = async (language: 'fr' | 'en' | 'nl') => {
		if (
			!canView ||
			!canPrint ||
			!matchesCompany ||
			pdfInProgress.current ||
			!hasStatementDocuments ||
			historyQuery.error ||
			invalidDateRange
		)
			return;
		pdfInProgress.current = true;
		setShowLanguageModal(false);
		setPdfLoading(true);
		await runWithCleanup(
			async () => {
				const opened = await openClientStatementPdf(props.id, props.company_id, language, {
					date_from: statementDateFrom,
					date_to: statementDateTo,
					type: statementType,
				});
				if (!opened) onError(t.errors.documentOpenError);
			},
			() => {
				pdfInProgress.current = false;
				setPdfLoading(false);
			},
		);
	};
	const refresh = () => {
		void query.refetch();
		if (!historyQuery.isUninitialized) void historyQuery.refetch();
	};

	if (!canView) return <NoPermission />;
	if (query.error)
		return (
			<DetailsPage>
				<QueryError error={query.error} onRetry={() => void query.refetch()} loading={query.isFetching} />
			</DetailsPage>
		);
	if (!client) return <ApiProgress />;
	if (!matchesCompany) return <NoPermission />;

	return (
		<>
			{/* One vertical scroll includes every section, as in our other detail
			    pages. No nested, fixed-height grid taking space from the page. */}
			<DetailsPage
				refreshing={query.isFetching || historyQuery.isFetching}
				onRefresh={refresh}
				actions={
					canEdit && (
						<DetailsPageActions
							onEdit={() => {
								const route = CLIENTS_EDIT(props.id);
								router.push({ ...route, params: { ...route.params, company_id: String(props.company_id) } });
							}}
							onDelete={() => setShowDeleteModal(true)}
							loading={mutation.isLoading}
							disabled={pdfLoading}
						/>
					)
				}
			>
				<SectionCard title={t.clients.identitySection} icon="person-outline">
					<InfoRow icon={icon('badge')} label={t.clients.fieldCodeClient} value={client.code_client} />
					<InfoRow icon={icon('person-outline')} label={t.clients.colType} value={clientTypeLabel} />
					{isPM ? (
						<InfoRow icon={icon('business')} label={t.clients.fieldRaisonSociale} value={client.raison_sociale} />
					) : (
						<>
							<InfoRow icon={icon('person')} label={t.clients.colNom} value={client.nom} />
							<InfoRow icon={icon('person')} label={t.clients.colPrenom} value={client.prenom} />
							<InfoRow icon={icon('location-on')} label={t.clients.fieldAdresse} value={client.adresse} />
						</>
					)}
				</SectionCard>
				<SectionCard title={t.clients.contactSection} icon="contacts">
					<InfoRow icon={icon('mail-outline')} label={t.clients.fieldEmail} value={client.email} />
					<InfoRow icon={icon('phone')} label={t.clients.fieldTelephone} value={client.tel} />
				</SectionCard>
				<SectionCard title={t.clients.adminSection} icon="description">
					<InfoRow icon={icon('account-balance')} label={t.clients.fieldNumeroCompte} value={client.numero_du_compte} />
					<InfoRow icon={icon('fingerprint')} label={t.clients.fieldICE} value={client.ICE} />
					<InfoRow icon={icon('gavel')} label={t.clients.fieldRegistreCommerce} value={client.registre_de_commerce} />
					<InfoRow icon={icon('receipt')} label={t.clients.fieldIdentifiantFiscal} value={client.identifiant_fiscal} />
					<InfoRow
						icon={icon('credit-card')}
						label={t.clients.fieldTaxeProfessionnelle}
						value={client.taxe_professionnelle}
					/>
					<InfoRow icon={icon('verified-user')} label={t.clients.fieldCNSS} value={client.CNSS} />
				</SectionCard>
				<SectionCard title={t.clients.villeSection} icon="location-on">
					<InfoRow icon={icon('location-city')} label={t.clients.fieldVille} value={client.ville_name} />
					{/* Empty values stay muted; 0 is a valid immediate payment term. */}
					<InfoRow icon={icon('schedule')} label={t.clients.fieldDelaiPaiement} value={client.delai_de_paiement} />
				</SectionCard>
				<SectionCard title={t.clients.remarkSection} icon="notes">
					<InfoRow icon={icon('notes')} label={t.clients.fieldRemarque} value={client.remarque} />
				</SectionCard>
				<SectionCard title={t.clients.accountStatement} icon="account-balance" variant="list">
					<DateRangeFilterInput
						fromLabel={t.clients.statementDateFrom}
						toLabel={t.clients.statementDateTo}
						value={{ from: statementDateFrom, to: statementDateTo }}
						onChange={(value) => {
							setStatementDateFrom(value.from ?? '');
							setStatementDateTo(value.to ?? '');
						}}
					/>
					<CustomDropDownSelect
						label={t.clients.statementType}
						value={statementOptions.find((item) => item.type === statementType)?.label ?? null}
						items={statementOptions.map((item) => item.label)}
						onChange={(value) => {
							const option = statementOptions.find((item) => item.label === value);
							if (option) setStatementType(option.type);
						}}
					/>
					{invalidDateRange && (
						<ApiAlert
							variant="inline"
							errorDetails={invalidDateValue ? t.dataGrid.invalidDate : t.clients.statementInvalidDates}
						/>
					)}
					{canPrint && (
						<PrimaryLoadingButton
							buttonText={t.clients.statementPrint}
							loading={pdfLoading}
							active={
								!historyQuery.isFetching &&
								!historyQuery.error &&
								hasStatementDocuments &&
								!invalidDateRange &&
								!mutation.isLoading
							}
							inverted
							onClick={() => setShowLanguageModal(true)}
							startIcon={<MaterialIcons name="picture-as-pdf" size={20} color={colors.brand} />}
						/>
					)}
					{historyQuery.error ? (
						<QueryError
							error={historyQuery.error}
							onRetry={() => void historyQuery.refetch()}
							loading={historyQuery.isFetching}
						/>
					) : !history ? (
						<ApiProgress />
					) : !hasStatementDocuments ? (
						<Text className="py-3 font-sans text-sm text-slate-500 dark:text-slate-400">{t.clients.noHistory}</Text>
					) : (
						<View style={{ marginVertical: -listSpacing / 2 }}>
							{/* ListCard owns the spacing between documents. The section
							    stays unframed so each entry has one clear card boundary. */}
							{accountStatementRows.map((row) => (
								<ListCard
									key={row.id}
									testID={row.id}
									header={
										<View className="flex-row flex-wrap items-center justify-between gap-2">
											<Text className="font-poppins-medium text-sm text-ink dark:text-slate-100">
												{formatStatementDate(row.date)}
											</Text>
											{!!row.piece && <CustomBadge label={row.piece} />}
										</View>
									}
								>
									{!!row.label && (
										<Text selectable className="font-poppins-semibold text-sm text-ink dark:text-slate-100">
											{row.label}
										</Text>
									)}
									{!!row.dueDate && (
										<InfoRow
											dense
											icon={icon('event')}
											label={t.clients.statementDueDate}
											value={formatStatementDate(row.dueDate)}
										/>
									)}
									<View className="flex-row gap-3">
										<View className="flex-1">
											<InfoRow
												dense
												icon={icon('north-east')}
												label={t.clients.statementDebit}
												valueTone="danger"
												value={formatMoney(row.debit, row.devise)}
											/>
										</View>
										<View className="flex-1">
											<InfoRow
												dense
												icon={icon('south-west')}
												label={t.clients.statementCredit}
												valueTone="success"
												value={formatMoney(row.credit, row.devise)}
											/>
										</View>
									</View>
								</ListCard>
							))}
							{Object.entries(totals).map(([devise, total]) => (
								<ListCard
									key={devise}
									testID={`statement-total-${devise}`}
									header={
										<Text className="font-poppins-semibold text-base text-ink dark:text-slate-100">
											{t.clients.statementFinalBalance} ({devise})
										</Text>
									}
								>
									<View className="flex-row gap-3">
										<View className="flex-1">
											<InfoRow
												dense
												icon={icon('north-east')}
												label={t.clients.statementDebit}
												valueTone="danger"
												value={formatMoney(total.debit, devise)}
											/>
										</View>
										<View className="flex-1">
											<InfoRow
												dense
												icon={icon('south-west')}
												label={t.clients.statementCredit}
												valueTone="success"
												value={formatMoney(total.credit, devise)}
											/>
										</View>
									</View>
									<InfoRow
										dense
										icon={icon('account-balance-wallet')}
										label={t.clients.statementBalance}
										value={formatMoney(total.debit - total.credit, devise)}
									/>
								</ListCard>
							))}
						</View>
					)}
				</SectionCard>
				<SectionCard title={t.clients.historySection} icon="history" variant="list">
					{/* Reuse company navigation's arrows, selected-tab indicator and
					    automatic reveal. This strip only scrolls horizontally. */}
					<CustomTabs
						testID="client-history-tabs"
						label={t.clients.historySection}
						scrollLeftLabel={t.common.tabsScrollLeft}
						scrollRightLabel={t.common.tabsScrollRight}
						items={historyLabels.map((label, index) => ({
							value: index,
							label: `${label} (${historyGroups[index].length})`,
							accessibilityLabel: label,
						}))}
						value={historyTab}
						onChange={setHistoryTab}
					/>
					{historyQuery.error ? (
						<QueryError
							error={historyQuery.error}
							onRetry={() => void historyQuery.refetch()}
							loading={historyQuery.isFetching}
						/>
					) : !history ? (
						<ApiProgress />
					) : historyRows.length === 0 ? (
						<Text className="py-3 font-sans text-sm text-slate-500 dark:text-slate-400">{t.clients.noHistory}</Text>
					) : (
						<View style={{ marginVertical: -listSpacing / 2 }}>
							{historyRows.map((row) => (
								<ListCard
									key={row.id}
									testID={`history-${historyTab}-${row.id}`}
									header={<InfoRow dense icon={icon('description')} label={t.common.reference} value={row.reference} />}
								>
									<View className="flex-row flex-wrap gap-2">
										{!!row.status && <CustomBadge label={row.status} />}
										{!!row.extra && (
											<CustomBadge label={row.extra} icon={historyTab === 3 ? icon('payments') : undefined} />
										)}
									</View>
									<View className="flex-row gap-3">
										<View className="flex-1">
											<InfoRow dense icon={icon('event')} label={t.common.date} value={formatStatementDate(row.date)} />
										</View>
										<View className="flex-1">
											<InfoRow
												dense
												icon={icon('payments')}
												label={t.reglements.colMontant}
												value={formatMoney(row.amount, row.devise)}
											/>
										</View>
									</View>
								</ListCard>
							))}
						</View>
					)}
				</SectionCard>
				<SectionCard title={t.clients.datesSection} icon="event">
					<InfoRow
						icon={icon('calendar-today')}
						label={t.common.dateCreation}
						value={client.date_created ? formatDate(client.date_created) : null}
					/>
					<InfoRow
						icon={icon('update')}
						label={t.common.dateMaj}
						value={client.date_updated ? formatDate(client.date_updated) : null}
					/>
				</SectionCard>
			</DetailsPage>
			{showDeleteModal && (
				<ConfirmationModal
					title={t.clients.deleteModalTitle}
					body={t.common.irreversible}
					recordName={clientDisplayName}
					confirmText={t.common.delete}
					loading={mutation.isLoading}
					onConfirm={() => void handleDelete()}
					onClose={() => setShowDeleteModal(false)}
				/>
			)}
			{showLanguageModal && (
				<PdfLanguageModal
					onSelectLanguage={(language) => void handleLanguageSelect(language)}
					onClose={() => setShowLanguageModal(false)}
				/>
			)}
		</>
	);
};

const ClientsViewPage = () => {
	// Expo Router replaces Next's server params/searchParams. Validate URL values
	// before mounting the querying component, just like the web's route guard.
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const { t } = useLanguage();
	if (id === null || company_id === null) return <ApiAlert errorDetails={t.notFound.message} />;
	// Reset local filters and modals if this route changes to another client.
	return <ClientsViewPageContent key={`${company_id}:${id}`} id={id} company_id={company_id} />;
};

export default ClientsViewPage;
