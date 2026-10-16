import type { AxiosInstance, AxiosRequestConfig } from 'axios';

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
