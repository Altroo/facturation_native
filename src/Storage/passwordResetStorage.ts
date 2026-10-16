import { persistentStorage } from '@/local/auth/persistentStorage';
import { passwordResetStorageSchema } from '@/utils/formValidationSchemas';
import { PASSWORD_RESET_STORAGE_KEY, PASSWORD_RESET_MAX_AGE_MS } from '@/utils/rawData';
import type { PasswordResetData } from '@/types/accountTypes';

let completed = false;

export const passwordResetStorage = {
	isComplete: () => completed,
	resetCompletion: () => {
		completed = false;
	},
	complete: async () => {
		try {
			await passwordResetStorage.write(null);
		} catch {
			/* Django has already invalidated the code after a successful reset. */
		} finally {
			completed = true;
		}
	},
	read: async (): Promise<PasswordResetData | null> => {
		if (completed) return null;
		const raw = await persistentStorage.getItem(PASSWORD_RESET_STORAGE_KEY);
		if (!raw) return null;
		try {
			const value = passwordResetStorageSchema.parse(JSON.parse(raw));
			if (value.expiresAt > Date.now()) return { email: value.email, code: value.code };
		} catch {
			/* Discard malformed or expired reset state. */
		}
		await persistentStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
		return null;
	},
	write: async (data: PasswordResetData | null) => {
		if (!data) await persistentStorage.removeItem(PASSWORD_RESET_STORAGE_KEY);
		else
			await persistentStorage.setItem(
				PASSWORD_RESET_STORAGE_KEY,
				JSON.stringify({
					...data,
					expiresAt: Date.now() + PASSWORD_RESET_MAX_AGE_MS,
				}),
			);
		completed = false;
	},
};
