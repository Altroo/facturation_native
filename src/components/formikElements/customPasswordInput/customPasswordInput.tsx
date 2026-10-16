import { useColorMode } from '@/providers/themeProvider';
import { useState } from 'react';
import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';
import type { CustomPasswordInputProps as Props } from '@/types/uiTypes';

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
