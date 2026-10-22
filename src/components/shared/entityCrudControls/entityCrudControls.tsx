import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { DropDownType } from '@/types/accountTypes';
import BottomSheet from '@/components/nativeElements/modals/bottomSheet/bottomSheet';
import CustomTextInput from '@/components/nativeElements/customTextInput/customTextInput';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ConfirmationModal from '@/components/shared/confirmationModal/confirmationModal';
import { extractApiErrorMessage } from '@/utils/helpers';
import { useLanguage, useToast } from '@/utils/hooks';
import { useColorMode } from '@/providers/themeProvider';
import { colors } from '@/utils/themes';

type Props = {
	label: string;
	icon?: ReactNode;
	selectedItem: DropDownType | null;
	addEntity: (args: { data: { nom: string } }) => { unwrap: () => Promise<{ id: number }> };
	editEntity: (args: { id: number; data: { nom: string } }) => { unwrap: () => Promise<unknown> };
	deleteEntity: (args: { id: number }) => { unwrap: () => Promise<unknown> };
	onAddSuccess?: (id: number) => void;
	onDeleteSuccess?: () => void;
	disabled?: boolean;
};

// Native equivalent of the web EntityCrudControls. Every future parameter
// selector can reuse these controls and the existing edit/delete modals.
const EntityCrudControls = (props: Props) => {
	const { t } = useLanguage();
	const { onError } = useToast();
	const { mode } = useColorMode();
	const [action, setAction] = useState<'add' | 'edit' | 'delete' | null>(null);
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const pending = useRef(false);
	const selectedId = Number(props.selectedItem?.value);
	const validSelection = Number.isSafeInteger(selectedId) && selectedId > 0;
	const disabled = !!props.disabled || loading;
	const secondaryActions = [
		{ action: 'edit', icon: 'edit', label: t.common.update, color: colors.brand },
		{
			action: 'delete',
			icon: 'delete-outline',
			label: t.common.delete,
			color: mode === 'dark' ? colors.dangerDarkForeground : colors.danger,
		},
	] as const;
	const close = () => {
		if (!pending.current) setAction(null);
	};
	const open = (next: 'add' | 'edit' | 'delete') => {
		if (disabled || (next !== 'add' && !validSelection)) return;
		Keyboard.dismiss();
		setName(next === 'add' ? '' : (props.selectedItem?.code ?? ''));
		setError('');
		setAction(next);
	};
	const submit = async () => {
		if (disabled || pending.current || !action) return;
		if (action !== 'add' && !validSelection) return;
		if (action !== 'delete' && !name.trim()) {
			setError(t.addEntityModal.requiredError(props.label));
			return;
		}
		pending.current = true;
		setLoading(true);
		try {
			if (action === 'add') {
				const result = await props.addEntity({ data: { nom: name.trim() } }).unwrap();
				props.onAddSuccess?.(result.id);
			} else if (action === 'edit') {
				await props.editEntity({ id: selectedId, data: { nom: name.trim() } }).unwrap();
			} else {
				await props.deleteEntity({ id: selectedId }).unwrap();
				props.onDeleteSuccess?.();
			}
			setAction(null);
		} catch (cause) {
			const message = extractApiErrorMessage(cause, t.common.genericError);
			setError(message);
			onError(message);
		} finally {
			pending.current = false;
			setLoading(false);
		}
	};
	return (
		<>
			<View className="flex-row items-center gap-1">
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${t.common.add} ${props.label}`}
					accessibilityState={{ disabled }}
					disabled={disabled}
					onPress={() => open('add')}
					className={
						'min-h-11 items-center justify-center rounded-lg px-2 active:bg-blue-50 dark:active:bg-slate-800 ' +
						(disabled ? 'opacity-50' : '')
					}
				>
					<Text className="font-poppins-medium text-sm text-brand dark:text-blue-300">{t.common.add}</Text>
				</Pressable>
				{validSelection &&
					secondaryActions.map((item) => (
						<Pressable
							key={item.action}
							accessibilityRole="button"
							accessibilityLabel={`${item.label} ${props.label}`}
							accessibilityState={{ disabled }}
							disabled={disabled}
							onPress={() => open(item.action)}
							className={
								'h-11 w-11 items-center justify-center rounded-lg active:bg-slate-100 dark:active:bg-slate-800 ' +
								(disabled ? 'opacity-50' : '')
							}
						>
							<MaterialIcons name={item.icon} size={22} color={item.color} />
						</Pressable>
					))}
			</View>
			{(action === 'add' || action === 'edit') && (
				<BottomSheet
					visible
					testID="entity-name-sheet"
					title={action === 'add' ? t.addEntityModal.title(props.label) : `${t.common.update} ${props.label}`}
					onClose={close}
				>
					<CustomTextInput
						label={t.addEntityModal.fieldLabel(props.label)}
						placeholder={t.addEntityModal.fieldLabel(props.label)}
						value={name}
						onChangeText={(value) => {
							setName(value);
							setError('');
						}}
						error={!!error}
						helperText={error}
						startIcon={props.icon}
						autoCorrect={false}
						disabled={loading}
					/>
					<PrimaryLoadingButton
						buttonText={action === 'add' ? t.common.add : t.common.update}
						loading={loading}
						active
						onClick={() => void submit()}
					/>
				</BottomSheet>
			)}
			{action === 'delete' && validSelection && (
				<ConfirmationModal
					title={`${t.common.delete} ${props.label}`}
					body={t.common.irreversible}
					recordName={props.selectedItem?.code}
					confirmText={t.common.delete}
					action="delete"
					loading={loading}
					onClose={close}
					onConfirm={() => void submit()}
				/>
			)}
		</>
	);
};

export default EntityCrudControls;
