import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetCompanyQuery, useGetUserCompaniesQuery } from '@/store/services/company';
import {
	useGetArticleQuery,
	useGetCodeReferenceQuery,
	useAddArticleMutation,
	useEditArticleMutation,
} from '@/store/services/article';
import {
	useGetCategorieListQuery,
	useAddCategorieMutation,
	useEditCategorieMutation,
	useDeleteCategorieMutation,
	useGetEmplacementListQuery,
	useAddEmplacementMutation,
	useEditEmplacementMutation,
	useDeleteEmplacementMutation,
	useGetUniteListQuery,
	useAddUniteMutation,
	useEditUniteMutation,
	useDeleteUniteMutation,
	useGetMarqueListQuery,
	useAddMarqueMutation,
	useEditMarqueMutation,
	useDeleteMarqueMutation,
} from '@/store/services/parameter';
import type { ArticleClass, CompanyClass } from '@/models/classes';
import type { ArticleSchemaType } from '@/types/articleTypes';
import { useLanguage, useToast } from '@/utils/hooks';
import { INPUT_REQUIRED } from '@/utils/formValidationErrorMessages';
import { articleSchema } from '@/utils/formValidationSchemas';
import {
	calculateSalePriceHT,
	calculateSalePriceTTC,
	extractApiErrorMessage,
	formatNumberWithSpaces,
	isNectarRaisonSociale,
	parseEntityId,
	parseNumber,
	safeParseForInput,
	setFormikAutoErrors,
} from '@/utils/helpers';
import { ARTICLES_LIST } from '@/utils/routes';
import { colors } from '@/utils/themes';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import CustomSquareImageUploading from '@/components/nativeElements/customSquareImageUploading/customSquareImageUploading';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import RemarkSection from '@/components/shared/remarkSection/remarkSection';
import EntityCrudControls from '@/components/shared/entityCrudControls/entityCrudControls';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = {
	id?: number;
	company: CompanyClass;
	rawData?: ArticleClass;
	companySelect?: (disabled: boolean) => ReactNode;
	initialReference: string;
	codeQuery: ReturnType<typeof useGetCodeReferenceQuery>;
};

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const isEditMode = props.id !== undefined;
	const isNectar = isNectarRaisonSociale(props.company.raison_sociale);
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const pending = useRef(false);
	const resettingReference = useRef(false);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const [isResettingReference, setIsResettingReference] = useState(false);
	const [addArticle, addMutation] = useAddArticleMutation();
	const [editArticle, editMutation] = useEditArticleMutation();
	const categorieQuery = useGetCategorieListQuery({ company_id: props.company.id }, { skip: !token });
	const emplacementQuery = useGetEmplacementListQuery({ company_id: props.company.id }, { skip: !token });
	const uniteQuery = useGetUniteListQuery({ company_id: props.company.id }, { skip: !token });
	const marqueQuery = useGetMarqueListQuery({ company_id: props.company.id }, { skip: !token });
	const [addCategorie, addingCategorie] = useAddCategorieMutation();
	const [editCategorie, editingCategorie] = useEditCategorieMutation();
	const [deleteCategorie, deletingCategorie] = useDeleteCategorieMutation();
	const [addEmplacement, addingEmplacement] = useAddEmplacementMutation();
	const [editEmplacement, editingEmplacement] = useEditEmplacementMutation();
	const [deleteEmplacement, deletingEmplacement] = useDeleteEmplacementMutation();
	const [addUnite, addingUnite] = useAddUniteMutation();
	const [editUnite, editingUnite] = useEditUniteMutation();
	const [deleteUnite, deletingUnite] = useDeleteUniteMutation();
	const [addMarque, addingMarque] = useAddMarqueMutation();
	const [editMarque, editingMarque] = useEditMarqueMutation();
	const [deleteMarque, deletingMarque] = useDeleteMarqueMutation();
	const parameterLoading = [
		addingCategorie,
		editingCategorie,
		deletingCategorie,
		addingEmplacement,
		editingEmplacement,
		deletingEmplacement,
		addingUnite,
		editingUnite,
		deletingUnite,
		addingMarque,
		editingMarque,
		deletingMarque,
	].some((mutation) => mutation.isLoading);

	// Mount after the initial responses. Parameter/code refetches must not erase
	// a draft, which enableReinitialize would do when the generated reference changes.
	const [initialValues] = useState<ArticleSchemaType>(() => ({
		type_article: props.rawData?.type_article ?? 'Produit',
		reference: props.initialReference,
		company: props.company.id,
		emplacement: props.rawData?.emplacement ?? null,
		marque: props.rawData?.marque ?? null,
		categorie: props.rawData?.categorie ?? null,
		unite: props.rawData?.unite ?? null,
		designation: props.rawData?.designation ?? '',
		prix_achat: isNectar ? 0 : Number(props.rawData?.prix_achat ?? 0),
		devise_prix_achat: isNectar
			? (props.rawData?.devise_prix_vente ?? 'MAD')
			: (props.rawData?.devise_prix_achat ?? 'MAD'),
		// Django stores HT even when the user originally entered a TTC price.
		prix_vente:
			props.rawData?.prix_vente_base === 'TTC'
				? calculateSalePriceTTC(Number(props.rawData.prix_vente ?? 0), Number(props.rawData.tva ?? 20))
				: Number(props.rawData?.prix_vente ?? 0),
		prix_vente_base: props.rawData?.prix_vente_base ?? 'HT',
		devise_prix_vente: props.rawData?.devise_prix_vente ?? 'MAD',
		photo: props.rawData?.photo ?? null,
		photo_cropped: props.rawData?.photo ?? null,
		tva: Number(props.rawData?.tva ?? 20),
		stock_minimum: Number(props.rawData?.stock_minimum ?? 0),
		remarque: props.rawData?.remarque ?? '',
		globalError: '',
	}));
	const formik = useFormik<ArticleSchemaType>({
		initialValues,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(
			articleSchema.superRefine((data, ctx) => {
				// Django requires an emplacement for physical products in stock-enabled companies.
				if (props.company.stock_management_enabled && data.type_article === 'Produit' && !data.emplacement)
					ctx.addIssue({ code: 'custom', path: ['emplacement'], message: INPUT_REQUIRED });
			}),
		),
		onSubmit: async (data, { setFieldError }) => {
			if (pending.current) return;
			pending.current = true;
			const payload = { ...data };
			delete payload.globalError;
			// Articles store one photo field; submit the confirmed crop to Django.
			payload.photo = payload.photo_cropped ?? payload.photo;
			payload.prix_vente = calculateSalePriceHT(
				Number(payload.prix_vente ?? 0),
				Number(payload.tva ?? 0),
				payload.prix_vente_base,
			);
			payload.prix_achat = isNectar ? 0 : Number(payload.prix_achat ?? 0);
			payload.tva = Number(payload.tva ?? 0);
			payload.stock_minimum = Number(payload.stock_minimum ?? 0);
			if (isNectar) payload.devise_prix_achat = payload.devise_prix_vente ?? 'MAD';
			try {
				if (props.id !== undefined) {
					await editArticle({ id: props.id, data: payload }).unwrap();
					onSuccess(t.articles.updateSuccess);
				} else {
					await addArticle({ data: payload }).unwrap();
					onSuccess(t.articles.addSuccess);
					router.dismissTo(ARTICLES_LIST);
				}
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
				onError(extractApiErrorMessage(e, isEditMode ? t.articles.updateError : t.articles.addError));
			} finally {
				pending.current = false;
			}
		},
	});
	const disabled = formik.isSubmitting || addMutation.isLoading || editMutation.isLoading;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	const labels: Partial<Record<keyof ArticleSchemaType, string>> = {
		reference: t.articles.colReference,
		designation: t.articles.colDesignation,
		prix_achat: t.articles.colPrixAchat,
		prix_vente: t.articles.colPrixVente,
		tva: t.articles.fieldTva,
		stock_minimum: t.articles.stockMinimum,
		remarque: t.articles.fieldRemarque,
		photo: t.articles.fieldPhoto,
		photo_cropped: t.articles.fieldPhotoCropped,
		categorie: t.articles.fieldCategorie,
		emplacement: t.articles.fieldEmplacement,
		unite: t.articles.fieldUnite,
		marque: t.articles.fieldMarque,
	};
	const field = (name: keyof ArticleSchemaType, iconName: ComponentProps<typeof MaterialIcons>['name']) => ({
		nativeID: name,
		label: labels[name] ?? name,
		placeholder: labels[name] ?? name,
		value: String(formik.values[name] ?? ''),
		required: name === 'reference' || name === 'designation' || name === 'prix_vente',
		onChangeText: (value: string) => void formik.setFieldValue(name, value),
		onBlur: formik.handleBlur(name),
		disabled,
		startIcon: icon(iconName),
		error: !!formik.errors[name] && (!!formik.touched[name] || hasAttemptedSubmit),
		helperText: formik.touched[name] || hasAttemptedSubmit ? formik.errors[name] : undefined,
	});
	const numericField = (
		name: 'prix_achat' | 'prix_vente' | 'tva' | 'stock_minimum',
		iconName: ComponentProps<typeof MaterialIcons>['name'],
	) => ({
		...field(name, iconName),
		keyboardType: 'decimal-pad' as const,
		// Keep a trailing decimal separator while typing, then validate/normalize it
		// before submission. Native onChangeText has no DOM event or valueAsNumber.
		onChangeText: (value: string) => {
			if (/^\d*([.,]\d*)?$/.test(value)) void formik.setFieldValue(name, safeParseForInput(value));
		},
	});
	const classification = [
		{
			name: 'categorie',
			query: categorieQuery,
			icon: 'category',
			empty: t.articles.noCategorie,
			add: addCategorie,
			edit: editCategorie,
			delete: deleteCategorie,
		},
		{
			name: 'emplacement',
			query: emplacementQuery,
			icon: 'place',
			empty: t.articles.noEmplacement,
			add: addEmplacement,
			edit: editEmplacement,
			delete: deleteEmplacement,
		},
		{
			name: 'unite',
			query: uniteQuery,
			icon: 'straighten',
			empty: t.articles.noUnite,
			add: addUnite,
			edit: editUnite,
			delete: deleteUnite,
		},
		{
			name: 'marque',
			query: marqueQuery,
			icon: 'sell',
			empty: t.articles.noMarque,
			add: addMarque,
			edit: editMarque,
			delete: deleteMarque,
		},
	] as const;
	const price = parseNumber(formik.values.prix_vente ?? 0) ?? 0;
	const vat = parseNumber(formik.values.tva ?? 0) ?? 0;
	const priceHT = calculateSalePriceHT(price, vat, formik.values.prix_vente_base);
	const priceTTC = calculateSalePriceTTC(priceHT, vat);
	const validationMessage = [
		formik.errors.globalError,
		...(hasAttemptedSubmit
			? Object.entries(formik.errors)
					.filter(([key]) => key !== 'globalError')
					.map(([key, message]) => `${labels[key as keyof ArticleSchemaType] ?? key} : ${message}`)
			: []),
	]
		.filter(Boolean)
		.join('\n');
	const resetReference = async () => {
		if (disabled || resettingReference.current) return;
		resettingReference.current = true;
		setIsResettingReference(true);
		try {
			const result = await props.codeQuery.refetch().unwrap();
			if (result.reference) await formik.setFieldValue('reference', result.reference);
			else onError(t.common.genericError);
		} catch (error) {
			onError(extractApiErrorMessage(error, t.common.genericError));
		} finally {
			resettingReference.current = false;
			setIsResettingReference(false);
		}
	};
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				style={{ flex: 1 }}
				keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: 20, paddingBottom: 48, gap: 20, flexGrow: 1 }}
			>
				{props.companySelect?.(disabled)}
				{!!validationMessage && <ApiAlert variant="banner" errorDetails={validationMessage} />}
				<SectionCard title={t.articles.photoSection} icon="photo">
					<CustomSquareImageUploading
						image={formik.values.photo}
						croppedImage={formik.values.photo_cropped}
						label={t.articles.fieldPhoto}
						disabled={disabled}
						onChange={(value) => {
							void formik.setFieldValue('photo', value);
							void formik.setFieldValue('photo_cropped', value);
						}}
						onCrop={(value) => void formik.setFieldValue('photo_cropped', value)}
						error={formik.errors.photo || formik.errors.photo_cropped}
					/>
				</SectionCard>
				<SectionCard title={t.articles.identitySection} icon="inventory-2">
					<CustomDropDownSelect
						label={t.articles.colType}
						required
						items={['Produit', 'Service']}
						value={formik.values.type_article}
						getOptionLabel={(value) => (value === 'Produit' ? t.articles.typeProduit : t.articles.typeService)}
						onChange={(value) => {
							void formik.setFieldValue('type_article', value);
							formik.setErrors({});
						}}
						disabled={disabled}
						startIcon={icon('category')}
					/>
					<CustomTextInput
						{...field('reference', 'tag')}
						autoCapitalize="characters"
						endIcon={
							!isEditMode ? (
								<Pressable
									accessibilityRole="button"
									accessibilityLabel={t.articles.resetReference}
									disabled={disabled || isResettingReference}
									onPress={() => void resetReference()}
									className="h-12 w-12 items-center justify-center"
								>
									<MaterialIcons name="refresh" size={22} color={colors.brand} />
								</Pressable>
							) : undefined
						}
					/>
					{!isEditMode && props.codeQuery.isError && (
						<QueryError
							variant="banner"
							error={props.codeQuery.error}
							loading={isResettingReference}
							disabled={disabled}
							onRetry={() => void resetReference()}
						/>
					)}
					<CustomTextInput {...field('designation', 'description')} multiline numberOfLines={3} />
					{formik.values.type_article === 'Produit' && props.company.stock_management_enabled && (
						<CustomNumberInput
							{...numericField('stock_minimum', 'inventory-2')}
							helperText={
								formik.errors.stock_minimum && (formik.touched.stock_minimum || hasAttemptedSubmit)
									? formik.errors.stock_minimum
									: t.articles.stockMinimumHelp
							}
						/>
					)}
				</SectionCard>
				<SectionCard title={t.articles.pricesSection} icon="payments">
					{!isNectar && (
						<>
							<CustomTextInput {...numericField('prix_achat', 'shopping-cart')} />
							<CustomDropDownSelect
								label={`${t.articles.currency} · ${t.articles.colPrixAchat}`}
								items={['MAD', 'EUR', 'USD']}
								value={formik.values.devise_prix_achat ?? 'MAD'}
								onChange={(value) => void formik.setFieldValue('devise_prix_achat', value)}
								disabled={disabled}
								startIcon={icon('currency-exchange')}
							/>
						</>
					)}
					<CustomTextInput
						{...numericField('prix_vente', 'payments')}
						label={
							isNectar
								? formik.values.prix_vente_base === 'TTC'
									? t.articles.colPrixTTC
									: t.articles.colPrixHT
								: t.articles.colPrixVente
						}
					/>
					{props.company.uses_foreign_currency && (
						<CustomDropDownSelect
							label={`${t.articles.currency} · ${t.articles.colPrixVente}`}
							items={['MAD', 'EUR', 'USD']}
							value={formik.values.devise_prix_vente ?? 'MAD'}
							onChange={(value) => void formik.setFieldValue('devise_prix_vente', value)}
							disabled={disabled}
							startIcon={icon('currency-exchange')}
						/>
					)}
					<CustomDropDownSelect
						label={t.articles.fieldPrixVenteBase}
						items={['HT', 'TTC']}
						value={formik.values.prix_vente_base ?? 'HT'}
						onChange={(value) => void formik.setFieldValue('prix_vente_base', value)}
						disabled={disabled}
						startIcon={icon('receipt')}
					/>
					<CustomNumberInput {...numericField('tva', 'percent')} />
					<View className="gap-1 rounded-xl bg-blue-50 p-3 dark:bg-slate-800">
						<Text className="font-poppins-medium text-sm text-brand dark:text-blue-300">
							{t.articles.colPrixHT} : {formatNumberWithSpaces(priceHT, 2)} {formik.values.devise_prix_vente}
						</Text>
						<Text className="font-poppins-medium text-sm text-brand dark:text-blue-300">
							{t.articles.colPrixTTC} : {formatNumberWithSpaces(priceTTC, 2)} {formik.values.devise_prix_vente}
						</Text>
					</View>
				</SectionCard>
				<SectionCard title={t.articles.classificationSection} icon="category">
					{classification.map((parameter) => {
						const items = (parameter.query.currentData ?? []).map((item) => ({
							code: item.nom,
							value: String(item.id),
						}));
						const selected = items.find((item) => item.value === String(formik.values[parameter.name])) ?? null;
						const label = labels[parameter.name]!;
						return (
							<View key={parameter.name} className="gap-2">
								{parameter.query.isError && (
									<QueryError
										variant="banner"
										error={parameter.query.error}
										loading={parameter.query.isFetching}
										disabled={disabled}
										onRetry={() => void parameter.query.refetch()}
									/>
								)}
								<CustomAutoCompleteSelect
									id={parameter.name}
									required={
										parameter.name === 'emplacement' &&
										formik.values.type_article === 'Produit' &&
										props.company.stock_management_enabled
									}
									label={label}
									items={items}
									value={selected}
									noOptionsText={parameter.empty}
									onChange={(_event, value) =>
										void formik.setFieldValue(parameter.name, value ? Number(value.value) : null)
									}
									onBlur={() => void formik.setFieldTouched(parameter.name, true, false)}
									disabled={disabled || parameterLoading || parameter.query.isLoading}
									startIcon={icon(parameter.icon)}
									error={!!formik.errors[parameter.name] && (!!formik.touched[parameter.name] || hasAttemptedSubmit)}
									helperText={
										formik.touched[parameter.name] || hasAttemptedSubmit ? formik.errors[parameter.name] : undefined
									}
									labelActions={
										<EntityCrudControls
											label={label}
											icon={icon(parameter.icon)}
											selectedItem={selected}
											disabled={disabled || parameterLoading}
											addEntity={({ data }) => parameter.add({ data: { ...data, company: props.company.id } })}
											editEntity={({ id, data }) =>
												parameter.edit({ id, data: { ...data, company: props.company.id } })
											}
											deleteEntity={parameter.delete}
											onAddSuccess={(id) => void formik.setFieldValue(parameter.name, id)}
											onDeleteSuccess={() => void formik.setFieldValue(parameter.name, null)}
										/>
									}
								/>
							</View>
						);
					})}
				</SectionCard>
				<RemarkSection {...field('remarque', 'notes')} title={t.articles.remarkSection} />
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					active={!disabled && !parameterLoading && !isResettingReference}
					loading={disabled}
					onClick={() => {
						setHasAttemptedSubmit(true);
						void formik.submitForm();
						if (!formik.isValid) {
							onError(t.common.correctErrors);
							scrollRef.current?.scrollTo({ y: 0, animated: true });
						}
					}}
				/>
			</PageActionBar>
		</View>
	);
};

const ArticlesFormPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const requestedCompanyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
	const invalidParams = id === null || requestedCompanyId === null;
	const companiesQuery = useGetUserCompaniesQuery(undefined, { skip: !token || invalidParams });
	const articleQuery = useGetArticleQuery(
		{ id: id ?? 0 },
		{ skip: !token || invalidParams || id === undefined, refetchOnMountOrArgChange: true },
	);
	const eligibleCompanies = (companiesQuery.currentData ?? []).filter(
		(company) => company.role === 'Caissier' || company.role === 'Commercial',
	);
	// An edit belongs to the article's actual company. A URL parameter cannot
	// grant a different company's permissions or move the record across tenants.
	const companyId =
		id !== undefined
			? articleQuery.currentData?.company
			: (requestedCompanyId ?? selectedCompanyId ?? eligibleCompanies[0]?.id);
	const company = eligibleCompanies.find((entry) => entry.id === companyId);
	const companyQuery = useGetCompanyQuery({ id: company?.id ?? 0 }, { skip: !token || !company || invalidParams });
	const codeQuery = useGetCodeReferenceQuery(
		{ company_id: company?.id ?? 0 },
		{ skip: !token || !company || invalidParams || id !== undefined, refetchOnMountOrArgChange: true },
	);
	if (invalidParams)
		return (
			<View className="p-5">
				<ApiAlert errorDetails={t.notFound.message} />
			</View>
		);
	if (!token || companiesQuery.isLoading || companiesQuery.isUninitialized) return <ApiProgress />;
	if (companiesQuery.isError && !companiesQuery.currentData)
		return (
			<View className="p-5">
				<QueryError error={companiesQuery.error} onRetry={() => void companiesQuery.refetch()} />
			</View>
		);
	if (id !== undefined && !articleQuery.currentData)
		return articleQuery.isError ? (
			<View className="p-5">
				<QueryError error={articleQuery.error} onRetry={() => void articleQuery.refetch()} />
			</View>
		) : (
			<ApiProgress />
		);
	if (!company || (requestedCompanyId !== undefined && requestedCompanyId !== company.id)) return <NoPermission />;
	if (!companyQuery.currentData)
		return companyQuery.isError ? (
			<View className="p-5">
				<QueryError error={companyQuery.error} onRetry={() => void companyQuery.refetch()} />
			</View>
		) : (
			<ApiProgress />
		);
	if (id === undefined && (codeQuery.isLoading || codeQuery.isUninitialized)) return <ApiProgress />;
	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}`}
			id={id}
			company={companyQuery.currentData}
			rawData={articleQuery.currentData}
			initialReference={articleQuery.currentData?.reference ?? codeQuery.currentData?.reference ?? ''}
			codeQuery={codeQuery}
			companySelect={
				id === undefined && requestedCompanyId === undefined
					? (disabled) => (
							<CustomAutoCompleteSelect
								label={t.shared.selectCompany}
								items={eligibleCompanies.map((item) => ({ code: item.raison_sociale, value: String(item.id) }))}
								value={{ code: company.raison_sociale, value: String(company.id) }}
								noOptionsText={t.shared.noCompaniesFound}
								disabled={disabled}
								startIcon={<MaterialIcons name="business" size={20} color={colors.slate[400]} />}
								onChange={(_event, value) => {
									if (value) setSelectedCompanyId(Number(value.value));
								}}
							/>
						)
					: undefined
			}
		/>
	);
};

export default ArticlesFormPage;
