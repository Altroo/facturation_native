import { useColorMode } from '@/providers/themeProvider';
import { useState } from 'react';
import { Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomTextInput, { type CustomTextInputProps } from '@/components/nativeElements/customTextInput/customTextInput';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

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
			// The eye button already provides the trailing gap inside its touch area.
			style={[props.style, { paddingRight: 0 }]}
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
						color={theme === 'dark' ? colors.slate[300] : colors.slate[500]}
					/>
				</Pressable>
			}
		/>
	);
};

CustomPasswordInput.displayName = 'CustomPasswordInput';
export default CustomPasswordInput;
