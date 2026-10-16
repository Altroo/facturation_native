import type { ComponentProps, ReactElement, ReactNode, Key, Dispatch, SetStateAction, Ref } from 'react';
import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ColumnDef, DataGridProps, FilterModel, FilterOperatorsConfig, SortModel } from 'expo-flash-datagrid';
import type { Language } from '@/types/languageTypes';
import type {
	StyleProp,
	TextInputProps,
	ViewStyle,
	TextInputInstance,
	PressableProps,
	GestureResponderEvent,
} from 'react-native';
import type { DropDownType } from '@/types/accountTypes';

export type ToastContextType = {
	onSuccess: (msg: string) => void;
	onError: (msg: string) => void;
};

export type ApiAlertProps = {
	errorDetails?: Record<string, string[] | string> | string | null;
	cssStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
};

export type ApiProgressProps = {
	cssStyle?: StyleProp<ViewStyle>;
	children?: ReactNode;
	backdropColor?: string;
	circularColor?: string;
};

export type CustomAutoCompleteSelectProps = {
	id?: string;
	label: string;
	required?: boolean;
	items: DropDownType[];
	value: DropDownType | null;
	noOptionsText: string;
	// Preserve the original event/value callback with the real native press event.
	onChange?: (event: GestureResponderEvent, newValue: DropDownType | null) => void;
	onBlur?: TextInputProps['onBlur'];
	helperText?: string;
	error?: boolean;
	disabled?: boolean;
	cssClass?: string;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	renderOption?: (props: PressableProps & { key: Key }, option: DropDownType) => ReactNode;
};

export type CustomDropDownSelectProps = {
	id?: string;
	label: string;
	required?: boolean;
	items: DropDownType[] | string[];
	value: string | null;
	// Native selection returns the value directly, without a DOM event.
	onChange?: (value: string) => void;
	onBlur?: PressableProps['onBlur'];
	helperText?: string;
	error?: boolean;
	disabled?: boolean;
	cssClass?: string;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
};

export type CustomPasswordInputProps = Omit<CustomTextInputProps, 'secureTextEntry' | 'endIcon'>;

export type CustomSquareImageUploadingProps = {
	image: string | ArrayBuffer | null;
	croppedImage?: string | ArrayBuffer | null;
	onChange: (image: string | ArrayBuffer | null) => void;
	onCrop: (data: string | null) => void;
	cssClasse?: string;
	label?: string;
	error?: string;
	disabled?: boolean;
	avatar?: boolean;
};

export type CustomTextInputProps = Omit<TextInputProps, 'editable'> & {
	ref?: Ref<TextInputInstance>;
	label?: string;
	required?: boolean;
	disabled?: boolean;
	error?: boolean;
	helperText?: string;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	cssClass?: string;
};

export type PrimaryLoadingButtonProps = {
	buttonText: string;
	loading: boolean;
	onClick?: (event: GestureResponderEvent) => void;
	active?: boolean;
	startIcon?: ReactNode;
	cssClass?: string;
	inverted?: boolean;
	danger?: boolean;
	testID?: string;
};

export type Action = {
	active: boolean;
	text: string;
	onClick: () => void;
	color?: string;
	icon?: ReactNode;
	disabled?: boolean;
};

export type ActionModalsProps = {
	title: string;
	actions: Action[];
	actionsStyle?: string[];
	body?: string;
	children?: ReactNode;
	titleIcon?: ReactNode;
	titleIconColor?: string;
	onClose?: () => void;
	maxWidth?: false | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	fullWidth?: boolean;
};

export interface ProtectedProps {
	children: ReactNode;
}

export type CustomToastProps = {
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	show: boolean;
	setShow: Dispatch<SetStateAction<boolean>>;
	children?: ReactNode;
};

export interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	reloading?: boolean;
	reloadFailed?: boolean;
}

export interface DateRangeFilterValue {
	from?: string;
	to?: string;
}

export type CustomFilterValue = string | DateRangeFilterValue;

export type CustomFilterPanelProps<TRow> = FilterOperatorsConfig<TRow> & {
	columns: ColumnDef<TRow>[];
	filterModel: FilterModel;
	onChange: (model: FilterModel) => void;
	disabled?: boolean;
};

export type LanguageFlagProps = { language: Language; size?: number };

export type DataGridSorting = {
	ordering: string;
	sortModel: SortModel;
	onSortModelChange: (model: SortModel) => void;
};

export type PaginatedDataGridProps<TRow> = Pick<
	DataGridProps<TRow>,
	| 'rows'
	| 'columns'
	| 'getRowId'
	| 'rowCount'
	| 'refreshing'
	| 'onRefresh'
	| 'onEndReached'
	| 'onEndReachedThreshold'
	| 'filterModel'
	| 'onFilterModelChange'
	| 'testID'
> & {
	isLoading?: boolean;
	sorting?: DataGridSorting;
	searchTerm: string;
	setSearchTerm: Dispatch<SetStateAction<string>>;
	selectedIds?: number[];
	onSelectionChange?: (ids: number[]) => void;
	renderRow: (row: TRow, index: number) => ReactElement | null;
	disabled?: boolean;
	isFetchingNextPage?: boolean;
	hasNextPage?: boolean;
	loadMoreError?: boolean;
	onRetryLoadMore?: () => void;
};

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export type EntityImageProps = {
	image?: string | ArrayBuffer | null;
	previewImage?: string | ArrayBuffer | null;
	label: string;
	icon?: IconName;
	avatar?: boolean;
	large?: boolean;
};

export type ImagePreviewProps = { uri: string; label: string; visible: boolean; onClose: () => void };

export type GridFilterParams = Record<string, string>;

export type GridFilterError = 'andOnly' | 'duplicateFilter' | 'unsupportedFilter' | 'invalidDate';

export type GridFilterResult = { params: GridFilterParams; error?: GridFilterError };
