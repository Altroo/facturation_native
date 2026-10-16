import { reloadAppAsync } from 'expo';
import { Platform } from 'react-native';
import { isAppVersion, isNewerAppVersion } from '@/utils/appVersion';

export const checkAppUpdate = async (targetVersion: string): Promise<boolean> => {
	if (!isAppVersion(targetVersion)) return false;
	// A packaged mobile app cannot download new code by reloading. This flow
	// checks the local Metro bundle during development, plus the browser preview.
	if (!__DEV__ && Platform.OS !== 'web') return false;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		// Expo Router resolves this relative URL against the local dev server.
		const response = await fetch(`/api/app-version?check=${Date.now()}`, {
			cache: 'no-store',
			signal: controller.signal,
		});
		if (!response.ok) return false;
		const data: unknown = await response.json();
		return (
			!!data &&
			typeof data === 'object' &&
			'version' in data &&
			isAppVersion(data.version) &&
			!isNewerAppVersion(targetVersion, data.version)
		);
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
};

export const reloadApp = () => reloadAppAsync();
