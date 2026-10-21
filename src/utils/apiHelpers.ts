import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isAppVersion, isNewerAppVersion } from '@/utils/helpers';

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
