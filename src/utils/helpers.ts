import {
	ARTICLES_ADD,
	ARTICLES_ARCHIVED,
	ARTICLES_EDIT,
	ARTICLES_LIST,
	ARTICLES_VIEW,
	CLIENTS_ARCHIVED,
	CLIENTS_ADD,
	CLIENTS_EDIT,
	CLIENTS_LIST,
	CLIENTS_VIEW,
	COMPANIES_ADD,
	COMPANIES_EDIT,
	COMPANIES_LIST,
	COMPANIES_VIEW,
	DASHBOARD,
	DEVIS_LIST,
	DEVIS_ADD,
	DEVIS_VIEW,
	DEVIS_EDIT,
	FACTURE_PRO_FORMA_LIST,
	FACTURE_PRO_FORMA_ADD,
	FACTURE_PRO_FORMA_VIEW,
	FACTURE_PRO_FORMA_EDIT,
	FACTURE_CLIENT_LIST,
	FACTURE_CLIENT_UNPAID,
	FACTURE_CLIENT_ADD,
	FACTURE_CLIENT_VIEW,
	FACTURE_CLIENT_EDIT,
	DASHBOARD_EDIT_PROFILE,
	DASHBOARD_NOTIFICATIONS,
	DASHBOARD_PASSWORD,
	USERS_ADD,
	USERS_EDIT,
	USERS_LIST,
	USERS_VIEW,
} from '@/utils/routes';
import type { DeviFactureLineFormValues, Totals, TypeRemiseType } from '@/types/devisTypes';
import type { TranslationDictionary } from '@/types/languageTypes';
import type { ArticleClass } from '@/models/classes';
import type { SalePriceBasis } from '@/types/articleTypes';
import { reloadAppAsync } from 'expo';
import { aiWritingFields, NECTAR_RAISON_SOCIALE } from '@/utils/rawData';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { APIContentTypeInterface, ApiErrorResponseType } from '@/types/_initTypes';
import { auth, publicInstance, InvalidSessionError } from '@/auth';

// Keep auth-refresh failures raw inside auth.instance. Normalize only the caller-facing result.
const apiFailure = (failure: unknown, authenticated: boolean) => {
	if (failure instanceof InvalidSessionError || axios.isCancel(failure)) return failure;
	const error = failure as {
		error?: ApiErrorResponseType;
		message?: string;
		response?: { status?: number; data?: ApiErrorResponseType & { detail?: string; error?: { code?: string } } };
	} | null;
	if (error?.error) return failure;
	const status = error?.response?.status ?? 0;
	const data = error?.response?.data;
	// Preserve the web's structured service failures before the generic outage fallback.
	if (typeof data?.error?.code === 'string')
		return {
			error: {
				status_code: status,
				code: data.error.code,
				message: data.message || error?.message || 'Erreur serveur.',
				details: data.details || {},
			},
		};
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

export const formatDate = (value: string | null, includeTime = true) => {
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
	// A document issue/due date is a calendar day, not a midnight UTC instant.
	const date = new Date(!includeTime && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
	if (Number.isNaN(date.getTime())) return '-';
	return new Intl.DateTimeFormat('fr-FR', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		...(includeTime ? { hour: '2-digit' as const, minute: '2-digit' as const, second: '2-digit' as const } : {}),
	}).format(date);
};

export const formatLocalDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const formatNumber = (value: string | number | null | undefined): string => {
	return formatNumberWithSpaces(value, 2) || '0,00';
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

	// French Intl output uses narrow spaces, which can look like missing separators
	// in our mobile font. Use regular-width nonbreaking spaces for every group.
	return num
		.toLocaleString('fr-FR', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
			useGrouping: true,
		})
		.replace(/[\u00a0\u202f]/g, '\u00a0');
};

export const isAiTextField = (name: string, type: string) =>
	(type === 'text' || type === 'textarea') && aiWritingFields.has(name);

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

export const isAppVersion = (value: unknown): value is string =>
	typeof value === 'string' && /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.exec(value)?.[0] === value;

export const isNewerAppVersion = (candidate: unknown, current: unknown): boolean => {
	if (!isAppVersion(candidate) || !isAppVersion(current)) return false;
	const next = candidate.split('.').map(Number);
	const local = current.split('.').map(Number);
	for (let i = 0; i < next.length; i++) {
		if (next[i] !== local[i]) return next[i] > local[i];
	}
	return false;
};

export const normalizeCompanyName = (value?: string | null): string => (value ?? '').trim().toUpperCase();

export const isNectarRaisonSociale = (value?: string | null): boolean =>
	normalizeCompanyName(value) === NECTAR_RAISON_SOCIALE;

