import { call, fork, put, race, take, takeLatest } from 'redux-saga/effects';
import type { EventChannel, SagaIterator } from 'redux-saga';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import {
	getPermissionsAsync,
	scheduleNotificationAsync,
	setNotificationHandler,
	type NotificationPermissionsStatus,
} from 'expo-notifications';
import * as Types from '@/store/actions';
import { initToken } from '@/store/slices/_initSlice';
import { setWSMaintenance, setWSServerVersion } from '@/store/slices/wsSlice';
import { initWebsocket } from '@/store/services/ws';
import { auth } from '@/auth';
import { notificationApi } from '@/store/services/notification';
import { incrementUnreadCount, setLatestNotification } from '@/store/slices/notificationSlice';
import type { Action } from 'redux';
import type { NotificationType } from '@/types/notificationTypes';
import Icon from '../../../assets/icon.png';

type WSChannelAction = Action & {
	maintenance?: boolean;
	version?: string;
	notification?: NotificationType;
};

function* showNotification(notification: NotificationType): SagaIterator {
	try {
		const epoch = auth.epoch;
		if (!auth.getSession()) return;
		if (Platform.OS === 'web') {
			if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
				new window.Notification(notification.title, {
					body: notification.message,
					icon: Asset.fromModule(Icon).uri,
				});
			}
			return;
		}
		const permissions: NotificationPermissionsStatus = yield call(getPermissionsAsync);
		if (!permissions.granted || auth.epoch !== epoch || !auth.getSession()) return;
		yield call(scheduleNotificationAsync, {
			content: { title: notification.title, body: notification.message },
			trigger: Platform.OS === 'android' ? { channelId: 'facturation' } : null,
		});
	} catch {
		// The in-app notification remains available if the system notification cannot be displayed.
	}
}

function* consumeWS(): SagaIterator {
	const getToken = async (): Promise<string | null> => {
		const epoch = auth.epoch;
		if (!auth.getSession()) return null;
		// Match getSession on web: renew when needed, then read the latest token.
		const result = await auth.refresh();
		if (!result.success) return null;
		return auth.epoch === epoch ? (auth.getSession()?.access ?? null) : null;
	};
	const channel: EventChannel<WSChannelAction> = yield call(initWebsocket, getToken);
	try {
		while (true) {
			const action: WSChannelAction = yield take(channel);
			if (action.type === Types.WS_MAINTENANCE && typeof action.maintenance === 'boolean') {
				yield put(action);
				yield put(setWSMaintenance(action.maintenance));
				if (action.version !== undefined) yield put(setWSServerVersion(action.version));
			} else if (action.type === Types.WS_RECONNECTED) {
				yield put({ type: Types.INIT_MAINTENANCE });
				yield put(notificationApi.util.invalidateTags(['Notification']));
			} else if (action.type === Types.WS_NOTIFICATION && action.notification) {
				if (!action.notification.is_read) yield put(incrementUnreadCount());
				yield put(setLatestNotification(action.notification));
				yield put(notificationApi.util.invalidateTags(['Notification']));
				yield fork(showNotification, action.notification);
			} else {
				yield put(action);
			}
		}
	} finally {
		channel.close();
	}
}

function* connection(): SagaIterator {
	yield race({ socket: call(consumeWS), stopped: take([Types.WS_STOP, Types.ACCOUNT_LOGOUT, initToken.type]) });
}

export function* watchWS(): SagaIterator {
	if (Platform.OS !== 'web') {
		try {
			setNotificationHandler({
				handleNotification: async () => ({
					shouldShowBanner: Boolean(auth.getSession()),
					shouldShowList: Boolean(auth.getSession()),
					shouldPlaySound: false,
					shouldSetBadge: false,
				}),
			});
		} catch {
			// Socket updates and the in-app notification still work without an OS handler.
		}
	}
	yield takeLatest(Types.WS_START, connection);
}
