import axios, { type AxiosInstance } from 'axios';
import type { BaseQueryFn, BaseQueryApi } from '@reduxjs/toolkit/query';

import type { ApiErrorResponseType, AxiosBaseQueryArgs, NormalizedError } from '@/types/_initTypes';

// Type guard for normalized errors
const isNormalizedError = (err: unknown): err is NormalizedError => {
	return (
		typeof err === 'object' &&
		err !== null &&
		'error' in err &&
		typeof (err as { error: unknown }).error === 'object' &&
		(err as { error: unknown }).error !== null &&
		'status_code' in (err as NormalizedError).error
	);
};

/**
 * A reusable Axios baseQuery for RTK Query that allows access to Redux state
 * via the BaseQueryApi parameter.
 */
export const axiosBaseQuery =
	<D = unknown, P = unknown>(
		getInstance: (api: BaseQueryApi) => AxiosInstance,
	): BaseQueryFn<AxiosBaseQueryArgs<D, P>, unknown, { status: number; data: ApiErrorResponseType }> =>
	async ({ url, method, data, params }, api) => {
		try {
			// Return native session factory failures through RTK Query too.
			const instance = getInstance(api);
			// Cancel the native request when its query or session is disposed.
			const response = await instance.request({ url, method, data, params, signal: api.signal });
			return { data: response.data };
		} catch (err) {
			// Handle normalized errors from interceptors
			if (isNormalizedError(err)) {
				return {
					error: {
						status: err.error.status_code,
						data: err.error,
					},
				};
			}

			// Handle raw Axios errors

			if (axios.isAxiosError(err)) {
				const status = err.response?.status ?? 0;
				const errorData: ApiErrorResponseType = err.response?.data ?? {
					status_code: status || 0,
					message: err.message || 'Erreur réseau',
					details: { error: ['Impossible de se connecter au serveur'] },
				};

				return {
					error: {
						status: status || 0,
						data: errorData,
					},
				};
			}

			// Handle unexpected errors
			return {
				error: {
					status: 0,
					data: {
						status_code: 0,
						message: err instanceof Error ? err.message : 'Erreur inconnue',
						details: { error: ["Une erreur inattendue s'est produite."] },
					},
				},
			};
		}
	};

export type { ApiErrorResponseType } from '@/types/_initTypes';