export const calculateSalePriceHT = (price: number, tva: number, basis: SalePriceBasis = 'HT'): number => {
	if (basis === 'HT') return price;
	// Work in cents and VAT basis points so half-cent results round consistently.
	const cents = Math.round(price * 100);
	const taxFactor = 10_000 + Math.round(tva * 100);
	return Math.round((cents * 10_000) / taxFactor) / 100;
};

export const calculateSalePriceTTC = (priceHT: number, tva: number): number => {
	const cents = Math.round(priceHT * 100);
	const taxFactor = 10_000 + Math.round(tva * 100);
	return Math.round((cents * taxFactor) / 10_000) / 100;
};

// Backend notification targets still use the web paths. Only map implemented mobile screens.
export const getNotificationDestination = (target?: string) => {
	if (!target || !/^\/dashboard(?:[/?]|$)/.test(target)) return null;
	const path = target.split('?')[0].replace(/\/$/, '');
	if (path === '/dashboard') return DASHBOARD;
	if (path === '/dashboard/companies') return COMPANIES_LIST;
	if (path === '/dashboard/companies/new') return COMPANIES_ADD;
	// Articles use the web's company query parameter for tenant-scoped screens.
	if (path === '/dashboard/articles') return ARTICLES_LIST;
	if (path === '/dashboard/articles/archived') return ARTICLES_ARCHIVED;
	if (path === '/dashboard/articles/new' || /^\/dashboard\/articles\/[1-9]\d*(?:\/edit)?$/.test(path)) {
		const company = new URLSearchParams(target.split('?')[1] ?? '').get('company_id');
		const companyId = company && /^[1-9]\d*$/.test(company) ? Number(company) : null;
		if (companyId === null || !Number.isSafeInteger(companyId)) return ARTICLES_LIST;
		if (path.endsWith('/new')) return { pathname: ARTICLES_ADD, params: { company_id: String(companyId) } };
		const articleId = Number(path.split('/')[3]);
		if (!Number.isSafeInteger(articleId)) return null;
		const route = path.endsWith('/edit') ? ARTICLES_EDIT(articleId) : ARTICLES_VIEW(articleId);
		return { ...route, params: { ...route.params, company_id: String(companyId) } };
	}
	if (path === '/dashboard/devis') return DEVIS_LIST;
	if (path === '/dashboard/devis/new' || /^\/dashboard\/devis\/[1-9]\d*(?:\/edit)?$/.test(path)) {
		const companyId = parseEntityId(new URLSearchParams(target.split('?')[1] ?? '').get('company_id') ?? undefined);
		if (companyId === null) return DEVIS_LIST;
		if (path.endsWith('/new')) return { pathname: DEVIS_ADD, params: { company_id: String(companyId) } };
		const id = parseEntityId(path.split('/')[3]);
		if (id === null) return null;
		const route = path.endsWith('/edit') ? DEVIS_EDIT(id) : DEVIS_VIEW(id);
		return { ...route, params: { ...route.params, company_id: String(companyId) } };
	}
	if (path === '/dashboard/clients') return CLIENTS_LIST;
	if (path === '/dashboard/clients/new' || /^\/dashboard\/clients\/[1-9]\d*(?:\/edit)?$/.test(path)) {
		const companyId = parseEntityId(new URLSearchParams(target.split('?')[1] ?? '').get('company_id') ?? undefined);
		if (companyId === null) return CLIENTS_LIST;
		if (path.endsWith('/new')) return { pathname: CLIENTS_ADD, params: { company_id: String(companyId) } };
		const id = parseEntityId(path.split('/')[3]);
		if (id === null) return null;
		const route = path.endsWith('/edit') ? CLIENTS_EDIT(id) : CLIENTS_VIEW(id);
		return { ...route, params: { ...route.params, company_id: String(companyId) } };
	}
	if (path === '/dashboard/facture-pro-forma') return FACTURE_PRO_FORMA_LIST;
	if (
		path === '/dashboard/facture-pro-forma/new' ||
		/^\/dashboard\/facture-pro-forma\/[1-9]\d*(?:\/edit)?$/.test(path)
	) {
		const companyId = parseEntityId(new URLSearchParams(target.split('?')[1] ?? '').get('company_id') ?? undefined);
		if (companyId === null) return FACTURE_PRO_FORMA_LIST;
		if (path.endsWith('/new')) return { pathname: FACTURE_PRO_FORMA_ADD, params: { company_id: String(companyId) } };
		const id = parseEntityId(path.split('/')[3]);
		if (id === null) return null;
		const route = path.endsWith('/edit') ? FACTURE_PRO_FORMA_EDIT(id) : FACTURE_PRO_FORMA_VIEW(id);
		return { ...route, params: { ...route.params, company_id: String(companyId) } };
	}
	if (path === '/dashboard/facture-client/unpaid') return FACTURE_CLIENT_UNPAID;
	if (path === '/dashboard/facture-client') return FACTURE_CLIENT_LIST;
	if (path === '/dashboard/facture-client/new' || /^\/dashboard\/facture-client\/[1-9]\d*(?:\/edit)?$/.test(path)) {
		const companyId = parseEntityId(new URLSearchParams(target.split('?')[1] ?? '').get('company_id') ?? undefined);
		if (companyId === null) return FACTURE_CLIENT_LIST;
		if (path.endsWith('/new')) return { pathname: FACTURE_CLIENT_ADD, params: { company_id: String(companyId) } };
		const id = parseEntityId(path.split('/')[3]);
		if (id === null) return null;
		const route = path.endsWith('/edit') ? FACTURE_CLIENT_EDIT(id) : FACTURE_CLIENT_VIEW(id);
		return { ...route, params: { ...route.params, company_id: String(companyId) } };
	}
	if (path === '/dashboard/clients/archived') return CLIENTS_ARCHIVED;
	if (path === '/dashboard/users') return USERS_LIST;
	if (path === '/dashboard/users/new') return USERS_ADD;
	if (path === '/dashboard/settings/edit-profile') return DASHBOARD_EDIT_PROFILE;
	if (path === '/dashboard/settings/password') return DASHBOARD_PASSWORD;
	if (path === '/dashboard/settings/notifications') return DASHBOARD_NOTIFICATIONS;
	const match = /^\/dashboard\/(companies|users)\/([1-9]\d*)(\/edit)?$/.exec(path);
	if (!match || !Number.isSafeInteger(Number(match[2]))) return null;
	const id = Number(match[2]);
	return match[1] === 'companies'
		? match[3]
			? COMPANIES_EDIT(id)
			: COMPANIES_VIEW(id)
		: match[3]
			? USERS_EDIT(id)
			: USERS_VIEW(id);
};

