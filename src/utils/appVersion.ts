import { version } from '../../package.json';

// Bundled with the running code, never copied from the server announcement.
export const APP_VERSION = version;

export const isAppVersion = (value: unknown): value is string =>
	typeof value === 'string' && /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.exec(value)?.[0] === value;

export const isNewerAppVersion = (candidate: unknown, current: unknown): boolean => {
	if (!isAppVersion(candidate) || !isAppVersion(current)) return false;
	const next = candidate.split('.').map(Number);
	const local = current.split('.').map(Number);
	for (let i = 0; i < next.length; i++) {
		if (next[i] !== local[i]) return next[i] > local[i];
	}
	return false;
};
