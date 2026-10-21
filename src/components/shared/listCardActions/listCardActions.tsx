import type { ReactNode } from 'react';
import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	onView: () => void;
	onEdit?: () => void;
	disabled?: boolean;
	children?: ReactNode;
};

const ListCardActions = (props: Props) => {
	const { t } = useLanguage();
	return (
		<View className="gap-3">
			<View className="flex-row gap-3">
				<PrimaryLoadingButton
					cssClass="flex-1"
					buttonText={t.common.view}
					inverted
					active={!props.disabled}
					loading={false}
					onClick={props.onView}
					startIcon={<MaterialIcons name="visibility" size={20} color={colors.brand} />}
				/>
				{props.onEdit && (
					<PrimaryLoadingButton
						cssClass="flex-1"
						buttonText={t.common.edit}
						inverted
						active={!props.disabled}
						loading={false}
						onClick={props.onEdit}
						startIcon={<MaterialIcons name="edit" size={20} color={colors.brand} />}
					/>
				)}
			</View>
			{props.children}
		</View>
	);
};

export default ListCardActions;
