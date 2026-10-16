import { persistentStorage } from '@/local/auth/persistentStorage';
import { SESSION_STORAGE_KEY } from '@/utils/rawData';
import type { TokenStorage } from '@/types/accountTypes';

export const sessionStorage: TokenStorage = {
	read: async () => {
		const raw = await persistentStorage.getItem(SESSION_STORAGE_KEY);
		if (!raw) return null;
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	},
	write: async (tokens) => {
		if (tokens) await persistentStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tokens));
		else await persistentStorage.removeItem(SESSION_STORAGE_KEY);
	},
};
