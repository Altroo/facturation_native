import { useRef, useState, type ComponentProps } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFormik, type FormikErrors } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { StockAdjustmentFormValues, StockReceiptFormValues, StockInventoryFormValues } from '@/types/stockTypes';
import { useGetArticlesListQuery } from '@/store/services/article';
import { useGetEmplacementListQuery } from '@/store/services/parameter';
import { useGetLogistiqueListQuery, useGetLogistiqueQuery } from '@/store/services/logistique';
import {
	useCreateStockAdjustmentMutation,
	useCreateStockReceiptMutation,
	useCreateInventoryMutation,
	useValidateStockReceiptMutation,
	useValidateInventoryMutation,
	useGetStockBalanceQuery,
} from '@/store/services/stock';
import { stockAdjustmentSchema, stockReceiptSchema, stockInventorySchema } from '@/utils/formValidationSchemas';
import { extractApiErrorMessage, formatNumberWithSpaces, parseNumber, setFormikAutoErrors } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { STOCK_LIST, STOCK_INVENTORY_VIEW, STOCK_RECEIPT_VIEW } from '@/utils/routes';
import { colors, listSpacing } from '@/utils/themes';
import { stockAdjustmentMovementItems } from '@/utils/rawData';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = {
	company_id: number;
	kind: 'adjustment' | 'receipt' | 'inventory';
	balance_id?: number;
};
type Values = StockAdjustmentFormValues & StockReceiptFormValues & StockInventoryFormValues;

