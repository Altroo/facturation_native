import { persistentStorage } from '@/local/auth/persistentStorage';
import { SESSION_STORAGE_KEY } from '@/utils/rawData';
import type { TokenStorage } from '@/types/accountTypes';

// Local and production builds share the app ID, but must not share tokens.
// SecureStore keys only allow letters, numbers, periods, underscores and hyphens.
const getSessionStorageKey = () =>
	`${SESSION_STORAGE_KEY}.${process.env.EXPO_PUBLIC_ROOT_API_URL}`.replace(/[^a-zA-Z0-9._-]/g, '_');

export const sessionStorage: TokenStorage = {
	read: async () => {
		const raw = await persistentStorage.getItem(getSessionStorageKey());
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	},
	write: async (tokens) => {
		if (tokens) await persistentStorage.setItem(getSessionStorageKey(), JSON.stringify(tokens));
		else await persistentStorage.removeItem(getSessionStorageKey());
	},
};
