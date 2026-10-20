import CustomSwitch from '@/components/formikElements/customSwitch/customSwitch';
import { type FC, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import AddManagedBySection, {
	AddManagedBySectionProps,
} from '@/components/shared/addManagedBySection/addManagedBySection';
import { useLanguage } from '@/utils/hooks';
import type { UserCompaniesType } from '@/types/usersTypes';
import type { DropDownType } from '@/types/accountTypes';
import { colors } from '@/utils/themes';

export type ManagedByType = {
	id: number;
	first_name: string | null;
	last_name: string | null;
	role: string | null;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

export type ManagedByTableSectionProps = {
	title: string;
	icon: ReactNode;
	emptyIcon: ReactNode;
	emptyMessage: string;
	headers: Array<string>;
	data: Array<ManagedByType | UserCompaniesType>;
	isUserTable: boolean;
	currentUserId?: number;
	roleOptions: Array<DropDownType>;
	onRoleChange: (index: number, newRole: string) => void;
	onInvoiceValidationChange?: (index: number, checked: boolean) => void;
	onDocumentStatusChangePermissionChange?: (index: number, checked: boolean) => void;
	onDelete: (index: number) => void;
	addSectionProps: AddManagedBySectionProps;
	showInvoiceValidationPermission?: boolean;
	showDocumentStatusChangePermission?: boolean;
	disabled?: boolean;
};

const ManagedByTableSection: FC<ManagedByTableSectionProps> = (props: ManagedByTableSectionProps) => {
	const {
		title,
		icon,
		emptyIcon,
		emptyMessage,
		headers,
		data,
		isUserTable,
		currentUserId,
		roleOptions,
		onRoleChange,
		onInvoiceValidationChange,
		onDocumentStatusChangePermissionChange,
		onDelete,
		addSectionProps,
		showInvoiceValidationPermission = false,
		showDocumentStatusChangePermission = false,
		disabled,
	} = props;
	const { t } = useLanguage();
	return (
		<View className="gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel">
			<View className="mb-1 flex-row items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
				<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800">{icon}</View>
				<Text
					accessibilityRole="header"
					className="flex-1 font-poppins-semibold text-base text-ink dark:text-slate-100"
				>
					{title}
				</Text>
				<Text className="rounded-full bg-slate-100 px-3 py-1 font-poppins-medium text-xs text-ink dark:bg-slate-800 dark:text-slate-100">
					{data.length}
				</Text>
			</View>
			{!data.length && (
				<View className="items-center gap-3 py-6">
					{emptyIcon}
					<Text className="font-sans text-center text-sm text-slate-400">{emptyMessage}</Text>
				</View>
			)}
			{data.map((item, index) => {
				const user = 'id' in item ? item : undefined;
				const company = 'company_id' in item ? item : undefined;
				const protectedMember = isUserTable && user?.id === currentUserId;
				const label = user
					? [user.first_name, user.last_name].filter(Boolean).join(' ') || String(user.id)
					: company?.raison_sociale;
				return (
					<View
						key={isUserTable ? `user-${user?.id}-${index}` : `company-${company?.company_id}-${index}`}
						className="gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
					>
						<View className="flex-row items-center gap-3">
							<View className="h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-panel">
								<MaterialIcons name={isUserTable ? 'person-outline' : 'business'} size={23} color={colors.brand} />
							</View>
							<Text
								accessibilityLabel={`${headers[0]}: ${label}`}
								className="flex-1 font-poppins-medium text-base text-ink dark:text-slate-100"
							>
								{label}
							</Text>
							{protectedMember && (
								<Text className="font-poppins-medium text-xs text-brand dark:text-blue-300">
									{t.managedByTable.you}
								</Text>
							)}
						</View>
						<CustomDropDownSelect
							id={`role_${index}`}
							label={t.managedByTable.role}
							value={item.role}
							onChange={(value) => onRoleChange(index, value)}
							items={roleOptions}
							disabled={disabled || protectedMember}
							startIcon={<MaterialIcons name="shield" size={20} color={colors.slate[400]} />}
						/>
						{showInvoiceValidationPermission && (
							<CustomSwitch
								label={t.managedByTable.invoiceValidation}
								value={Boolean(item.can_validate_factures)}
								onValueChange={(checked) => onInvoiceValidationChange?.(index, checked)}
								disabled={disabled || protectedMember}
								startIcon={<MaterialIcons name="verified" size={21} color={colors.slate[500]} />}
							/>
						)}
						{showDocumentStatusChangePermission && (
							<CustomSwitch
								label={t.managedByTable.documentStatusChange}
								value={Boolean(item.can_change_document_status)}
								onValueChange={(checked) => onDocumentStatusChangePermissionChange?.(index, checked)}
								disabled={disabled || protectedMember}
								startIcon={<MaterialIcons name="published-with-changes" size={21} color={colors.slate[500]} />}
							/>
						)}
						<PrimaryLoadingButton
							buttonText={t.common.delete}
							danger
							inverted
							onClick={() => onDelete(index)}
							active={!disabled && !protectedMember}
							loading={false}
							startIcon={<MaterialIcons name="person-remove" size={20} color={colors.danger} />}
						/>
					</View>
				);
			})}
			<AddManagedBySection {...addSectionProps} disabled={disabled || addSectionProps.disabled} />
		</View>
	);
};

export default ManagedByTableSection;
