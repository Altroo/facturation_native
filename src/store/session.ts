import type { AppSession } from '@/types/_initTypes';

export const getAccessTokenFromSession = (session?: AppSession): string | undefined => {
	if (!session) return undefined;
	if (session.accessToken?.length && session.accessToken.length > 0) return session.accessToken;
	if (session.user && typeof session.user.accessToken === 'string' && session.user.accessToken.length > 0) {
		return session.user.accessToken;
	}
	return undefined;
};
