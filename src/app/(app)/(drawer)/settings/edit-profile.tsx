import SectionCard from '@/components/shared/sectionCard/sectionCard';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useState } from 'react';
import { View, Platform } from 'react-native';
import KeyboardAwareScrollView from '@/components/shared/keyboardAwareScrollView/keyboardAwareScrollView';
import ApiProgress from '@/components/nativeElements/apiLoading/apiProgress/apiProgress';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { useGetProfilQuery, useEditProfilMutation } from '@/store/services/account';
import { accountEditProfilAction } from '@/store/actions/accountActions';
import { useAppDispatch, useLanguage, useToast } from '@/utils/hooks';
import { profilSchema } from '@/utils/formValidationSchemas';
import { normalizeApiError, runWithCleanup, setFormikAutoErrors } from '@/utils/helpers';
import { genderItemsList } from '@/utils/rawData';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/nativeElements/customDropDownSelect/customDropDownSelect';
import CustomSquareImageUploading from '@/components/nativeElements/customSquareImageUploading/customSquareImageUploading';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import SaveButton from '@/components/nativeElements/buttons/saveButton/saveButton';
import PageActionBar from '@/components/shared/pageActionBar/pageActionBar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

const EditProfilPage = () => {
	const token = useInitAccessToken();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const {
		currentData: profilData,
		isLoading: isProfilLoading,
		error,
		refetch,
	} = useGetProfilQuery(undefined, { skip: !token });
	const [editProfil, { isLoading: isEditLoading }] = useEditProfilMutation();
	const dispatch = useAppDispatch();
	const [isPending, setIsPending] = useState(false);

	const formik = useFormik({
		initialValues: {
			first_name: profilData?.first_name ?? '',
			last_name: profilData?.last_name ?? '',
			gender: profilData?.gender ?? '',
			avatar: profilData?.avatar ?? '',
			avatar_cropped: profilData?.avatar_cropped ?? '',
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(profilSchema),
		onSubmit: async (data, { setFieldError }) => {
			setIsPending(true);
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { globalError, ...payload } = data;
			await runWithCleanup(
				async () => {
					try {
						const response = await editProfil({ data: payload }).unwrap();
						if (response && profilData) {
							dispatch(
								accountEditProfilAction({
									...profilData,
									...response,
									gender:
										response.gender === 'H'
											? 'Homme'
											: response.gender === 'F'
												? 'Femme'
												: (response.gender ?? profilData.gender),
								}),
							);
							onSuccess(t.settings.profileUpdateSuccess);
						}
					} catch (e) {
						onError(t.settings.profileUpdateError);
						setFormikAutoErrors({ e, setFieldError });
					}
				},
				() => {
					setIsPending(false);
				},
			);
		},
	});

	if (isProfilLoading) return <ApiProgress />;
	if (!profilData)
		return error ? (
			<View className="gap-3 p-5">
				<ApiAlert errorDetails={normalizeApiError(error).message} />
				<PrimaryLoadingButton
					buttonText={t.common.retry}
					onClick={() => void refetch()}
					active
					loading={false}
					inverted
				/>
			</View>
		) : (
			<ApiProgress />
		);

	return (
		<View
			className="bg-slate-50 dark:bg-night"
			style={{
				flex: 1,
			}}
		>
			<KeyboardAwareScrollView
				style={{ flex: 1 }}
				keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					padding: 20,
					paddingBottom: 48,
					gap: 20,
					flexGrow: 1,
				}}
			>
				<>
					<SectionCard title={t.users.photoSection} icon={'add-photo-alternate'}>
						<>
							<CustomSquareImageUploading
								label={t.users.fieldAvatar}
								hideLabel
								avatar
								avatarSize={176}
								image={formik.values.avatar}
								croppedImage={formik.values.avatar_cropped}
								error={formik.errors.avatar || formik.errors.avatar_cropped}
								onChange={(value) => void formik.setFieldValue('avatar', value)}
								onCrop={(value) => void formik.setFieldValue('avatar_cropped', value)}
								disabled={isPending}
							/>
						</>
					</SectionCard>
					<SectionCard title={t.users.personalSection} icon={'person-outline'}>
						<>
							<CustomTextInput
								id="email"
								label={t.settings.fieldEmail}
								placeholder={t.settings.fieldEmail}
								value={profilData?.email}
								keyboardType="email-address"
								disabled={true}
								startIcon={<MaterialIcons name="mail-outline" size={20} color={colors.slate[400]} />}
							/>
							<CustomTextInput
								id="first_name"
								label={t.settings.fieldNom}
								placeholder={t.settings.fieldNom}
								value={formik.values.first_name}
								onChangeText={formik.handleChange('first_name')}
								onBlur={formik.handleBlur('first_name')}
								autoCapitalize="words"
								disabled={isPending}
								error={Boolean(formik.touched.first_name ? formik.errors.first_name : undefined)}
								helperText={formik.touched.first_name ? formik.errors.first_name : undefined}
								startIcon={<MaterialIcons name="person-outline" size={20} color={colors.slate[400]} />}
							/>
							<CustomTextInput
								id="last_name"
								label={t.settings.fieldPrenom}
								placeholder={t.settings.fieldPrenom}
								value={formik.values.last_name}
								onChangeText={formik.handleChange('last_name')}
								onBlur={formik.handleBlur('last_name')}
								autoCapitalize="words"
								disabled={isPending}
								error={Boolean(formik.touched.last_name ? formik.errors.last_name : undefined)}
								helperText={formik.touched.last_name ? formik.errors.last_name : undefined}
								startIcon={<MaterialIcons name="badge" size={20} color={colors.slate[400]} />}
							/>
							<CustomDropDownSelect
								id="gender"
								label={t.settings.fieldGenre}
								value={formik.values.gender}
								items={genderItemsList}
								onChange={(value) => void formik.setFieldValue('gender', value)}
								helperText={formik.touched.gender ? formik.errors.gender : undefined}
								disabled={isPending}
								error={Boolean(formik.touched.gender ? formik.errors.gender : undefined)}
								startIcon={<MaterialIcons name="groups" size={20} color={colors.slate[400]} />}
							/>
						</>
					</SectionCard>
					<>
						{formik.errors.globalError || (formik.submitCount > 0 && !formik.isValid) ? (
							<ApiAlert variant="banner" errorDetails={formik.errors.globalError || t.common.correctErrors} />
						) : null}
					</>
				</>
			</KeyboardAwareScrollView>
			<PageActionBar>
				<SaveButton loading={isPending || isEditLoading} onClick={() => void formik.submitForm()} active />
			</PageActionBar>
		</View>
	);
};

export default EditProfilPage;
