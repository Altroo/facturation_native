import { type AxiosInstance, CanceledError, create, isAxiosError } from 'axios';
import { createAuthRefresh } from 'axios-auth-refresh';
import { Platform } from 'react-native';
import { loginSchema, tokenSchema } from '@/utils/formValidationSchemas';
import { postApi } from '@/utils/apiHelpers';
import { sessionStorage } from '@/Storage/sessionStorage';
import type { Credentials, SessionRequest, SessionResult, Tokens, TokenStorage } from '@/types/accountTypes';

export class InvalidSessionError extends Error {}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// Django adapter. axios-auth-refresh owns 401 request queuing and retries.
export const createAuthClient = (transport: AxiosInstance, storage: TokenStorage) => {
	let tokens: Tokens | null = null;
	let generation = 0;
	let refreshCall: Promise<SessionResult> | null = null;
	const listeners = new Set<() => void>();
	const expiryListeners = new Set<() => void>();
	const publish = () => listeners.forEach((listener) => listener());
	const success: SessionResult = { success: true, data: undefined };
	let writes: Promise<SessionResult> = Promise.resolve(success);
	let instance = create({
		baseURL: transport.defaults.baseURL,
		timeout: transport.defaults.timeout,
		withCredentials: transport.defaults.withCredentials,
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
	});
	const check = (epoch: number) => (epoch === generation ? null : new CanceledError('Session changed'));
	const advance = () => {
		generation += 1;
		refreshCall = null;
		// Give each session its own library queue. A pending refresh from the old
		// session must neither stall nor cancel requests after a new login.
		instance = create(instance.defaults);
		configureInstance(instance);
	};
	const save = async (value: Tokens | null, epoch = generation) => {
		writes = writes.then(async (): Promise<SessionResult> => {
			const canceled = check(epoch);
			if (canceled) return { success: false, error: canceled };
			try {
				await storage.write(value);
			} catch (error) {
				return { success: false, error };
			}
			const changed = check(epoch);
			if (changed) return { success: false, error: changed };
			tokens = value;
			publish();
			return success;
		});
		return writes;
	};
	const clear = async () => {
		advance();
		tokens = null;
		publish();
		return save(null);
	};
	const expire = async () => {
		try {
			return await clear();
		} finally {
			expiryListeners.forEach((listener) => listener());
		}
	};
	const refresh = (force = false): Promise<SessionResult> => {
		if (refreshCall) return refreshCall;
		if (!tokens) return Promise.resolve(success);
		const session = tokens;
		const refreshExpired = Date.parse(session.refresh_expiration) <= Date.now();
		// Same expiry window as the web JWT callback. A 401 forces a refresh.
		if (!force && !refreshExpired && Date.now() < Date.parse(session.access_expiration) - REFRESH_BUFFER_MS) {
			return Promise.resolve(success);
		}
		const epoch = generation;
		const refreshTokens = async (): Promise<SessionResult> => {
			try {
				if (refreshExpired) {
					await expire();
					return { success: false, error: new InvalidSessionError('Session expired') };
				}
				const { data } = await postApi(process.env.EXPO_PUBLIC_ACCOUNT_REFRESH_TOKEN, transport, {
					refresh: session.refresh,
				});
				const canceled = check(epoch);
				if (canceled) return { success: false, error: canceled };
				const parsed = tokenSchema.safeParse({ ...session, ...(data as object) });
				if (!parsed.success) return { success: false, error: parsed.error };
				return await save(parsed.data, epoch);
			} catch (failure) {
				const canceled = check(epoch);
				if (canceled) return { success: false, error: canceled };
				if (isAxiosError(failure) && [400, 401].includes(failure.response?.status ?? 0)) {
					await expire();
					return { success: false, error: new InvalidSessionError('Session expired') };
				}
				return { success: false, error: failure };
			}
		};
		// Scheduled checks and 401 recovery must share the same token rotation.
		const pending = refreshTokens().finally(() => {
			if (refreshCall === pending) refreshCall = null;
		});
		refreshCall = pending;
		return pending;
	};
	const signIn = async (credentials: Credentials): Promise<SessionResult> => {
		const parsedCredentials = loginSchema.safeParse(credentials);
		if (!parsedCredentials.success) return { success: false, error: parsedCredentials.error };
		const cleared = await clear();
		if (!cleared.success) return cleared;
		const epoch = generation;
		try {
			const { data } = await postApi(process.env.EXPO_PUBLIC_ACCOUNT_LOGIN, transport, parsedCredentials.data);
			const canceled = check(epoch);
			if (canceled) return { success: false, error: canceled };
			const parsed = tokenSchema.safeParse(data);
			if (!parsed.success) return { success: false, error: parsed.error };
			return await save(parsed.data, epoch);
		} catch (error) {
			return { success: false, error: check(epoch) ?? error };
		}
	};
	const restore = async (): Promise<SessionResult<boolean>> => {
		const epoch = generation;
		try {
			const raw = await storage.read();
			const canceled = check(epoch);
			if (canceled) return { success: false, error: canceled };
			if (raw === null) return { success: true, data: false };
			const parsed = tokenSchema.safeParse(raw);
			if (!parsed.success || Date.parse(parsed.data.refresh_expiration) <= Date.now()) {
				const cleared = await clear();
				return cleared.success ? { success: true, data: false } : cleared;
			}
			tokens = parsed.data;
			publish();
			return { success: true, data: true };
		} catch (error) {
			return { success: false, error };
		}
	};
	const signOut = async (native: boolean): Promise<SessionResult> => {
		const epoch = generation;
		let result: SessionResult = success;
		try {
			if (tokens)
				await instance.post(process.env.EXPO_PUBLIC_ACCOUNT_LOGOUT, {}, { nativeLogout: native } as SessionRequest);
		} catch (error) {
			result = { success: false, error };
		}
		// A delayed logout must not erase a newly signed-in account.
		if (epoch === generation) {
			const cleared = await clear();
			if (!cleared.success) return cleared;
		}
		return result;
	};
	const client = {
		get instance() {
			return instance;
		},
		signIn,
		signOut,
		restore,
		refresh,
		clear,
		expire,
		getSession: () => tokens,
		get epoch() {
			return generation;
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		subscribeExpired: (listener: () => void) => {
			expiryListeners.add(listener);
			return () => {
				expiryListeners.delete(listener);
			};
		},
	};
	const configureInstance = (instance: AxiosInstance) => {
		Object.assign(instance.defaults, { sessionEpoch: generation });
		instance.interceptors.request.use(async (config: SessionRequest) => {
			const canceled = check(config.sessionEpoch ?? generation);
			if (canceled) return Promise.reject(canceled);
			if (refreshCall) {
				const result = await refreshCall;
				if (!result.success) return Promise.reject(result.error);
			}
			const changed = check(config.sessionEpoch ?? generation);
			if (changed) return Promise.reject(changed);
			if (!tokens) return Promise.reject(new InvalidSessionError('Sign in required'));
			config.headers.set('Authorization', 'Bearer ' + tokens.access);
			if (config.nativeLogout) config.headers.set('Cookie', 'facturation_backend-jwt-refresh=' + tokens.refresh);
			if (config.data instanceof FormData) config.headers.delete('Content-Type');
			return config;
		});
		instance.interceptors.response.use((response) => {
			const canceled = check((response.config as SessionRequest).sessionEpoch ?? generation);
			return canceled ? Promise.reject(canceled) : response;
		});
		createAuthRefresh(
			instance,
			async (error) => {
				const config = error.config as SessionRequest;
				const epoch = config.sessionEpoch ?? generation;
				const canceled = check(epoch);
				if (canceled) return Promise.reject(canceled);
				if (!tokens) return Promise.reject(new InvalidSessionError('Sign in required'));
				// A delayed 401 can refer to a token another request has already rotated.
				if (config.headers.get('Authorization') !== 'Bearer ' + tokens.access) return;
				const result = await refresh(true);
				if (!result.success) return Promise.reject(result.error);
			},
			{
				// Accept concurrent 401 responses too. The library shares its refreshCall
				// and queues new requests; pausing interception would reject sibling 401s.
				deduplicateRefresh: false,
				maxRetries: 1,
				shouldRefresh: (error) =>
					error.response?.status === 401 && (error.config as SessionRequest | undefined)?.sessionEpoch === generation,
			},
		);
		instance.interceptors.response.use(undefined, async (error) => {
			const config = error.config as SessionRequest | undefined;
			if (config?.sessionEpoch !== undefined && config.sessionEpoch !== generation) {
				return Promise.reject(new CanceledError('Session changed'));
			}
			if (error.response?.status === 401 && config?.sessionEpoch === generation) {
				await expire();
				return Promise.reject(new InvalidSessionError('Session expired'));
			}
			return Promise.reject(error);
		});
	};
	configureInstance(instance);
	return client;
};

export const publicInstance = create({
	baseURL: process.env.EXPO_PUBLIC_ROOT_API_URL,
	timeout: 15000,
	withCredentials: Platform.OS === 'web',
	headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});
export const auth = createAuthClient(publicInstance, sessionStorage);
