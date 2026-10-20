import { reloadAppAsync } from 'expo';
import { Platform } from 'react-native';
import { isAppVersion, isNewerAppVersion } from '@/utils/appVersion';
import { getAppVersion } from '@/utils/apiHelpers';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { APIContentTypeInterface, ApiErrorResponseType } from '@/types/_initTypes';
import { auth, publicInstance, InvalidSessionError } from '@/auth';

// Keep auth-refresh failures raw inside auth.instance. Normalize only the caller-facing result.
const apiFailure = (failure: unknown, authenticated: boolean) => {
	if (failure instanceof InvalidSessionError || axios.isCancel(failure)) return failure;
	const error = failure as {
		error?: ApiErrorResponseType;
		message?: string;
		response?: { status?: number; data?: ApiErrorResponseType & { detail?: string } };
	} | null;
	if (error?.error) return failure;
	const status = error?.response?.status ?? 0;
	const data = error?.response?.data;
	if (authenticated && status >= 500)
		return {
			error: {
				status_code: status,
				message: 'Erreur serveur.',
				details: {
					error: [
						'Il semble que nous ne puissions pas nous connecter. Veuillez vérifier votre connexion réseau et réessayer.',
					],
				},
			},
		};
	if (data?.status_code !== undefined && data.message !== undefined)
		return { error: { status_code: data.status_code, message: data.message, details: data.details ?? {} } };
	return {
		error: {
			status_code: status,
			message: data?.message || data?.detail || error?.message || 'Erreur réseau',
			details: data?.details ?? {
				error: [
					data?.detail ||
						data?.message ||
						(status === 401 ? 'Authentification requise' : 'Impossible de se connecter au serveur'),
				],
			},
		},
	};
};

const outwardInstance = (
	transport: AxiosInstance,
	contentType: APIContentTypeInterface,
	authenticated: boolean,
	onUnauthorized?: () => void,
): AxiosInstance => {
	const instance = axios.create({
		baseURL: transport.defaults.baseURL,
		timeout: transport.defaults.timeout,
		withCredentials: transport.defaults.withCredentials,
		headers: { Accept: 'application/json', 'Content-Type': contentType },
		// The raw transport owns request/response transformations and refresh retries.
		transformRequest: [],
		transformResponse: [],
		adapter: (config) =>
			transport.request({
				...config,
				adapter: transport.defaults.adapter,
				transformRequest: transport.defaults.transformRequest,
				transformResponse: transport.defaults.transformResponse,
			}),
	});
	instance.interceptors.request.use((config) => {
		if (config.data instanceof FormData) config.headers.delete('Content-Type');
		return config;
	});
	instance.interceptors.response.use(
		(response: AxiosResponse) => response,
		(failure: unknown) => {
			if (failure instanceof InvalidSessionError || (axios.isAxiosError(failure) && failure.response?.status === 401))
				onUnauthorized?.();
			return Promise.reject(apiFailure(failure, authenticated));
		},
	);
	return instance;
};

// Native auth owns tokens and refresh centrally, so there is no Redux getToken callback.
// Every factory call captures the current auth generation; old instances remain cancellable.
export const isAuthenticatedInstance = (
	contentType: APIContentTypeInterface = 'application/json',
	onUnauthorized?: () => void,
): AxiosInstance => outwardInstance(auth.instance, contentType, true, onUnauthorized);

export const allowAnyInstance = (contentType: APIContentTypeInterface = 'application/json'): AxiosInstance =>
	outwardInstance(publicInstance, contentType, false);

// Auth refresh keeps Axios failures intact internally; callers use the web API error envelope.
export const normalizeApiError = (error: unknown): ApiErrorResponseType => {
	const value = error as {
		error?: ApiErrorResponseType;
		data?: ApiErrorResponseType & { detail?: string };
		status?: number;
		status_code?: number;
		message?: string;
		details?: ApiErrorResponseType['details'];
	} | null;
	if (value?.error) return value.error;
	if (typeof value?.status_code === 'number') return value as ApiErrorResponseType;
	if (value?.data && typeof value.data === 'object') {
		return {
			status_code: value.data.status_code ?? value.status ?? 0,
			message: value.data.message || value.data.detail || 'Erreur réseau',
			details: value.data.details || { error: [value.data.detail || 'Impossible de se connecter au serveur'] },
		};
	}
	const failure = apiFailure(error, false);
	if (failure && typeof failure === 'object' && 'error' in failure) return failure.error as ApiErrorResponseType;
	return { status_code: 0, message: 'Erreur inconnue', details: { error: ["Une erreur inattendue s'est produite."] } };
};

