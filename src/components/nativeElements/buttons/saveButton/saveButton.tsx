import type { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = Pick<ComponentProps<typeof PrimaryLoadingButton>, 'loading' | 'onClick' | 'active'>;

const SaveButton = (props: Props) => {
	const { t } = useLanguage();
	return (
		<PrimaryLoadingButton
			{...props}
			buttonText={t.common.save}
			startIcon={<MaterialIcons name="save" size={20} color={colors.white} />}
		/>
	);
};

export default SaveButton;
