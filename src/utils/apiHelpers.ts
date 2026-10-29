import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { isAppVersion, isAuthenticatedInstance, isNewerAppVersion } from '@/utils/helpers';
import type { DocumentPdfType } from '@/types/devisTypes';
import type { StatementType } from '@/types/clientTypes';
import { DateFilterParams } from '@/types/dashboardTypes';

let pendingPdfRequests = 0;
const pdfLoadingListeners = new Set<() => void>();

export const getPdfLoading = () => pendingPdfRequests > 0;

export const subscribePdfLoading = (listener: () => void) => {
	pdfLoadingListeners.add(listener);
	return () => {
		pdfLoadingListeners.delete(listener);
	};
};

// Helper function to build query string with date params
export const buildDateQueryString = (params?: DateFilterParams): string => {
	if (!params) return '';
	const searchParams = new URLSearchParams();
	if (params.date_from) searchParams.append('date_from', params.date_from);
	if (params.date_to) searchParams.append('date_to', params.date_to);
	if (params.company_id) searchParams.append('company_id', params.company_id.toString());
	if (params.devise) searchParams.append('devise', params.devise);
	if (params.client_id) searchParams.append('client_id', params.client_id.toString());
	if (params.project) searchParams.append('project', params.project);
	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : '';
};

const updatePdfLoading = (change: 1 | -1) => {
	pendingPdfRequests += change;
	for (const listener of pdfLoadingListeners) listener();
};

// The web opens a Blob URL. Phones preview a local file instead. Axios still
// owns authentication and token refresh; the existing Expo module owns the file.
export const openPdf = async (url: string, filename = 'releve-client'): Promise<boolean> => {
	updatePdfLoading(1);
	try {
		const instance = isAuthenticatedInstance();
		const response = await instance.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
		const bytes = new Uint8Array(response.data);
		// Do not present a JSON/HTML error response as a PDF.
		if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') return false;
		if (Platform.OS === 'web') {
			const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = `${filename}.pdf`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
			return true;
		}
		// The OS may clear cache files; this is not session storage.
		const file = new File(Paths.cache, `${filename}-${Date.now()}.pdf`);
		await file.write(bytes);
		if (!(await file.canPreview({ mimeType: 'application/pdf' }))) return false;
		// iOS presents Quick Look; Android opens an installed PDF viewer. Keep the
		// cache file available because preview resolves before the viewer closes.
		await file.preview({ mimeType: 'application/pdf' });
		return true;
	} catch {
		// The calling screen supplies its translated error toast.
		return false;
	} finally {
		// Every PDF entry point shares this state, including failed downloads and
		// unsupported viewers. Concurrent requests keep the indicator visible.
		updatePdfLoading(-1);
	}
};

// The backend generates this document. Keep its endpoint and query parameters
// in the API layer; navigation routes only describe screens in the app.
export const openClientStatementPdf = (
	id: number,
	company_id: number,
	language: 'fr' | 'en' | 'nl' = 'fr',
	filters: { date_from?: string; date_to?: string; type?: StatementType } = {},
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id) });
	if (filters.date_from) params.set('date_from', filters.date_from);
	if (filters.date_to) params.set('date_to', filters.date_to);
	if (filters.type) params.set('type', filters.type);
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_CLIENT_ROOT}/pdf/${language}/${id}/?${params}`,
	);
};

// GET the local frontend version, independently of the Django API instance.
export const getAppVersion = async () => {
	let baseURL: string | undefined;
	if (Platform.OS !== 'web') {
		const hostUri = Constants.expoConfig?.hostUri;
		if (!__DEV__ || !hostUri) return { status: 0, data: null };
		// Axios needs an absolute Metro URL on native; web uses its current origin.
		baseURL = /^https?:\/\//.test(hostUri) ? hostUri : `http://${hostUri}`;
	}
	const instance = axios.create({ baseURL });
	const response = await instance.get<unknown>('/api/app-version', {
		params: { check: Date.now() },
		timeout: 10_000,
		headers: { 'Cache-Control': 'no-store' },
		responseType: 'json',
		transitional: { silentJSONParsing: false },
	});
	return { status: response.status, data: response.data };
};

/*** Base Axios JSON Api call [POST] */
export const postApi = async <T = unknown>(url: string | undefined, instance: AxiosInstance, body?: object) => {
	const response = await instance.post<T>(`${url}`, body);
	return {
		status: response.status,
		data: response.data,
	};
};

export const checkAppUpdate = async (targetVersion: string): Promise<boolean> => {
	// A packaged mobile app cannot download new code by reloading. This flow
	// checks the local Metro bundle during development, plus the browser preview.
	if (!__DEV__ && Platform.OS !== 'web') return false;
	try {
		if (!isAppVersion(targetVersion)) return false;
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

/*** Base Axios JSON Api call [GET] */
export const getApi = async <T = unknown>(
	url: string | undefined,
	instance: AxiosInstance,
	queryParams?: object,
	config?: AxiosRequestConfig,
) => {
	const response = await instance.get<T>(`${url}`, { ...config, params: queryParams });
	return {
		status: response.status,
		data: response.data,
	};
};

export const openDevisPdf = (
	id: number,
	company_id: number,
	type: DocumentPdfType,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id), type });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_DEVIS_PDF}/${language}/${id}/?${params}`,
		`devis-${id}`,
	);
};

export const openFactureProFormaPdf = (
	id: number,
	company_id: number,
	type: DocumentPdfType,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id), type });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_FACTURE_PROFORMA_PDF}/${language}/${id}/?${params}`,
		`facture-proforma-${id}`,
	);
};

export const openFactureClientPdf = (
	id: number,
	company_id: number,
	type: DocumentPdfType,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id), type });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_FACTURE_CLIENT_PDF}/${language}/${id}/?${params}`,
		`facture-client-${id}`,
	);
};

export const openFactureAvoirPdf = (
	id: number,
	company_id: number,
	type: DocumentPdfType,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id), type });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_FACTURE_AVOIR_PDF}/${language}/${id}/?${params}`,
		`facture-avoir-${id}`,
	);
};

export const openBonDeLivraisonPdf = (
	id: number,
	company_id: number,
	type: DocumentPdfType,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id), type });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_BON_DE_LIVRAISON_PDF}/${language}/${id}/?${params}`,
		`bon-de-livraison-${id}`,
	);
};

export const openReglementPdf = (
	id: number,
	company_id: number,
	language: 'fr' | 'en' | 'nl' = 'fr',
): Promise<boolean> => {
	const params = new URLSearchParams({ company_id: String(company_id) });
	return openPdf(
		`${process.env.EXPO_PUBLIC_ROOT_API_URL}${process.env.EXPO_PUBLIC_REGLEMENT_PDF}/${language}/${id}/?${params}`,
		`recu-reglement-${id}`,
	);
};
