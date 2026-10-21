import { View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import ApiAlert from '@/components/nativeElements/apiLoading/apiAlert/apiAlert';
import PrimaryLoadingButton from '@/components/nativeElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { normalizeApiError } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';
import { colors } from '@/utils/themes';

type Props = {
	error: unknown;
	onRetry: () => void;
	loading?: boolean;
	disabled?: boolean;
	variant?: 'card' | 'banner';
	showDetails?: boolean;
};

const QueryError = (props: Props) => {
	const { t } = useLanguage();
	const error = normalizeApiError(props.error);
	const message = props.showDetails
		? error.details
		: error.status_code === 0
			? t.errors.networkError
			: error.status_code === 403
				? t.noPermission.description
				: error.status_code === 404
					? t.notFound.message
					: error.message;
	return (
		<View
			className={
				props.variant === 'banner'
					? 'gap-2'
					: 'gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-panel'
			}
		>
			<ApiAlert variant={props.variant === 'banner' ? 'banner' : 'inline'} errorDetails={message} />
			<PrimaryLoadingButton
				buttonText={t.common.retry}
				inverted
				active={!props.disabled}
				loading={!!props.loading}
				onClick={props.onRetry}
				startIcon={<MaterialIcons name="refresh" size={20} color={colors.brand} />}
			/>
		</View>
	);
};

export default QueryError;
