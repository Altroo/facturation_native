import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColorMode } from '@/providers/themeProvider';
import type { ActionModalsProps as Props } from '@/types/uiTypes';
import { type FC } from 'react';

const ActionModals: FC<Props> = ({
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
}) => {
	const { mode } = useColorMode();
	const handleClose = () => {
		if (onClose) {
			onClose();
			return;
		}
		// Fallback: find the first non-active action (typically the cancel button)
		const cancelAction = actions.find((a) => !a.active);
		if (cancelAction) {
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
						{actions.map((action, index) => {
							const solid = action.color ?? (mode === 'dark' ? '#e2e8f0' : '#0D070B');
							const textColor = action.active ? (action.color || mode !== 'dark' ? '#ffffff' : '#0D070B') : solid;
							return (
								<Pressable
									key={index}
									accessibilityRole="button"
									accessibilityLabel={action.text}
									accessibilityState={{ disabled: !!action.disabled }}
									disabled={action.disabled}
									onPress={action.onClick}
									className="min-h-12 flex-row items-center justify-center gap-2 rounded-xl border px-5 py-3"
									style={{
										backgroundColor: action.active ? solid : mode === 'dark' ? '#1e293b' : '#ffffff',
										borderColor: solid,
										opacity: action.disabled ? 0.5 : 1,
									}}
								>
									{action.icon}
									<Text className="font-poppins-semibold text-base" style={{ color: textColor }}>
										{action.text}
									</Text>
								</Pressable>
							);
						})}
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default ActionModals;
