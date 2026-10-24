import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomAutoCompleteSelect from '@/components/nativeElements/customAutoCompleteSelect/customAutoCompleteSelect';
import EntityCrudControls from '@/components/shared/entityCrudControls/entityCrudControls';
import QueryError from '@/components/shared/queryError/queryError';
import { useInitAccessToken } from '@/contexts/InitContext';
import {
	useGetLivreParListQuery,
	useAddLivreParMutation,
	useEditLivreParMutation,
	useDeleteLivreParMutation,
} from '@/store/services/parameter';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	companyId: number;
	value: number | null;
	onChange: (value: number | null) => void;
	disabled: boolean;
	error?: string;
	onBlur: () => void;
};

const CompanyDocumentLivreParField = (props: Props) => {
	const { t } = useLanguage();
	const token = useInitAccessToken();
	const query = useGetLivreParListQuery({ company_id: props.companyId }, { skip: !token });
	const [addEntity, adding] = useAddLivreParMutation();
	const [editEntity, editing] = useEditLivreParMutation();
	const [deleteEntity, deleting] = useDeleteLivreParMutation();
	const items = (query.currentData ?? []).map((item) => ({ code: item.nom, value: String(item.id) }));
	const selected = items.find((item) => item.value === String(props.value)) ?? null;
	const disabled = props.disabled || adding.isLoading || editing.isLoading || deleting.isLoading;
	return (
		<>
			{query.isError && <QueryError variant="banner" error={query.error} onRetry={() => void query.refetch()} />}
			<CustomAutoCompleteSelect
				noOptionsText={t.documentForm.noLivreurFound}
				label={t.documentForm.livrePar}
				items={items}
				value={selected}
				disabled={disabled || query.isLoading}
				startIcon={<MaterialIcons name="local-shipping" size={20} color={colors.slate[400]} />}
				error={!!props.error}
				helperText={props.error}
				onBlur={props.onBlur}
				onChange={(_event, value) => props.onChange(value ? Number(value.value) : null)}
				labelActions={
					<EntityCrudControls
						iconOnly
						label={t.documentForm.livreurLabel}
						selectedItem={selected}
						disabled={disabled}
						addEntity={({ data }) => addEntity({ data: { ...data, company: props.companyId } })}
						editEntity={({ id, data }) => editEntity({ id, data: { ...data, company: props.companyId } })}
						deleteEntity={deleteEntity}
						onAddSuccess={props.onChange}
						onDeleteSuccess={() => props.onChange(null)}
					/>
				}
			/>
		</>
	);
};

export default CompanyDocumentLivreParField;
