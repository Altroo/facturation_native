import type { WSMaintenanceBootstrap } from '@/types/wsTypes';

export type ApiErrorResponseType = {
	status_code: number;
	code?: string;
	message: string;
	details?: Record<string, Array<string> | string>;
};

export interface ResponseDataInterface<T> {
	data: T;
	status: number;
}

export type APIContentTypeInterface = 'application/json' | 'application/x-www-form-urlencoded' | 'multipart/form-data';

//!- Init State
export type InitStateToken = {
	user: {
		pk: number | null;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
	};
	access: string | null;
	refresh: string | null;
	access_expiration: string | null;
	refresh_expiration: string | null;
};

export interface InitStateInterface<T> {
	initStateToken: T;
}

export type AppSession = {
	accessToken?: string;
	user?: { accessToken?: string };
};

export type SagaPayloadType<T> = {
	type: string;
	data: T;
};

export type TokenType = {
	token?: string;
};

export interface PaginationResponseType<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: Array<T>;
}

export type MaintenanceGetRootResponseType = ResponseDataInterface<WSMaintenanceBootstrap>;
// Native storage restores the session asynchronously before Expo Router opens private routes.
export interface NativeSessionState extends InitStateInterface<InitStateToken> {
	status: 'booting' | 'guest' | 'signingIn' | 'authenticated' | 'signingOut' | 'unavailable';
	error: ApiErrorResponseType | null;
}

export type NormalizedError = { error: ApiErrorResponseType };
export type AxiosBaseQueryArgs<D = unknown, P = unknown> = {
	url: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	data?: D;
	params?: P;
};

export type KeyValueStorage = {
	getItem: (key: string) => Promise<string | null>;
	setItem: (key: string, value: string) => Promise<void>;
	removeItem: (key: string) => Promise<void>;
};
