import type { EventChannel } from 'redux-saga';
import { eventChannel } from 'redux-saga';
import {
	WSMaintenanceAction,
	WSNotificationAction,
	WSReconnectedAction,
	WSUserAvatarAction,
} from '@/store/actions/wsActions';
import type { WSAction, WSEnvelope } from '@/types/wsTypes';
import type { NotificationType } from '@/types/notificationTypes';

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};

const isWSEnvelope = (value: unknown): value is WSEnvelope => {
	if (!isObjectRecord(value)) {
		return false;
	}

	const message = value.message;
	if (!isObjectRecord(message)) {
		return false;
	}

	return typeof message.type === 'string';
};

const isNotificationTypeValue = (value: unknown): value is NotificationType['notification_type'] => {
	return (
		value === 'overdue_invoice' ||
		value === 'expiring_quote' ||
		value === 'uninvoiced_bdl' ||
		value === 'status_change' ||
		value === 'document_created' ||
		value === 'low_stock'
	);
};

const WS_MAX_RECONNECT_DELAY_MS = 30000;
const WS_INITIAL_RECONNECT_DELAY_MS = 1000;

export const initWebsocket = (getToken: () => Promise<string | null>): EventChannel<WSAction> => {
	return eventChannel<WSAction>((emitter) => {
		let disposed = false;
		let ws: WebSocket | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let reconnectDelay = WS_INITIAL_RECONNECT_DELAY_MS;

		let hasConnectedBefore = false;

		const retry = () => {
			if (disposed || timer !== undefined) return;
			timer = setTimeout(() => {
				timer = undefined;
				void createWs();
			}, reconnectDelay);
			reconnectDelay = Math.min(reconnectDelay * 2, WS_MAX_RECONNECT_DELAY_MS);
		};

		const createWs = async () => {
			const wsUrl = `${process.env.EXPO_PUBLIC_ROOT_WS_URL}`;
			if (disposed) return;
			try {
				const token = await getToken();
				if (disposed) return;
				if (!token) {
					retry();
					return;
				}
				const current = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
				ws = current;
				const isCurrent = () => !disposed && ws === current;
				current.onopen = () => {
					if (!isCurrent()) return;
					// Reset delay on successful connection
					reconnectDelay = WS_INITIAL_RECONNECT_DELAY_MS;
					if (hasConnectedBefore) {
						emitter(WSReconnectedAction());
					}
					hasConnectedBefore = true;
				};
				current.onerror = () => {
					// Errors are followed by onclose, no action needed here
				};
				current.onmessage = (e) => {
					if (!isCurrent()) return;
					try {
						const parsedMessage: unknown = JSON.parse(e.data);
						if (isWSEnvelope(parsedMessage)) {
							const { message } = parsedMessage;
							const signalType = message.type;
							if (signalType === 'USER_AVATAR') {
								if (typeof message.pk === 'number' && typeof message.avatar === 'string') {
									emitter(WSUserAvatarAction(message.pk, message.avatar));
								}
							} else if (signalType === 'MAINTENANCE') {
								if (typeof message.maintenance === 'boolean') {
									emitter(WSMaintenanceAction(message.maintenance, message.version));
								}
							} else if (signalType === 'NOTIFICATION') {
								if (typeof message.id === 'number' && typeof message.title === 'string') {
									const notification: NotificationType = {
										id: message.id,
										title: message.title,
										message: typeof message.message === 'string' ? message.message : '',
										notification_type: isNotificationTypeValue(message.notification_type)
											? message.notification_type
											: 'status_change',
										object_id: typeof message.object_id === 'number' ? message.object_id : null,
										target_url: typeof message.target_url === 'string' ? message.target_url : '',
										is_read: typeof message.is_read === 'boolean' ? message.is_read : false,
										date_created:
											typeof message.date_created === 'string' ? message.date_created : new Date().toISOString(),
									};
									emitter(WSNotificationAction(notification));
								}
							}
						}
					} catch {
						// Skip malformed message and continue listening
					}
				};
				current.onclose = () => {
					if (!isCurrent()) return;
					ws = undefined;
					retry();
				};
			} catch {
				retry();
			}
		};

		void createWs();
		return () => {
			disposed = true;
			if (timer !== undefined) clearTimeout(timer);
			if (ws) {
				ws.onclose = null;
				ws.onerror = null;
				ws.onmessage = null;
				ws.onopen = null;
				try {
					ws.close();
				} catch {
					// The connection may already be unavailable during logout or unmount.
				}
			}
		};
	});
};

/*
	 WS STATUS TITLE                                          e.code
	 WS_CLOSE_STATUS_NORMAL                                 = 1000,
	 WS_CLOSE_STATUS_GOINGAWAY                              = 1001,
	 WS_CLOSE_STATUS_PROTOCOL_ERR                           = 1002,
	 WS_CLOSE_STATUS_UNACCEPTABLE_OPCODE                    = 1003,
	 WS_CLOSE_STATUS_RESERVED                               = 1004,
	 WS_CLOSE_STATUS_NO_STATUS                              = 1005, // RESERVED
	 WS_CLOSE_STATUS_ABNORMAL_CLOSE                         = 1006,
	 WS_CLOSE_STATUS_INVALID_PAYLOAD                        = 1007,
	 WS_CLOSE_STATUS_POLICY_VIOLATION                       = 1008,
	 WS_CLOSE_STATUS_MESSAGE_TOO_LARGE                      = 1009,
	 WS_CLOSE_STATUS_EXTENSION_REQUIRED                     = 1010,
	 WS_CLOSE_STATUS_UNEXPECTED_CONDITION                   = 1011,
	 WS_CLOSE_STATUS_TLS_FAILURE                            = 1015,
	 WS_CLOSE_STATUS_CLIENT_TRANSACTION_DONE                = 2000,
*/