type FormikAutoErrorsProps = {
	e: unknown;
	setFieldError: (field: string, message: string | undefined) => void;
};

/**
 * Automatically maps API error responses to Formik field errors.
 */
export const setFormikAutoErrors = ({ e, setFieldError }: FormikAutoErrorsProps) => {
	if (typeof e !== 'object' || e === null) return;

	const payload =
		(e as { error?: ApiErrorResponseType; data?: ApiErrorResponseType }).error ??
		(e as { error?: ApiErrorResponseType; data?: ApiErrorResponseType }).data ??
		(e as ApiErrorResponseType);

	if (!payload?.details) return;

	for (const [field, messages] of Object.entries(payload.details)) {
		const errorMsg = Array.isArray(messages) ? messages[0] : messages;

		// Handle combined numero_devis field
		if (field === 'numero_devis' || field === 'numero_facture') {
			setFieldError('numero_part', errorMsg);
			setFieldError('year_part', errorMsg);
		} else if (field === 'error' || field === 'detail') {
			setFieldError('globalError', errorMsg);
		} else {
			if (Array.isArray(messages)) {
				messages.forEach((msg) => setFieldError(field, msg));
			} else {
				setFieldError(field, messages);
			}
		}
	}
};

export const hexToRGB = (hex: string, alpha?: number): string => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);

	return alpha !== undefined ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
};

