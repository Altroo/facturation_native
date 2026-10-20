import * as types from './index';
import type { NotificationType } from '@/types/notificationTypes';

export const WSUserAvatarAction = (pk: number, avatar: string) => {
	return {
		type: types.WS_USER_AVATAR,
		pk,
		avatar,
	};
};

export const WSMaintenanceAction = (maintenance: boolean, version?: string) => {
	return {
		type: types.WS_MAINTENANCE,
		maintenance,
		...(version === undefined ? {} : { version }),
	};
};

export const WSReconnectedAction = () => {
	return {
		type: types.WS_RECONNECTED,
	};
};

export const WSNotificationAction = (notification: NotificationType) => {
	return {
		type: types.WS_NOTIFICATION,
		notification,
	};
};

export const initMaintenanceAction = () => {
	return { type: types.INIT_MAINTENANCE };
};

export const startWSAction = () => {
	return { type: types.WS_START };
};

export const stopWSAction = () => {
	return { type: types.WS_STOP };
};
