import type { ReactNode } from 'react';
import { Text } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ActionModals from '@/components/nativeElements/modals/actionModal/actionModals';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';
import { useColorMode } from '@/providers/themeProvider';

type Props = {
	title: string;
	body: string;
	recordName?: string;
	confirmText: string;
	onConfirm: () => void;
	onClose: () => void;
	loading?: boolean;
	action?: 'delete' | 'suspend' | 'archive' | 'unarchive' | 'convert' | 'validate';
	children?: ReactNode;
};

const ConfirmationModal = (props: Props) => {
	const { t } = useLanguage();
	const { mode } = useColorMode();
	const cancelColor = mode === 'dark' ? colors.slate[300] : colors.slate[500];
	const archive = props.action === 'archive' || props.action === 'unarchive';
	const conversion = props.action === 'convert' || props.action === 'validate';
	const actionColor = conversion
		? colors.conversion
		: archive
			? colors.warning
			: mode === 'dark'
				? colors.dangerDarkForeground
				: colors.danger;
	const handleClose = () => {
		if (!props.loading) props.onClose();
	};
	return (
		<ActionModals
			compact
			title={props.title}
			titleIcon={
				<MaterialIcons
					name={
						props.action === 'validate'
							? 'check-circle'
							: conversion
								? 'receipt-long'
								: props.action === 'unarchive'
									? 'unarchive'
									: archive
										? 'archive'
										: 'warning-amber'
					}
					size={24}
					color={actionColor}
				/>
			}
			maxWidth="xs"
			fullWidth
			onClose={handleClose}
			actions={[
				{
					text: t.common.cancel,
					active: false,
					onClick: handleClose,
					color: cancelColor,
					disabled: props.loading,
				},
				{
					text: props.confirmText,
					active: true,
					onClick: props.onConfirm,
					color: conversion ? colors.conversion : archive ? colors.warning : colors.danger,
					loading: props.loading,
					disabled: props.loading,
				},
			]}
		>
			{!!props.recordName && (
				<Text className="font-poppins-semibold text-sm leading-6 text-ink dark:text-slate-100">{props.recordName}</Text>
			)}
			<Text className="font-sans text-sm leading-6 text-slate-500 dark:text-slate-300">{props.body}</Text>
			{props.children}
		</ActionModals>
	);
};

export default ConfirmationModal;