// Use the same line/global discount calculation in document forms and totals.
// VAT is reduced proportionally so documents with mixed tax rates stay correct.
export const calculateDocumentTotals = (
	lignes: DeviFactureLineFormValues[],
	articles: Partial<ArticleClass>[],
	remise_type: TypeRemiseType = '',
	remise = 0,
): Totals => {
	const lineTotals = lignes.map((line) => {
		const base = (parseNumber(line.prix_vente) ?? 0) * (parseNumber(line.quantity) ?? 0);
		const discount = parseNumber(line.remise ?? 0) ?? 0;
		const ht = Math.max(
			0,
			line.remise_type === 'Pourcentage'
				? base * (1 - discount / 100)
				: line.remise_type === 'Fixe'
					? base - discount
					: base,
		);
		return { ht, tva: Number(articles.find((article) => article.id === line.article)?.tva ?? 0) };
	});
	const totalHT = lineTotals.reduce((sum, line) => sum + line.ht, 0);
	const discountedHT = Math.max(
		0,
		remise_type === 'Pourcentage'
			? totalHT * (1 - Number(remise || 0) / 100)
			: remise_type === 'Fixe'
				? totalHT - Number(remise || 0)
				: totalHT,
	);
	const ratio = totalHT > 0 ? discountedHT / totalHT : 0;
	const totalTVA = lineTotals.reduce((sum, line) => sum + (line.ht * ratio * line.tva) / 100, 0);
	const totalTTC = discountedHT + totalTVA;
	return {
		totalHT,
		totalTVA,
		totalTTC,
		totalTTCApresRemise: totalTTC,
		totalPrixAchat: lignes.reduce(
			(sum, line) => sum + (parseNumber(line.prix_achat) ?? 0) * (parseNumber(line.quantity) ?? 0),
			0,
		),
		totalPrixAchatDevise: lignes[0]?.devise_prix_achat || null,
	};
};

export const getStatutLabel = (statut: string, t: TranslationDictionary): string => {
	switch (statut) {
		case 'Brouillon':
			return t.rawData.documentStatuses.draft;
		case 'Envoyé':
			return t.rawData.documentStatuses.sent;
		case 'Accepté':
			return t.rawData.documentStatuses.accepted;
		case 'Facturé':
			return t.rawData.documentStatuses.invoiced;
		case 'Refusé':
			return t.rawData.documentStatuses.refused;
		case 'Annulé':
			return t.rawData.documentStatuses.cancelled;
		case 'Expiré':
			return t.rawData.documentStatuses.expired;
		case 'Valide':
			return t.common.validShort;
		default:
			return statut;
	}
};