// These forms share article/location inputs, keyboard handling and saving UI.
// Their three payloads and the create-then-validate recovery follow the web.
const StockFormContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const receipt = props.kind === 'receipt';
	const inventory = props.kind === 'inventory';
	const pending = useRef(false);
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const [attempted, setAttempted] = useState(false);
	const balanceQuery = useGetStockBalanceQuery(
		{ company_id: props.company_id, id: props.balance_id ?? 0 },
		{ skip: !props.balance_id || props.kind !== 'adjustment' },
	);
	const articlesQuery = useGetArticlesListQuery(
		{ company_id: props.company_id, with_pagination: false, archived: false },
		{ skip: receipt },
	);
	const locationsQuery = useGetEmplacementListQuery({ company_id: props.company_id });
	const ordersQuery = useGetLogistiqueListQuery(
		{ company_id: props.company_id, with_pagination: true, page: 1, pageSize: 100 },
		{ skip: !receipt },
	);
	const [createAdjustment, adjustmentState] = useCreateStockAdjustmentMutation();
	const [createReceipt, receiptState] = useCreateStockReceiptMutation();
	const [validateReceipt, receiptValidation] = useValidateStockReceiptMutation();
	const [createInventory, inventoryState] = useCreateInventoryMutation();
	const [validateInventory, inventoryValidation] = useValidateInventoryMutation();
	const busy =
		adjustmentState.isLoading ||
		receiptState.isLoading ||
		receiptValidation.isLoading ||
		inventoryState.isLoading ||
		inventoryValidation.isLoading;
	const articles = (
		Array.isArray(articlesQuery.currentData) ? articlesQuery.currentData : (articlesQuery.currentData?.results ?? [])
	).filter((article) => article.type_article === 'Produit');
	const eligibleOrders = (ordersQuery.currentData?.results ?? []).filter(
		(order) =>
			order.company === props.company_id &&
			order.statut_commande_lancement === 'Terminée' &&
			order.statut_global !== 'Annulé' &&
			!['Réception locale', 'Livraison client', 'Clôture', 'Annulé'].includes(order.statut),
	);
	const formik = useFormik<Values>({
		initialValues: {
			movement_type: 'adjustment',
			article: balanceQuery.currentData?.article ?? null,
			emplacement: balanceQuery.currentData?.emplacement ?? null,
			quantity: '',
			reason: '',
			counted_quantity: '',
			reference: '',
			note: '',
			logistics_order: null,
			logistics_line: null,
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema<unknown>(
			receipt ? stockReceiptSchema : inventory ? stockInventorySchema : stockAdjustmentSchema,
		),
		validate: (values) => {
			const errors: FormikErrors<Values> = {};
			if (receipt) {
				if (values.logistics_order && !eligibleOrders.some((order) => order.id === values.logistics_order))
					errors.logistics_order = t.stock.noOrders;
				const line = incomingLines.find((item) => item.id === values.logistics_line);
				if (values.logistics_line && !line) errors.logistics_line = t.stock.noIncoming;
				if (line && (parseNumber(values.quantity) ?? 0) > Number(line.remaining_quantity))
					errors.quantity = `${t.stock.remainingQuantity}: ${formatNumberWithSpaces(line.remaining_quantity, 3)}`;
			} else if (values.article && !articles.some((article) => article.id === values.article))
				errors.article = t.stock.noArticle;
			return errors;
		},
		onSubmit: async (values, { setFieldError }) => {
			if (pending.current || blocked) return;
			pending.current = true;
			let createdId: number | null = null;
			try {
				if (receipt) {
					const line = incomingLines.find((item) => item.id === values.logistics_line);
					if (!line) return;
					const created = await createReceipt({
						company_id: props.company_id,
						logistics_order: Number(values.logistics_order),
						reference: values.reference,
						note: values.note,
						lines: [
							{
								logistics_line: line.id,
								article: line.article,
								emplacement: Number(values.emplacement),
								quantity: parseNumber(values.quantity) ?? 0,
							},
						],
					}).unwrap();
					createdId = created.id;
					await validateReceipt({ company_id: props.company_id, id: created.id }).unwrap();
					onSuccess(t.stock.receiptValidateSuccess);
					router.replace(STOCK_RECEIPT_VIEW(created.id, props.company_id));
				} else if (inventory) {
					const created = await createInventory({
						company_id: props.company_id,
						emplacement: Number(values.emplacement),
						reference: values.reference,
						note: values.note,
						lines: [{ article: Number(values.article), counted_quantity: parseNumber(values.counted_quantity) ?? 0 }],
					}).unwrap();
					createdId = created.id;
					await validateInventory({ company_id: props.company_id, id: created.id }).unwrap();
					onSuccess(t.stock.inventoryValidateSuccess);
					router.replace(STOCK_INVENTORY_VIEW(created.id, props.company_id));
				} else {
					await createAdjustment({
						company_id: props.company_id,
						article: Number(values.article),
						emplacement: Number(values.emplacement),
						quantity: parseNumber(values.quantity) ?? 0,
						movement_type: values.movement_type,
						reason: values.reason,
					}).unwrap();
					onSuccess(t.stock.adjustSuccess);
					if (router.canGoBack()) router.back();
					else router.replace({ pathname: STOCK_LIST, params: { company_id: String(props.company_id) } });
				}
			} catch (error) {
				// Creation succeeded but validation failed. Preserve and open that
				// draft so retrying cannot create a second receipt or inventory.
				if (createdId !== null) {
					onError(receipt ? t.stock.receiptDraftSaved : t.stock.inventoryDraftSaved);
					router.replace((receipt ? STOCK_RECEIPT_VIEW : STOCK_INVENTORY_VIEW)(createdId, props.company_id));
				} else {
					onError(
						extractApiErrorMessage(
							error,
							receipt ? t.stock.receiptCreateError : inventory ? t.stock.inventoryCreateError : t.stock.adjustError,
						),
					);
					setFormikAutoErrors({ e: error, setFieldError });
				}
			} finally {
				pending.current = false;
			}
		},
	});
	const orderQuery = useGetLogistiqueQuery(
		{ id: formik.values.logistics_order ?? 0 },
		{ skip: !receipt || !formik.values.logistics_order },
	);
	const incomingLines =
		(orderQuery.currentData?.company === props.company_id ? orderQuery.currentData.lignes : [])?.filter(
			(line) => line.incoming_active && Number(line.remaining_quantity) > 0 && line.type_article !== 'Service',
		) ?? [];
	const initialLoading =
		locationsQuery.isLoading ||
		(!receipt && articlesQuery.isLoading) ||
		(receipt && ordersQuery.isLoading) ||
		(!!props.balance_id && balanceQuery.isLoading);
	const blocked =
		initialLoading ||
		locationsQuery.isError ||
		(!receipt && articlesQuery.isError) ||
		(receipt && (ordersQuery.isError || orderQuery.isError || orderQuery.isFetching));
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const errorFor = (name: keyof Values) => (attempted || formik.touched[name] ? String(formik.errors[name] ?? '') : '');
	const articleItems = articles.map((article) => ({
		value: String(article.id),
		code: `${article.reference} - ${article.designation}`,
	}));
	const locationItems = (locationsQuery.currentData ?? []).map((item) => ({ value: String(item.id), code: item.nom }));
	const orderItems = eligibleOrders.map((order) => ({
		value: String(order.id),
		code: `${order.numero_commande} - ${order.fournisseur}`,
	}));
	const lineItems = incomingLines.map((line) => ({
		value: String(line.id),
		code: `${line.article_reference} - ${line.designation} (${formatNumberWithSpaces(line.remaining_quantity, 3)})`,
	}));
	if (initialLoading) return <ApiProgress />;
	if (balanceQuery.isError)
		return <QueryError error={balanceQuery.error} onRetry={() => void balanceQuery.refetch()} />;
	if (balanceQuery.currentData && balanceQuery.currentData.company !== props.company_id) return <NoPermission />;
	const emplacementField = (
		<CustomAutoCompleteSelect
			id="emplacement"
			label={t.stock.emplacement}
			items={locationItems}
			value={locationItems.find((item) => item.value === String(formik.values.emplacement)) ?? null}
			noOptionsText={t.stock.noEmplacement}
			onChange={(_, value) => void formik.setFieldValue('emplacement', value ? Number(value.value) : null)}
			onBlur={formik.handleBlur('emplacement')}
			required
			disabled={busy}
			startIcon={icon('place')}
			error={!!errorFor('emplacement')}
			helperText={errorFor('emplacement')}
		/>
	);
	const articleField = (
		<CustomAutoCompleteSelect
			id="article"
			label={t.stock.article}
			items={articleItems}
			value={articleItems.find((item) => item.value === String(formik.values.article)) ?? null}
			noOptionsText={t.stock.noArticle}
			onChange={(_, value) => {
				const article = articles.find((item) => String(item.id) === value?.value);
				void formik.setValues({
					...formik.values,
					article: article?.id ?? null,
					emplacement: article?.emplacement ?? null,
				});
			}}
			onBlur={formik.handleBlur('article')}
			required
			disabled={busy}
			startIcon={icon('inventory-2')}
			error={!!errorFor('article')}
			helperText={errorFor('article')}
		/>
	);
	const referenceField = (
		<CustomTextInput
			label={t.stock.reference}
			nativeID="reference"
			placeholder={t.stock.reference}
			value={formik.values.reference}
			onChangeText={formik.handleChange('reference')}
			onBlur={formik.handleBlur('reference')}
			disabled={busy}
			startIcon={icon('tag')}
			error={!!errorFor('reference')}
			helperText={errorFor('reference')}
		/>
	);
	const save = async () => {
		if (busy || blocked) return;
		setAttempted(true);
		const errors = await formik.validateForm();
		if (Object.keys(errors).length) {
			onError(t.common.correctErrors);
			scrollRef.current?.scrollTo({ y: 0, animated: true });
			return;
		}
		await formik.submitForm();
	};
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				contentContainerStyle={{ padding: listSpacing, paddingBottom: listSpacing, gap: listSpacing }}
			>
				{formik.errors.globalError && <ApiAlert errorDetails={formik.errors.globalError} />}
				{locationsQuery.isError && (
					<QueryError error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />
				)}
				{!receipt && articlesQuery.isError && (
					<QueryError error={articlesQuery.error} onRetry={() => void articlesQuery.refetch()} />
				)}
				{receipt && ordersQuery.isError && (
					<QueryError error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
				)}
				{receipt && orderQuery.isError && (
					<QueryError error={orderQuery.error} onRetry={() => void orderQuery.refetch()} />
				)}
				<SectionCard
					title={receipt ? t.stock.logisticsOrder : inventory ? t.stock.inventoryScope : t.stock.adjustTitle}
					icon={receipt ? 'local-shipping' : inventory ? 'fact-check' : 'swap-vert'}
				>
					{receipt ? (
						<>
							<CustomAutoCompleteSelect
								id="logistics_order"
								label={t.stock.logisticsOrder}
								items={orderItems}
								value={orderItems.find((item) => item.value === String(formik.values.logistics_order)) ?? null}
								noOptionsText={t.stock.noOrders}
								required
								disabled={busy}
								startIcon={icon('local-shipping')}
								onChange={(_, value) =>
									void formik.setValues({
										...formik.values,
										logistics_order: value ? Number(value.value) : null,
										logistics_line: null,
										emplacement: null,
										quantity: '',
									})
								}
								onBlur={formik.handleBlur('logistics_order')}
								error={!!errorFor('logistics_order')}
								helperText={errorFor('logistics_order')}
							/>
							<CustomAutoCompleteSelect
								id="logistics_line"
								label={t.stock.incomingArticle}
								items={lineItems}
								value={lineItems.find((item) => item.value === String(formik.values.logistics_line)) ?? null}
								noOptionsText={t.stock.noIncoming}
								required
								disabled={busy || !formik.values.logistics_order || orderQuery.isFetching}
								startIcon={icon('inventory-2')}
								onChange={(_, value) => {
									const line = incomingLines.find((item) => String(item.id) === value?.value);
									void formik.setValues({
										...formik.values,
										logistics_line: line?.id ?? null,
										emplacement: line?.expected_emplacement ?? null,
										quantity: '',
									});
								}}
								onBlur={formik.handleBlur('logistics_line')}
								error={!!errorFor('logistics_line')}
								helperText={errorFor('logistics_line')}
							/>
						</>
					) : inventory ? (
						<>
							{articleField}
							{emplacementField}
						</>
					) : (
						<>
							<CustomDropDownSelect
								label={t.stock.type}
								value={formik.values.movement_type}
								items={stockAdjustmentMovementItems.map((item) => ({
									...item,
									code: item.value === 'opening' ? t.stock.opening : t.stock.adjustment,
								}))}
								getOptionLabel={(value) => (value === 'opening' ? t.stock.opening : t.stock.adjustment)}
								onChange={(value) => void formik.setFieldValue('movement_type', value)}
								required
								disabled={busy}
								startIcon={icon('swap-vert')}
							/>
							{articleField}
							{emplacementField}
						</>
					)}
					{!receipt && !inventory && (
						<CustomNumberInput
							formatted
							decimals={3}
							nativeID="quantity"
							label={t.stock.signedQuantity}
							placeholder={t.stock.signedQuantity}
							value={String(formik.values.quantity)}
							min={-Number.MAX_SAFE_INTEGER}
							onChangeText={formik.handleChange('quantity')}
							onBlur={formik.handleBlur('quantity')}
							required
							disabled={busy}
							startIcon={icon('numbers')}
							error={!!errorFor('quantity')}
							helperText={errorFor('quantity') || t.stock.negativeHint}
						/>
					)}
				</SectionCard>
				{(receipt || inventory) && (
					<SectionCard
						title={receipt ? t.stock.details : t.stock.inventoryCount}
						icon={receipt ? 'receipt-long' : 'inventory-2'}
					>
						{receipt && emplacementField}
						<CustomNumberInput
							formatted
							decimals={3}
							nativeID={inventory ? 'counted_quantity' : 'quantity'}
							label={inventory ? t.stock.countedQuantity : t.stock.quantity}
							placeholder={inventory ? t.stock.countedQuantity : t.stock.quantity}
							value={String(inventory ? formik.values.counted_quantity : formik.values.quantity)}
							min={receipt ? 0.001 : 0}
							max={
								receipt
									? Number(
											incomingLines.find((line) => line.id === formik.values.logistics_line)?.remaining_quantity ??
												Number.MAX_SAFE_INTEGER,
										)
									: undefined
							}
							onChangeText={formik.handleChange(inventory ? 'counted_quantity' : 'quantity')}
							onBlur={formik.handleBlur(inventory ? 'counted_quantity' : 'quantity')}
							required
							disabled={busy}
							startIcon={icon('numbers')}
							error={!!errorFor(inventory ? 'counted_quantity' : 'quantity')}
							helperText={
								errorFor(inventory ? 'counted_quantity' : 'quantity') || (inventory ? t.stock.inventoryHint : undefined)
							}
						/>
						{referenceField}
					</SectionCard>
				)}
				<RemarkSection
					label={props.kind === 'adjustment' ? t.stock.reason : t.stock.note}
					value={props.kind === 'adjustment' ? formik.values.reason : formik.values.note}
					required={props.kind === 'adjustment'}
					disabled={busy}
					maxLength={1000}
					onChangeText={formik.handleChange(props.kind === 'adjustment' ? 'reason' : 'note')}
					onBlur={formik.handleBlur(props.kind === 'adjustment' ? 'reason' : 'note')}
					error={!!errorFor(props.kind === 'adjustment' ? 'reason' : 'note')}
					helperText={errorFor(props.kind === 'adjustment' ? 'reason' : 'note')}
				/>
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton active={!busy && !blocked} loading={busy} onClick={() => void save()} />
			</PageActionBar>
		</View>
	);
};

export default StockFormContent;