export const formatDate = (value: string | null) => {
	if (!value) return '-'; // display a placeholder for null
	// Django company details return dd/MM/yyyy; JS Date would reverse day/month or reject it.
	const dateOnly = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
	if (dateOnly) {
		const [, day, month, year] = dateOnly.map(Number);
		const parsed = new Date(0);
		parsed.setUTCFullYear(year, month - 1, day);
		return year > 0 &&
			parsed.getUTCFullYear() === year &&
			parsed.getUTCMonth() === month - 1 &&
			parsed.getUTCDate() === day
			? value
			: '-';
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '-';
	return new Intl.DateTimeFormat('fr-FR', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).format(date);
};

export const formatLocalDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const formatNumber = (value: string | number | null | undefined): string => {
	if (value === null || value === undefined) return '0,00';
	const num = typeof value === 'string' ? parseFloat(value) : value;
	if (Number.isNaN(num)) return '0,00';
	return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parseNumber = (value: string | number): number | null => {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	// Replace comma with dot for decimal parsing (supports both "10.5" and "10,5")
	const normalized = trimmed.replace(',', '.');
	// Return null for intermediate typing states (trailing decimal point)
	// This keeps the raw string in the input so user can continue typing decimals
	if (normalized.endsWith('.')) return null;
	const n = Number(normalized);
	return Number.isFinite(n) ? n : null;
};

export const safeParseForInput = (raw: string): number | string => {
	const parsed = parseNumber(raw);
	return parsed === null ? raw : parsed;
};

/**
 * Formats a number with a thousand separators (spaces) for better readability.
 * Example: 50000000.00 → "50 000 000,00"
 * @param value - The value to format (number, string, null, or undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with spaces as a thousand separators (French locale)
 */
export const formatNumberWithSpaces = (value: string | number | null | undefined, decimals: number = 2): string => {
	if (value === null || value === undefined || value === '') return '';
	const num = typeof value === 'string' ? parseFloat(value) : value;
	if (Number.isNaN(num)) return '';

	// Use toLocaleString with French locale for space-separated thousands
	return num.toLocaleString('fr-FR', {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: true,
	});
};

/**
 * Parses a formatted number string (with spaces as a thousand separators) back to a number.
 * Example: "50 000 000.00" → 50000000.00
 * @param value - The formatted string to parse
 * @returns Parsed number or null if invalid
 */
export const parseFormattedNumber = (value: string | number): number | null => {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	const trimmed = value.trim();
	if (trimmed === '') return null;

	// Remove all spaces (thousand separators)
	let normalized = trimmed.replace(/\s/g, '');
	// Replace comma with dot for decimal parsing
	normalized = normalized.replace(',', '.');

	// Return null for intermediate typing states (trailing decimal point or comma)
	if (normalized.endsWith('.')) return null;

	const n = Number(normalized);
	return Number.isFinite(n) ? n : null;
};

// Consolidated validation helper
export const ValidatePricesHelper = {
	validatePrixVente: (prixVente: number, prixAchat: number): string | null => {
		if (prixVente < prixAchat) {
			return `Le prix de vente (${formatNumber(prixVente)} MAD) doit être supérieur ou égal au prix d'achat (${formatNumber(prixAchat)} MAD)`;
		}
		return null;
	},

	validateRemise: (
		remise: number,
		remiseType: 'Pourcentage' | 'Fixe' | '' | undefined,
		baseAmount: number,
	): string | null => {
		if (!Number.isFinite(remise) || remise < 0) {
			return 'La remise doit être positive ou nulle';
		}

		if (remiseType === 'Pourcentage' && remise > 100) {
			return 'La remise en pourcentage doit être entre 0 et 100';
		}

		if (remiseType === 'Fixe' && remise > baseAmount) {
			return `La remise fixe (${formatNumber(remise)} MAD) ne peut pas dépasser le total (${formatNumber(baseAmount)} MAD)`;
		}

		return null;
	},

	validateGlobalRemise: (
		remise: number,
		remiseType: 'Pourcentage' | 'Fixe' | '',
		totalHTBeforeGlobal: number,
	): string | null => {
		if (!Number.isFinite(remise) || remise < 0) {
			return 'La remise doit être positive ou nulle';
		}

		if (remiseType === 'Pourcentage' && remise > 100) {
			return 'La remise en pourcentage doit être entre 0 et 100';
		}

		if (remiseType === 'Fixe' && remise > totalHTBeforeGlobal) {
			return `La remise fixe globale (${formatNumber(remise)} MAD) ne peut pas dépasser le total HT du devis (${formatNumber(totalHTBeforeGlobal)} MAD)`;
		}

		return null;
	},
};

export const getLabelForKey = (fieldLabels: Record<string, string>, key: string) =>
	fieldLabels[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());

export const getCompanyDocumentLabelForKey = (fieldLabels: Record<string, string>, key: string) => {
	// Handle line errors like: ligne_0_prix_vente or ligne_2_remise
	const lineMatch = key.match(/^ligne_(\d+)_(.+)$/);
	if (lineMatch) {
		const idx = Number(lineMatch[1]);
		const fieldKey = lineMatch[2];
		const baseLabel = fieldLabels[fieldKey] ?? getLabelForKey(fieldLabels, fieldKey);
		return `Ligne ${idx + 1} - ${baseLabel}`;
	}
	// Other known keys (including global_remise)
	if (fieldLabels[key]) return fieldLabels[key];
	// Fallback
	return getLabelForKey(fieldLabels, key);
};

export const extractApiErrorMessage = (error: unknown, fallback: string): string => {
	if (
		typeof error === 'object' &&
		error !== null &&
		'data' in error &&
		typeof (error as { data: unknown }).data === 'object' &&
		(error as { data: { details?: Record<string, string[] | string> } }).data !== null
	) {
		const data = (error as { data: { message?: string; details?: Record<string, string[] | string> | string } }).data;
		const details = data.details;
		if (typeof details === 'string' && details.trim().length > 0) {
			return details;
		}
		if (details && typeof details === 'object') {
			for (const values of Object.values(details)) {
				if (Array.isArray(values) && values.length > 0) {
					return values[0];
				}
				if (typeof values === 'string' && values.length > 0) {
					return values;
				}
			}
		}
		if (data.message) {
			return data.message;
		}
	}
	return fallback;
};

export const getDjangoNextPageParam = (next: string | null, currentPage: number): number | undefined => {
	if (!next) return undefined;
	try {
		const value = new URL(next, 'https://pagination.invalid').searchParams.get('page');
		if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
		const page = Number(value);
		return Number.isSafeInteger(page) && page > currentPage ? page : undefined;
	} catch {
		return undefined;
	}
};

export const checkAppUpdate = async (targetVersion: string): Promise<boolean> => {
	if (!isAppVersion(targetVersion)) return false;
	// A packaged mobile app cannot download new code by reloading. This flow
	// checks the local Metro bundle during development, plus the browser preview.
	if (!__DEV__ && Platform.OS !== 'web') return false;
	try {
		const { status, data } = await getAppVersion();
		if (status !== 200) return false;
		return (
			!!data &&
			typeof data === 'object' &&
			'version' in data &&
			isAppVersion(data.version) &&
			!isNewerAppVersion(targetVersion, data.version)
		);
	} catch {
		return false;
	}
};

export const reloadApp = () => reloadAppAsync();

export const parseEntityId = (value: string | string[] | undefined): number | null => {
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
	const id = Number(value);
	return Number.isSafeInteger(id) ? id : null;
};

export const runWithCleanup = async <T>(action: () => Promise<T>, cleanup: () => void): Promise<T> => {
	try {
		return await action();
	} finally {
		cleanup();
	}
};

export const runWithErrorHandler = async (
	action: () => Promise<void>,
	onError: (error: unknown) => void,
): Promise<void> => {
	try {
		await action();
	} catch (error) {
		onError(error);
	}
};
