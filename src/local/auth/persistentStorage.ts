import * as SecureStore from 'expo-secure-store';
import type { KeyValueStorage } from '@/types/_initTypes';

export const persistentStorage: KeyValueStorage = {
	getItem: async (key) => SecureStore.getItemAsync(key),
	setItem: async (key, value) => SecureStore.setItemAsync(key, value),
	removeItem: async (key) => SecureStore.deleteItemAsync(key),
};
