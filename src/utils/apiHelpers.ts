import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
