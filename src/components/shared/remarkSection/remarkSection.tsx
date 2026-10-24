import SectionCard from '@/components/shared/sectionCard/sectionCard';
import CustomTextInput, {
	type CustomTextInputProps,
} from '@/components/nativeElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';

type Props = Omit<CustomTextInputProps, 'startIcon' | 'endIcon' | 'multiline' | 'numberOfLines'> & { title?: string };

// Keep remark fields identical across document and article forms.
const RemarkSection = (props: Props) => {
	const { title, ...inputProps } = props;
	const { t } = useLanguage();
	const label = props.label ?? t.documentForm.remarqueLabel;
	return (
		<SectionCard title={title ?? label} icon="notes">
			<CustomTextInput
				{...inputProps}
				nativeID={props.nativeID ?? 'remarque'}
				label={undefined}
				accessibilityLabel={props.accessibilityLabel ?? label}
				placeholder={props.placeholder ?? label}
				multiline
				numberOfLines={4}
				startIcon={undefined}
				endIcon={undefined}
				hideLockIcon
			/>
		</SectionCard>
	);
};

export default RemarkSection;
