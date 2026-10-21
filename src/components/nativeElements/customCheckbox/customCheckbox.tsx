import { Pressable, Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
};

const CustomCheckbox = (props: Props) => (
	<Pressable
		accessibilityRole="checkbox"
		accessibilityLabel={props.label}
		accessibilityState={{ checked: props.checked, disabled: !!props.disabled }}
		disabled={props.disabled}
		onPress={() => props.onChange(!props.checked)}
		className={'min-h-11 flex-row items-center gap-3 py-2 ' + (props.disabled ? 'opacity-50' : '')}
	>
		<MaterialIcons
			name={props.checked ? 'check-box' : 'check-box-outline-blank'}
			size={24}
			color={props.checked ? colors.brand : colors.slate[400]}
		/>
		<Text className="flex-1 font-sans text-sm text-ink dark:text-slate-100">{props.label}</Text>
	</Pressable>
);

export default CustomCheckbox;
