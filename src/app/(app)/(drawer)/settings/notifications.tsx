import SectionCard from '@/components/shared/sectionCard/sectionCard';
import CustomSwitch from '@/components/nativeElements/customSwitch/customSwitch';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useFormik } from 'formik';
import {
	useGetNotificationPreferencesQuery,
	useUpdateNotificationPreferencesMutation,
} from '@/store/services/notification';
import { useLanguage, useToast } from '@/utils/hooks';
import { normalizeApiError, runWithCleanup, setFormikAutoErrors } from '@/utils/helpers';
import type { NotificationPreferenceFormValues } from '@/types/notificationTypes';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';

const NotificationsPage = () => {
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const quoteExpiryOptions = t.settings.quoteExpiryOptions;
	const {
		currentData: preferences,
		isLoading: isPreferencesLoading,
		isFetching: isPreferencesFetching,
		error: preferencesError,
		refetch: refetchPreferences,
	} = useGetNotificationPreferencesQuery();
	const [updatePreferences, { isLoading: isUpdateLoading }] = useUpdateNotificationPreferencesMutation();
	const [isPending, setIsPending] = useState(false);

	const formik = useFormik<NotificationPreferenceFormValues>({
		initialValues: {
			notify_overdue_invoice: preferences?.notify_overdue_invoice ?? true,
			notify_expiring_quote: preferences?.notify_expiring_quote ?? true,
			notify_uninvoiced_bdl: preferences?.notify_uninvoiced_bdl ?? true,
			notify_document_created: preferences?.notify_document_created ?? true,
			notify_low_stock: preferences?.notify_low_stock ?? true,
			low_stock_repeat_hours: preferences?.low_stock_repeat_hours ?? 24,
			quote_expiry_days: preferences?.quote_expiry_days ?? 7,
			globalError: '',
		},
		enableReinitialize: true,
		onSubmit: async (values, { setFieldError }) => {
			if (!preferences) return;
			setIsPending(true);
			await runWithCleanup(
				async () => {
					try {
						await updatePreferences({
							notify_overdue_invoice: values.notify_overdue_invoice,
							notify_expiring_quote: values.notify_expiring_quote,
							notify_uninvoiced_bdl: values.notify_uninvoiced_bdl,
							notify_document_created: values.notify_document_created,
							notify_low_stock: values.notify_low_stock,
							low_stock_repeat_hours: values.low_stock_repeat_hours,
							quote_expiry_days: values.quote_expiry_days,
						}).unwrap();
						onSuccess(t.settings.notificationUpdateSuccess);
					} catch (e) {
						onError(t.settings.notificationUpdateError);
						setFormikAutoErrors({ e, setFieldError });
					}
				},
				() => {
					setIsPending(false);
				},
			);
		},
	});

	if (isPreferencesLoading || (!preferences && isPreferencesFetching)) return <ApiProgress />;
	if (!preferences) {
		return (
			<View className="flex-1 justify-center gap-4 bg-slate-50 p-6 dark:bg-night">
				<ApiAlert errorDetails={normalizeApiError(preferencesError).details} />
				<PrimaryLoadingButton
					buttonText={t.common.retry}
					active
					loading={false}
					onClick={() => void refetchPreferences()}
				/>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-slate-50 dark:bg-night">
			<ScrollView
				className="flex-1 bg-slate-50 dark:bg-night"
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<Text className="text-ink dark:text-slate-100 font-poppins-semibold text-2xl">
					{t.settings.notificationPreferences}
				</Text>
				<SectionCard>
					<CustomSwitch
						label={t.settings.notifyOverdueInvoice}
						value={formik.values.notify_overdue_invoice}
						onValueChange={(value) => void formik.setFieldValue('notify_overdue_invoice', value)}
						disabled={isPending}
					/>
					<CustomSwitch
						label={t.settings.notifyExpiringQuote}
						value={formik.values.notify_expiring_quote}
						onValueChange={(value) => void formik.setFieldValue('notify_expiring_quote', value)}
						disabled={isPending}
					/>
					<CustomSwitch
						label={t.settings.notifyUninvoicedBdl}
						value={formik.values.notify_uninvoiced_bdl}
						onValueChange={(value) => void formik.setFieldValue('notify_uninvoiced_bdl', value)}
						disabled={isPending}
					/>
					<CustomSwitch
						label={t.settings.notifyDocumentCreated}
						value={formik.values.notify_document_created}
						onValueChange={(value) => void formik.setFieldValue('notify_document_created', value)}
						disabled={isPending}
					/>
					<CustomSwitch
						label={t.settings.notifyLowStock}
						value={formik.values.notify_low_stock}
						onValueChange={(value) => void formik.setFieldValue('notify_low_stock', value)}
						disabled={isPending}
					/>
					<CustomDropDownSelect
						label={t.settings.lowStockRepeatHours}
						value={formik.values.low_stock_repeat_hours + ' h'}
						items={[6, 12, 24, 48, 72].map((hours) => hours + ' h')}
						onChange={(value) => void formik.setFieldValue('low_stock_repeat_hours', Number.parseInt(value, 10))}
						disabled={isPending || !formik.values.notify_low_stock}
						helperText={formik.errors.low_stock_repeat_hours}
						error={Boolean(formik.errors.low_stock_repeat_hours)}
					/>
					<CustomDropDownSelect
						label={t.settings.quoteExpiryDays}
						value={
							quoteExpiryOptions.find((item) => item.value === formik.values.quote_expiry_days)?.label ??
							String(formik.values.quote_expiry_days)
						}
						items={quoteExpiryOptions.map((item) => item.label)}
						onChange={(value) => {
							const option = quoteExpiryOptions.find((item) => item.label === value);
							if (option) void formik.setFieldValue('quote_expiry_days', option.value);
						}}
						disabled={isPending}
						helperText={formik.errors.quote_expiry_days}
						error={Boolean(formik.errors.quote_expiry_days)}
					/>
					{!!formik.errors.globalError && <ApiAlert errorDetails={formik.errors.globalError} />}
				</SectionCard>
			</ScrollView>
			<PageActionBar>
				<PrimaryLoadingButton
					buttonText={t.settings.save}
					loading={isPending || isUpdateLoading}
					onClick={() => void formik.submitForm()}
					active
				/>
			</PageActionBar>
		</View>
	);
};

export default NotificationsPage;
