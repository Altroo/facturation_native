import { useColorMode } from '@/providers/themeProvider';
import { useState } from 'react';
import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomTextInput, {
	type CustomTextInputProps,
} from '@/components/formikElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';

export type Props = Omit<CustomTextInputProps, 'secureTextEntry' | 'endIcon'>;

const CustomPasswordInput = (props: Props) => {
	const [showpassword, setshowpassword] = useState<boolean>(false);
	const { t } = useLanguage();
	const { mode: theme } = useColorMode();
	const handleClickShowPassword = () => {
		setshowpassword((prevState) => !prevState);
	};
	return (
		<CustomTextInput
			{...props}
			autoCapitalize="none"
			autoCorrect={false}
			secureTextEntry={!showpassword}
			endIcon={
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t.common.togglePasswordVisibility}
					accessibilityState={{ disabled: !!props.disabled }}
					disabled={props.disabled}
					onPress={handleClickShowPassword}
					className="h-12 w-12 items-center justify-center"
				>
					<MaterialIcons
						name={showpassword ? 'visibility-off' : 'visibility'}
						size={22}
						color={theme === 'dark' ? '#cbd5e1' : '#64748b'}
					/>
				</Pressable>
			}
		/>
	);
};

CustomPasswordInput.displayName = 'CustomPasswordInput';
export default CustomPasswordInput;
