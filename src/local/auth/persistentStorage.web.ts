import type { KeyValueStorage } from '@/types/_initTypes';

export const persistentStorage: KeyValueStorage = {
	getItem: async (key) => (typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(key)),
	setItem: async (key, value) => {
		if (typeof sessionStorage === 'undefined')
			return Promise.reject(new Error('Browser session storage is unavailable'));
		sessionStorage.setItem(key, value);
	},
	removeItem: async (key) => {
		if (typeof sessionStorage === 'undefined')
			return Promise.reject(new Error('Browser session storage is unavailable'));
		sessionStorage.removeItem(key);
	},
};
