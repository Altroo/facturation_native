import type { Tokens, TokenStorage } from '@/types/accountTypes';

// Browser preview keeps authentication tokens in memory only.
let value: Tokens | null = null;
export const sessionStorage: TokenStorage = {
	read: async () => value,
	write: async (tokens) => {
		value = tokens;
	},
};
