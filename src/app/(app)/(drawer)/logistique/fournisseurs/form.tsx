import { useRef, type ComponentProps } from 'react';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import type { LogistiqueSupplier, LogistiqueSupplierFormValues } from '@/types/logistiqueTypes';
import {
	useGetLogistiqueSupplierQuery,
	useAddLogistiqueSupplierMutation,
	useEditLogistiqueSupplierMutation,
} from '@/store/services/logistique';
import { useGetUserCompaniesQuery } from '@/store/services/company';
import { useGetMarqueListQuery } from '@/store/services/parameter';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useLanguage, useToast } from '@/utils/hooks';
import { parseEntityId, extractApiErrorMessage, setFormikAutoErrors } from '@/utils/helpers';
import { logistiqueSupplierSchema } from '@/utils/formValidationSchemas';
import { LOGISTIQUE_SUPPLIER_VIEW } from '@/utils/routes';
import { logistiqueManagerRoles } from '@/utils/rawData';
import { colors, listSpacing } from '@/utils/themes';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ChipSelectFilter from '@/components/shared/chipSelectFilter/chipSelectFilter';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import QueryError from '@/components/shared/queryError/queryError';
import NoPermission from '@/components/shared/noPermission/noPermission';

type Props = {
	company_id: number;
	rawData?: LogistiqueSupplier;
};

const FormikContent = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const token = useInitAccessToken();
	const pending = useRef(false);
	const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
	const brandsQuery = useGetMarqueListQuery({ company_id: props.company_id }, { skip: !token });
	const [add, adding] = useAddLogistiqueSupplierMutation();
	const [edit, editing] = useEditLogistiqueSupplierMutation();
	const formik = useFormik<LogistiqueSupplierFormValues>({
		initialValues: {
			nom: props.rawData?.nom ?? '',
			email: props.rawData?.email ?? '',
			marques: props.rawData?.marques ?? [],
			globalError: '',
		},
		validationSchema: toFormikValidationSchema(logistiqueSupplierSchema(t.logistique)),
		validateOnMount: true,
		onSubmit: async (values, { setFieldError }) => {
			if (pending.current || brandsQuery.isLoading || brandsQuery.isError) return;
			pending.current = true;
			setFieldError('globalError', '');
			try {
				const data = {
					company_id: props.company_id,
					nom: values.nom.trim(),
					email: values.email.trim(),
					marques: values.marques,
				};
				const saved = await (props.rawData ? edit({ ...data, id: props.rawData.id }) : add(data)).unwrap();
				onSuccess(t.logistique.supplierSaved);
				// Reuse an existing detail entry when editing from it, keeping the
				// mobile back stack free of duplicate supplier detail screens.
				router.dismissTo(LOGISTIQUE_SUPPLIER_VIEW(saved.id, props.company_id));
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
				onError(extractApiErrorMessage(e, t.logistique.supplierSaveError));
			} finally {
				pending.current = false;
			}
		},
	});
	const busy = formik.isSubmitting || adding.isLoading || editing.isLoading;
	const icon = (name: ComponentProps<typeof MaterialIcons>['name']) => (
		<MaterialIcons name={name} size={20} color={colors.slate[400]} />
	);
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView
				ref={scrollRef}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ padding: listSpacing, gap: listSpacing, paddingBottom: 32 }}
			>
				<SectionCard title={t.logistique.supplierIdentity} icon="business">
					<ChipSelectFilter
						showLabel
						label={t.logistique.fieldBrands}
						icon="star-outline"
						options={brandsQuery.currentData ?? []}
						selectedIds={formik.values.marques}
						onChange={(ids) => {
							void formik.setFieldValue('marques', ids);
						}}
						placeholder={t.logistique.placeholders.marques}
						disabled={busy || brandsQuery.isFetching || brandsQuery.isError}
					/>
					{brandsQuery.isError && (
						<QueryError variant="banner" error={brandsQuery.error} onRetry={() => void brandsQuery.refetch()} />
					)}
					<CustomTextInput
						nativeID="nom"
						label={t.logistique.supplierName}
						placeholder={t.logistique.placeholders.nom}
						required
						maxLength={255}
						value={formik.values.nom}
						onChangeText={formik.handleChange('nom')}
						onBlur={formik.handleBlur('nom')}
						error={!!(formik.touched.nom && formik.errors.nom)}
						helperText={formik.touched.nom ? formik.errors.nom : undefined}
						disabled={busy}
						autoCorrect={false}
						startIcon={icon('business')}
						ai={false}
					/>
					<CustomTextInput
						nativeID="email"
						label={t.logistique.colSupplierEmail}
						placeholder={t.logistique.placeholders.email}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						maxLength={254}
						value={formik.values.email}
						onChangeText={formik.handleChange('email')}
						onBlur={formik.handleBlur('email')}
						error={!!(formik.touched.email && formik.errors.email)}
						helperText={formik.touched.email ? formik.errors.email : undefined}
						disabled={busy}
						startIcon={icon('mail-outline')}
						ai={false}
					/>
				</SectionCard>
				{formik.errors.globalError && <ApiAlert variant="banner" errorDetails={formik.errors.globalError} />}
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					loading={busy}
					active={!busy && !brandsQuery.isLoading && !brandsQuery.isError}
					onClick={() => {
						if (pending.current || busy) return;
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

const LogistiqueSupplierFormPage = () => {
	const params = useLocalSearchParams<{ id?: string | string[]; company_id?: string | string[] }>();
	const id = params.id === undefined ? undefined : parseEntityId(params.id);
	const company_id = parseEntityId(params.company_id);
	const invalid = id === null || company_id === null;
	const token = useInitAccessToken();
	const { t } = useLanguage();
	const memberships = useGetUserCompaniesQuery(undefined, { skip: !token || invalid, refetchOnMountOrArgChange: true });
	const company = memberships.currentData?.find((item) => item.id === company_id);
	const allowed = !!company && logistiqueManagerRoles.has(company.role);
	const query = useGetLogistiqueSupplierQuery(
		{ id: id ?? 0, company_id: company_id ?? 0 },
		{ skip: !token || invalid || !allowed || id === undefined, refetchOnMountOrArgChange: true },
	);
	if (invalid) return <ApiAlert errorDetails={t.notFound.message} />;
	if (!token || memberships.isLoading || memberships.isUninitialized) return <ApiProgress />;
	if (memberships.isError) return <QueryError error={memberships.error} onRetry={() => void memberships.refetch()} />;
	if (!company || !allowed) return <NoPermission />;
	if (id !== undefined) {
		if (query.isError && !query.currentData)
			return <QueryError error={query.error} onRetry={() => void query.refetch()} />;
		if (!query.currentData) return <ApiProgress />;
		if (query.currentData.company !== company.id) return <NoPermission />;
	}
	return (
		<FormikContent
			key={`${company.id}:${id ?? 'new'}`}
			company_id={company.id}
			rawData={id === undefined ? undefined : query.currentData}
		/>
	);
};

export default LogistiqueSupplierFormPage;
