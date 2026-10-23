import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import InfoRow from '@/components/shared/infoRow/infoRow';
import EntityImage from '@/components/shared/entityImage/entityImage';
import CustomBadge from '@/components/nativeElements/customBadge/customBadge';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	icon?: ComponentProps<typeof MaterialIcons>['name'];
	image?: string | null;
	previewImage?: string | null;
	avatar?: boolean;
	role?: string | null;
	can_validate_factures?: boolean;
	can_change_document_status?: boolean;
};

// Match the web membership panels: identity with its image, then an outlined role.
// Permissions reuse the app's detail rows, and each membership has its own border.
const ManagedByDetails = (props: Props) => {
	const { t } = useLanguage();
	const permissions = [
		{ label: t.managedByTable.invoiceValidation, value: props.can_validate_factures, icon: 'verified' },
		{
			label: t.managedByTable.documentStatusChange,
			value: props.can_change_document_status,
			icon: 'published-with-changes',
		},
	] as const;
	return (
		<View
			testID="managed-by-details"
			className="gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800"
		>
			<View className="flex-row items-center gap-3">
				<EntityImage
					image={props.image}
					previewImage={props.previewImage}
					label={props.label}
					icon={props.icon}
					avatar={props.avatar}
					size={40}
				/>
				<Text
					accessibilityRole="header"
					className="min-w-0 flex-1 font-poppins-semibold text-base text-ink dark:text-slate-100"
				>
					{props.label}
				</Text>
			</View>
			<CustomBadge label={props.role || t.common.noData} variant="outlined" tone={props.role ? 'info' : 'neutral'} />
			{permissions.map((permission) => (
				<InfoRow
					key={permission.icon}
					icon={<MaterialIcons name={permission.icon} size={20} color={colors.slate[400]} />}
					label={permission.label}
					value={permission.value ? t.common.yes : t.common.no}
				/>
			))}
		</View>
	);
};

export default ManagedByDetails;
