import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CompanyDocumentsWrapperList from '@/components/shared/company-documents-list/companyDocumentsWrapperList';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import SectionCard from '@/components/shared/sectionCard/sectionCard';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import NoPermission from '@/components/shared/noPermission/noPermission';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import FormattedNumberInput from '@/components/nativeElements/formattedNumberInput/formattedNumberInput';
import CustomNumberInput from '@/components/nativeElements/customNumberInput/customNumberInput';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import { useGetCompanyQuery } from '@/store/services/company';
import {
	useCreateMonthlyObjectivesSettingsMutation,
	useGetMonthlyObjectivesSettingsByCompanyQuery,
	useUpdateMonthlyObjectivesSettingsMutation,
} from '@/store/services/dashboard';
import { getProfilState } from '@/store/selectors';
import { useAppSelector, useLanguage, useToast } from '@/utils/hooks';
import { normalizeApiError, parseEntityId, setFormikAutoErrors } from '@/utils/helpers';
import { monthlyObjectivesSchema } from '@/utils/formValidationSchemas';
import { colors, listSpacing } from '@/utils/themes';
import { DASHBOARD_SETTINGS } from '@/utils/routes';
import type { ReactNode } from 'react';
import type { SearchParams } from '@/types/_initTypes';

type Props = {
	company_id: number;
	tabs: ReactNode;
};

const MonthlyObjectivesForm = (props: Props) => {
	const { t } = useLanguage();
	const { onSuccess, onError } = useToast();
	const company = useGetCompanyQuery({ id: props.company_id });
	const query = useGetMonthlyObjectivesSettingsByCompanyQuery(props.company_id);
	const [create] = useCreateMonthlyObjectivesSettingsMutation();
	const [update] = useUpdateMonthlyObjectivesSettingsMutation();
	const existing = query.currentData;
	const foreign = company.currentData?.uses_foreign_currency ?? false;
	const formik = useFormik({
		initialValues: {
			objectif_ca: existing?.objectif_ca ?? '0',
			objectif_ca_eur: existing?.objectif_ca_eur ?? '',
			objectif_ca_usd: existing?.objectif_ca_usd ?? '',
			objectif_factures: String(existing?.objectif_factures ?? 0),
			objectif_conversion: existing?.objectif_conversion ?? '0',
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(monthlyObjectivesSchema),
		onSubmit: async (values, { setFieldError }) => {
			const data = {
				company: props.company_id,
				objectif_ca: values.objectif_ca.replace(',', '.'),
				objectif_factures: Number(values.objectif_factures),
				objectif_conversion: values.objectif_conversion.replace(',', '.'),
				...(foreign
					? {
							objectif_ca_eur: values.objectif_ca_eur.replace(',', '.') || null,
							objectif_ca_usd: values.objectif_ca_usd.replace(',', '.') || null,
						}
					: {}),
			};
			try {
				if (existing) await update({ id: existing.id, data }).unwrap();
				else await create(data).unwrap();
				onSuccess(existing ? t.monthlyObjectives.updateSuccess : t.monthlyObjectives.createSuccess);
				if (router.canGoBack()) router.back();
				else router.replace(DASHBOARD_SETTINGS);
			} catch (error) {
				onError(existing ? t.monthlyObjectives.updateError : t.monthlyObjectives.createError);
				setFormikAutoErrors({ e: error, setFieldError });
			}
		},
	});
	if (query.isLoading || company.isLoading) return <ApiProgress />;
	// The web treats 404 as "not configured yet", not as a failed dashboard.
	if ((query.isError && normalizeApiError(query.error).status_code !== 404) || company.isError)
		return <ApiAlert errorDetails={normalizeApiError(query.error ?? company.error).message} />;
	const moneyFields = [
		{ name: 'objectif_ca' as const, label: t.monthlyObjectives.fieldCALabel },
		...(foreign
			? [
					{ name: 'objectif_ca_eur' as const, label: t.monthlyObjectives.fieldCAEurLabel },
					{ name: 'objectif_ca_usd' as const, label: t.monthlyObjectives.fieldCAUsdLabel },
				]
			: []),
	];
	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<KeyboardAwareScrollView contentContainerStyle={{ padding: listSpacing, gap: listSpacing, paddingBottom: 32 }}>
				{props.tabs}
				<SectionCard title={t.monthlyObjectives.title} icon="trending-up">
					{!!formik.errors.globalError && <ApiAlert errorDetails={formik.errors.globalError} />}
					{moneyFields.map((field) => (
						<FormattedNumberInput
							key={field.name}
							label={field.label}
							value={formik.values[field.name]}
							placeholder="0,00"
							keyboardType="decimal-pad"
							onChangeText={formik.handleChange(field.name)}
							onBlur={formik.handleBlur(field.name)}
							error={!!formik.touched[field.name] && !!formik.errors[field.name]}
							helperText={formik.touched[field.name] ? formik.errors[field.name] : ''}
							startIcon={<MaterialIcons name="trending-up" size={20} color={colors.slate[400]} />}
						/>
					))}
					<CustomNumberInput
						label={t.monthlyObjectives.fieldFacturesLabel}
						keyboardType="number-pad"
						value={formik.values.objectif_factures}
						onChangeText={formik.handleChange('objectif_factures')}
						onBlur={formik.handleBlur('objectif_factures')}
						error={!!formik.touched.objectif_factures && !!formik.errors.objectif_factures}
						helperText={formik.touched.objectif_factures ? formik.errors.objectif_factures : ''}
						startIcon={<MaterialIcons name="receipt-long" size={20} color={colors.slate[400]} />}
					/>
					<CustomNumberInput
						label={t.monthlyObjectives.fieldConversionLabel}
						max={100}
						value={formik.values.objectif_conversion}
						onChangeText={formik.handleChange('objectif_conversion')}
						onBlur={formik.handleBlur('objectif_conversion')}
						error={!!formik.touched.objectif_conversion && !!formik.errors.objectif_conversion}
						helperText={formik.touched.objectif_conversion ? formik.errors.objectif_conversion : ''}
						startIcon={<MaterialIcons name="percent" size={20} color={colors.slate[400]} />}
					/>
				</SectionCard>
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton
					loading={formik.isSubmitting}
					active={formik.isValid && !formik.isSubmitting}
					onClick={() => {
						void formik.submitForm();
					}}
				/>
			</PageActionBar>
		</View>
	);
};

type LocalSearchParams = Omit<SearchParams, 'id'>;

const MonthlyObjectivesPage = () => {
	const params = useLocalSearchParams<LocalSearchParams>();
	const profil = useAppSelector(getProfilState);
	const { t } = useLanguage();
	const companyId = params.company_id === undefined ? undefined : parseEntityId(params.company_id);
	if (!profil.is_staff) return <NoPermission />;
	if (companyId === null) return <ApiAlert errorDetails={t.notFound.message} />;
	return (
		<CompanyDocumentsWrapperList requestedCompanyId={companyId}>
			{(args) => <MonthlyObjectivesForm key={args.company_id} {...args} />}
		</CompanyDocumentsWrapperList>
	);
};

export default MonthlyObjectivesPage;
