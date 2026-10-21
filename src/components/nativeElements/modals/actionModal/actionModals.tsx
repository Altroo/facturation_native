import type { FC, ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';

type Action = {
	active: boolean;
	text: string;
	onClick: () => void;
	color?: string;
	icon?: ReactNode;
	disabled?: boolean;
	loading?: boolean;
};

type Props = {
	title: string;
	actions: Array<Action>;
	actionsStyle?: Array<string>;
	body?: string;
	children?: ReactNode;
	titleIcon?: ReactNode;
	titleIconColor?: string;
	onClose?: () => void;
	maxWidth?: false | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	fullWidth?: boolean;
};

const ActionModals: FC<Props> = (props: Props) => {
	const {
		title,
		actions,
		actionsStyle,
		body,
		children,
		titleIcon,
		titleIconColor,
		onClose,
		maxWidth = 'sm',
		fullWidth,
	} = props;
	const { mode } = useColorMode();
	const handleClose = () => {
		if (onClose) {
			onClose();
			return;
		}
		// Fallback: find the first non-active action (typically the cancel button)
		const cancelAction = actions.find((a) => !a.active);
		if (cancelAction && !cancelAction.disabled) {
			cancelAction.onClick();
		}
	};
	const widthLimit = maxWidth === false ? undefined : { xs: 444, sm: 600, md: 900, lg: 1200, xl: 1536 }[maxWidth];
	return (
		<Modal visible transparent animationType="fade" onRequestClose={handleClose}>
			<View className="flex-1 items-center justify-center bg-black/60 p-6">
				<Pressable
					testID="action-modal-backdrop"
					accessible={false}
					style={StyleSheet.absoluteFill}
					onPress={handleClose}
				/>
				<View
					testID="action-modal"
					accessibilityViewIsModal
					onAccessibilityEscape={handleClose}
					className="max-h-[90%] gap-5 rounded-3xl bg-white p-6 dark:bg-panel"
					style={{ width: fullWidth ? '100%' : '92%', maxWidth: widthLimit }}
				>
					{!!titleIcon && (
						<View
							className="h-14 w-14 items-center justify-center rounded-2xl"
							style={{ backgroundColor: titleIconColor ?? 'transparent' }}
						>
							{titleIcon}
						</View>
					)}
					<Text accessibilityRole="header" className="font-poppins-semibold text-xl text-ink dark:text-slate-100">
						{title}
					</Text>
					<ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
						{!!body && <Text className="font-sans text-sm leading-6 text-slate-500 dark:text-slate-300">{body}</Text>}
						{children}
					</ScrollView>
					<View className={['gap-3', ...(actionsStyle ?? [])].join(' ')}>
						{actions.map((action, index) => (
							<PrimaryLoadingButton
								key={index}
								buttonText={action.text}
								onClick={action.onClick}
								active={!action.disabled}
								loading={!!action.loading}
								inverted={!action.active}
								danger={action.color === colors.danger || action.color === colors.dangerStrong}
								color={action.color ?? (mode === 'dark' ? colors.slate[200] : colors.ink)}
								startIcon={action.icon}
							/>
						))}
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default ActionModals;
