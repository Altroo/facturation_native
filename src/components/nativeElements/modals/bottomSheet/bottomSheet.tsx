import type { FC, ReactNode } from 'react';
import {
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	Text,
	View,
	useWindowDimensions,
	type StyleProp,
	type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutocompleteDropdownContextProvider } from 'react-native-autocomplete-dropdown';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	visible: boolean;
	title: string;
	subtitle?: string;
	titleIcon?: ReactNode;
	children: ReactNode;
	onClose: () => void;
	onDismiss?: () => void;
	style?: StyleProp<ViewStyle>;
	testID: string;
};

const BottomSheet: FC<Props> = (props: Props) => {
	const { visible, title, subtitle, titleIcon, children, onClose, onDismiss, style, testID } = props;
	const { t } = useLanguage();
	const { height } = useWindowDimensions();
	return (
		<Modal
			testID={testID}
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
			onDismiss={onDismiss ?? onClose}
		>
			<AutocompleteDropdownContextProvider>
				<View className="flex-1 items-center justify-end bg-black/40">
					<Pressable testID={testID + '-backdrop'} accessible={false} onPress={onClose} className="absolute inset-0" />
					<KeyboardAvoidingView
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						pointerEvents="box-none"
						style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' }}
					>
						<View
							testID={testID + '-panel'}
							accessibilityViewIsModal
							onAccessibilityEscape={onClose}
							className="w-full max-w-lg rounded-t-3xl bg-white px-6 pt-5 dark:bg-panel"
							style={[{ maxHeight: height * 0.85, flexShrink: 1 }, style]}
						>
							<SafeAreaView edges={['bottom']} style={{ flexShrink: 1, gap: 20, paddingBottom: 20 }}>
								<View className="flex-row items-center gap-3">
									{titleIcon}
									<View className="flex-1 gap-1">
										{!!subtitle && (
											<Text className="font-sans text-sm text-slate-500 dark:text-slate-400">{subtitle}</Text>
										)}
										<Text
											accessibilityRole="header"
											className="font-poppins-semibold text-lg text-ink dark:text-slate-100"
										>
											{title}
										</Text>
									</View>
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={t.common.close}
										onPress={onClose}
										className="h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 dark:active:bg-slate-700"
									>
										<MaterialIcons name="close" size={22} color={colors.slate[400]} />
									</Pressable>
								</View>
								{children}
							</SafeAreaView>
						</View>
					</KeyboardAvoidingView>
				</View>
			</AutocompleteDropdownContextProvider>
		</Modal>
	);
};

export default BottomSheet;
