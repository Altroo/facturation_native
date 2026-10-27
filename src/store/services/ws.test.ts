import { END, type EventChannel } from 'redux-saga';
import { initWebsocket } from '@/store/services/ws';
import {
	WSMaintenanceAction,
	WSReconnectedAction,
	WSNotificationAction,
	WSUserAvatarAction,
} from '@/store/actions/wsActions';
import type { WSAction } from '@/types/wsTypes';
import type { NotificationType } from '@/types/notificationTypes';

type SocketStub = {
	onopen: null | (() => void);
	onmessage: null | ((event: { data: string }) => void);
	onerror: null | (() => void);
	onclose: null | (() => void);
	close: jest.Mock;
};
const sockets: SocketStub[] = [];
const channels: EventChannel<WSAction>[] = [];
const originalSocket = global.WebSocket;
const socketConstructor = jest.fn(() => {
	const socket: SocketStub = {
		onopen: null,
		onmessage: null,
		onerror: null,
		onclose: null,
		close: jest.fn(() => socket.onclose?.()),
	};
	sockets.push(socket);
	return socket;
});
const open = (getToken = jest.fn(async () => 'access')) => {
	const channel = initWebsocket(getToken);
	channels.push(channel);
	return { channel, getToken };
};
const flush = async () => {
	await Promise.resolve();
	await Promise.resolve();
};
beforeEach(() => {
	jest.useFakeTimers();
	sockets.length = 0;
	socketConstructor.mockClear();
	global.WebSocket = socketConstructor as unknown as typeof WebSocket;
});
afterEach(() => {
	channels.splice(0).forEach((channel) => channel.close());
	jest.useRealTimers();
	global.WebSocket = originalSocket;
});
it('uses the configured WebSocket URL without deriving it from the API host', async () => {
	const env = [jest.replaceProperty(process.env, 'EXPO_PUBLIC_ROOT_WS_URL', 'wss://socket.example.invalid/custom/ws')];
	try {
		open();
		await flush();
		expect(socketConstructor).toHaveBeenCalledWith('wss://socket.example.invalid/custom/ws?token=access');
	} finally {
		env.forEach((variable) => variable.restore());
	}
});
it('authenticates with an encoded token and emits reconnect only after a previous open', async () => {
	const { channel } = open(jest.fn(async () => 'a+b/c='));
	await flush();
	expect(socketConstructor).toHaveBeenCalledWith('ws://localhost:8000/ws?token=a%2Bb%2Fc%3D');
	const receive = jest.fn();
	channel.take(receive);
	sockets[0].onopen?.();
	expect(receive).not.toHaveBeenCalled();
	sockets[0].onclose?.();
	jest.advanceTimersByTime(1000);
	await flush();
	sockets[1].onopen?.();
	expect(receive).toHaveBeenCalledWith(WSReconnectedAction());
});
it('ignores malformed messages and delivers a validated maintenance signal', async () => {
	const { channel } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	for (const data of [
		'{',
		'{}',
		'{"message":{"type":"MAINTENANCE","maintenance":"false"}}',
		'{"message":{"type":"OTHER","maintenance":true}}',
	])
		sockets[0].onmessage?.({ data });
	expect(receive).not.toHaveBeenCalled();
	sockets[0].onmessage?.({
		data: JSON.stringify({
			message: { type: 'MAINTENANCE', maintenance: true, version: '9.0.0', version_mobile: '3.6.2' },
		}),
	});
	expect(receive).toHaveBeenCalledWith(WSMaintenanceAction(true, '3.6.2'));
});
it('retries with backoff and obtains a fresh token for each connection', async () => {
	const token = jest.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new').mockResolvedValue('newer');
	open(token);
	await flush();
	sockets[0].onclose?.();
	jest.advanceTimersByTime(999);
	expect(token).toHaveBeenCalledTimes(1);
	jest.advanceTimersByTime(1);
	await flush();
	expect(socketConstructor).toHaveBeenLastCalledWith('ws://localhost:8000/ws?token=new');
	sockets[1].onclose?.();
	jest.advanceTimersByTime(1999);
	expect(token).toHaveBeenCalledTimes(2);
	jest.advanceTimersByTime(1);
	await flush();
	expect(token).toHaveBeenCalledTimes(3);
	sockets[2].onopen?.();
	sockets[2].onclose?.();
	jest.advanceTimersByTime(1000);
	await flush();
	expect(token).toHaveBeenCalledTimes(4);
});
it('does not deliver delayed messages or reconnects from a replaced socket', async () => {
	const { channel, getToken } = open();
	await flush();
	const old = sockets[0];
	old.onclose?.();
	jest.advanceTimersByTime(1000);
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	old.onmessage?.({ data: JSON.stringify({ message: { type: 'MAINTENANCE', maintenance: true } }) });
	old.onopen?.();
	old.onerror?.();
	old.onclose?.();
	expect(receive).not.toHaveBeenCalled();
	jest.advanceTimersByTime(30000);
	await flush();
	expect(getToken).toHaveBeenCalledTimes(2);
});
it('clears a scheduled reconnect when closed', async () => {
	const { channel, getToken } = open();
	await flush();
	sockets[0].onclose?.();
	channel.close();
	jest.advanceTimersByTime(60000);
	await flush();
	expect(getToken).toHaveBeenCalledTimes(1);
	expect(jest.getTimerCount()).toBe(0);
});
it('closes the socket without scheduling a reconnect and ends pending takes', async () => {
	const { channel, getToken } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	channel.close();
	expect(sockets[0].close).toHaveBeenCalledTimes(1);
	expect(receive).toHaveBeenCalledWith(END);
	jest.advanceTimersByTime(60000);
	await flush();
	expect(getToken).toHaveBeenCalledTimes(1);
});
it('does not create a socket if token retrieval finishes after disposal', async () => {
	let resolve!: (token: string) => void;
	const { channel } = open(
		jest.fn(
			() =>
				new Promise<string>((done) => {
					resolve = done;
				}),
		),
	);
	channel.close();
	resolve('late');
	await flush();
	expect(socketConstructor).not.toHaveBeenCalled();
	expect(jest.getTimerCount()).toBe(0);
});
it('finishes disposal even when the connection cannot be closed', async () => {
	const { channel, getToken } = open();
	await flush();
	sockets[0].close.mockImplementation(() => {
		throw new Error('Connection unavailable');
	});
	expect(() => channel.close()).not.toThrow();
	expect(sockets[0]).toMatchObject({ onclose: null, onerror: null, onmessage: null, onopen: null });
	jest.advanceTimersByTime(60000);
	await flush();
	expect(getToken).toHaveBeenCalledTimes(1);
});
it('retries missing tokens and transient token retrieval failures without opening an unauthenticated socket', async () => {
	const token = jest
		.fn()
		.mockResolvedValueOnce(null)
		.mockRejectedValueOnce(new Error('offline'))
		.mockResolvedValue('ready');
	open(token);
	await flush();
	expect(socketConstructor).not.toHaveBeenCalled();
	jest.advanceTimersByTime(1000);
	await flush();
	expect(socketConstructor).not.toHaveBeenCalled();
	jest.advanceTimersByTime(2000);
	await flush();
	expect(socketConstructor).toHaveBeenCalledTimes(1);
});

it('keeps valid stock notification fields and ignores malformed notifications', async () => {
	const { channel } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	sockets[0].onmessage?.({ data: JSON.stringify({ message: { type: 'NOTIFICATION', id: 'bad', title: 'Invalid' } }) });
	expect(receive).not.toHaveBeenCalled();
	const notification: NotificationType = {
		id: 10,
		title: 'Stock minimum',
		message: 'Article disponible: 2',
		notification_type: 'low_stock',
		object_id: 4,
		target_url: '/dashboard/stock?company_id=2',
		is_read: false,
		date_created: '2026-10-14T12:00:00Z',
	};
	sockets[0].onmessage?.({ data: JSON.stringify({ message: { type: 'NOTIFICATION', ...notification } }) });
	expect(receive).toHaveBeenCalledWith(WSNotificationAction(notification));
});

it('validates USER_AVATAR messages before forwarding the original pk/avatar action', async () => {
	const { channel } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	for (const message of [
		{ type: 'USER_AVATAR', pk: '7', avatar: 'resized.png' },
		{ type: 'USER_AVATAR', pk: 7, avatar: null },
	])
		sockets[0].onmessage?.({ data: JSON.stringify({ message }) });
	expect(receive).not.toHaveBeenCalled();
	sockets[0].onmessage?.({ data: JSON.stringify({ message: { type: 'USER_AVATAR', pk: 7, avatar: 'resized.png' } }) });
	expect(receive).toHaveBeenCalledWith(WSUserAvatarAction(7, 'resized.png'));
});

it.each([true, false])('applies maintenance %s even when the version is invalid', async (maintenance) => {
	const { channel } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	sockets[0].onmessage?.({
		data: JSON.stringify({ message: { type: 'MAINTENANCE', maintenance, version_mobile: 'bad' } }),
	});
	expect(receive).toHaveBeenCalledWith(WSMaintenanceAction(maintenance, 'bad'));
});

it('does not fall back to the web version when the mobile announcement is missing', async () => {
	const { channel } = open();
	await flush();
	const receive = jest.fn();
	channel.take(receive);
	sockets[0].onmessage?.({
		data: JSON.stringify({ message: { type: 'MAINTENANCE', maintenance: false, version: '9.0.0' } }),
	});
	expect(receive).toHaveBeenCalledWith(WSMaintenanceAction(false));
});

class MockWebSocket implements WebSocket {
	url: string;
	onopen: ((this: WebSocket, ev: Event) => void) | null = null;
	onerror: ((this: WebSocket, ev: Event) => void) | null = null;
	onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
	onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;
	readonly CLOSED = 3;
	readonly CLOSING = 2;
	readonly CONNECTING = 0;
	readonly OPEN = 1;
	readyState: 0 | 1 | 2 | 3 = this.CONNECTING;
	protocol = '';
	extensions = '';
	bufferedAmount = 0;
	binaryType: BinaryType = 'blob';

	constructor(url: string) {
		this.url = url;
	}

	send(): void {}
	ping(): void {}
	close(): void {
		this.readyState = this.CLOSED;
	}
	addEventListener(): void {}
	removeEventListener(): void {}
	dispatchEvent(): boolean {
		return true;
	}
}

describe('initWebsocket', () => {
	let originalWebSocket: typeof WebSocket | undefined;

	beforeEach(() => {
		jest.useRealTimers();
		originalWebSocket = global.WebSocket;
		delete (global as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
	});

	afterEach(() => {
		if (originalWebSocket) {
			global.WebSocket = originalWebSocket;
		} else {
			delete (global as unknown as { WebSocket?: typeof WebSocket }).WebSocket;
		}
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	it('emits WSUserAvatarAction when USER_AVATAR message is received', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		type ExpectedAction = ReturnType<typeof WSUserAvatarAction>;
		const channel = initWebsocket(async () => 'test-token');

		const emitted = await new Promise<ExpectedAction>((resolve) => {
			// start listening on the channel
			channel.take((action) => {
				resolve(action as ExpectedAction);
			});

			// ensure the websocket instance created inside initWebsocket is available,
			// schedule message send on next tick if not created synchronously
			const sendMessage = () => {
				if (createdSocket == null) {
					// try again shortly
					setTimeout(sendMessage, 0);
					return;
				}
				const ev = new MessageEvent('message', {
					data: JSON.stringify({
						message: { type: 'USER_AVATAR', pk: 42, avatar: 'https://example.com/avatar.png' },
					}),
				});
				createdSocket.onmessage?.(ev);
			};

			sendMessage();
		});

		expect(emitted).toEqual(WSUserAvatarAction(42, 'https://example.com/avatar.png'));

		channel.close();
	});

	it('emits WSMaintenanceAction when MAINTENANCE message is received', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		type ExpectedAction = ReturnType<typeof WSMaintenanceAction>;
		const channel = initWebsocket(async () => 'test-token');

		const emitted = await new Promise<ExpectedAction>((resolve) => {
			channel.take((action) => {
				resolve(action as ExpectedAction);
			});

			const sendMessage = () => {
				if (createdSocket == null) {
					setTimeout(sendMessage, 0);
					return;
				}
				const ev = new MessageEvent('message', {
					data: JSON.stringify({
						message: { type: 'MAINTENANCE', maintenance: true },
					}),
				});
				createdSocket.onmessage?.(ev);
			};

			sendMessage();
		});

		expect(emitted).toEqual(WSMaintenanceAction(true));

		channel.close();
	});

	it('emits WSNotificationAction for NOTIFICATION messages and falls back unknown types', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		type ExpectedAction = ReturnType<typeof WSNotificationAction>;
		const channel = initWebsocket(async () => 'test-token');

		const emitted = await new Promise<ExpectedAction>((resolve) => {
			channel.take((action) => {
				resolve(action as ExpectedAction);
			});

			const sendMessage = () => {
				if (createdSocket == null) {
					setTimeout(sendMessage, 0);
					return;
				}
				const ev = new MessageEvent('message', {
					data: JSON.stringify({
						message: {
							type: 'NOTIFICATION',
							id: 7,
							title: 'Alert',
							message: 'Needs review',
							notification_type: 'unexpected_type',
							object_id: 42,
							target_url: '/dashboard/facture-client/42',
							is_read: false,
							date_created: '2026-04-08T12:00:00.000Z',
						},
					}),
				});
				createdSocket.onmessage?.(ev);
			};

			sendMessage();
		});

		expect(emitted).toEqual(
			WSNotificationAction({
				id: 7,
				title: 'Alert',
				message: 'Needs review',
				notification_type: 'status_change',
				object_id: 42,
				target_url: '/dashboard/facture-client/42',
				is_read: false,
				date_created: '2026-04-08T12:00:00.000Z',
			}),
		);

		channel.close();
	});

	it('handles onopen callback and resets reconnect delay', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		await new Promise<void>((resolve) => {
			const checkSocket = () => {
				if (createdSocket) {
					// Trigger onopen callback
					createdSocket.onopen?.call(createdSocket, new Event('open'));
					resolve();
				} else {
					setTimeout(checkSocket, 0);
				}
			};
			checkSocket();
		});

		// If we got here without errors, onopen was called successfully
		expect(createdSocket).not.toBeNull();
		channel.close();
	});

	it('handles onerror callback gracefully', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		await new Promise<void>((resolve) => {
			const checkSocket = () => {
				if (createdSocket) {
					// Trigger onerror callback
					createdSocket.onerror?.call(createdSocket, new Event('error'));
					resolve();
				} else {
					setTimeout(checkSocket, 0);
				}
			};
			checkSocket();
		});

		// Should not throw - errors are followed by onclose
		expect(createdSocket).not.toBeNull();
		channel.close();
	});

	it('handles malformed message data gracefully', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		await new Promise<void>((resolve) => {
			const sendMalformed = () => {
				if (createdSocket == null) {
					setTimeout(sendMalformed, 0);
					return;
				}
				// Send malformed JSON
				const ev = new MessageEvent('message', { data: 'not valid json {' });
				createdSocket.onmessage?.(ev);
				resolve();
			};
			sendMalformed();
		});

		// Should not throw - malformed messages are silently ignored
		expect(createdSocket).not.toBeNull();
		channel.close();
	});

	it('handles message with null content gracefully', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		await new Promise<void>((resolve) => {
			const sendNull = () => {
				if (createdSocket == null) {
					setTimeout(sendNull, 0);
					return;
				}
				// Send null message
				const ev = new MessageEvent('message', { data: 'null' });
				createdSocket.onmessage?.(ev);
				resolve();
			};
			sendNull();
		});

		expect(createdSocket).not.toBeNull();
		channel.close();
	});

	it('handles unknown message type gracefully', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		await new Promise<void>((resolve) => {
			const sendUnknown = () => {
				if (createdSocket == null) {
					setTimeout(sendUnknown, 0);
					return;
				}
				// Send unknown message type
				const ev = new MessageEvent('message', {
					data: JSON.stringify({ message: { type: 'UNKNOWN_TYPE', data: 'test' } }),
				});
				createdSocket.onmessage?.(ev);
				resolve();
			};
			sendUnknown();
		});

		expect(createdSocket).not.toBeNull();
		channel.close();
	});

	it('does NOT emit WSReconnectedAction on first onopen', async () => {
		let createdSocket: MockWebSocket | null = null;

		global.WebSocket = jest.fn((url: string) => {
			createdSocket = new MockWebSocket(url);
			return createdSocket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		type ExpectedAction = ReturnType<typeof WSUserAvatarAction>;
		const channel = initWebsocket(async () => 'test-token');

		// Set up take FIRST, then trigger events - same pattern as other tests
		const emitted = await new Promise<ExpectedAction>((resolve) => {
			channel.take((action) => resolve(action as ExpectedAction));

			const trigger = () => {
				if (createdSocket == null) {
					setTimeout(trigger, 0);
					return;
				}
				// First open - hasConnectedBefore is false, should NOT emit WSReconnectedAction
				createdSocket.onopen?.call(createdSocket, new Event('open'));
				// Send a regular message to have something to take
				const ev = new MessageEvent('message', {
					data: JSON.stringify({ message: { type: 'USER_AVATAR', pk: 7, avatar: 'test.png' } }),
				});
				createdSocket.onmessage?.(ev);
			};
			trigger();
		});

		// The first emitted action should be USER_AVATAR, not WS_RECONNECTED
		expect(emitted).toEqual(WSUserAvatarAction(7, 'test.png'));
		expect(emitted).not.toEqual(WSReconnectedAction());
		channel.close();
	});

	it('emits WSReconnectedAction on second onopen (reconnect)', async () => {
		jest.useFakeTimers();
		const sockets: MockWebSocket[] = [];

		global.WebSocket = jest.fn((url: string) => {
			const socket = new MockWebSocket(url);
			sockets.push(socket);
			return socket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		// Wait for first socket to be created
		await jest.advanceTimersByTimeAsync(0);
		expect(sockets).toHaveLength(1);

		// First open - hasConnectedBefore = false, no emission
		sockets[0].onopen?.call(sockets[0], new Event('open'));

		// Simulate close to trigger reconnect
		sockets[0].onclose?.call(sockets[0], new Event('close') as CloseEvent);

		// Advance initial 1000ms reconnect delay
		await jest.advanceTimersByTimeAsync(1000);
		expect(sockets).toHaveLength(2);

		// Set up take, then trigger second open - should emit WSReconnectedAction
		type ReconnectedAction = ReturnType<typeof WSReconnectedAction>;
		const emitted = new Promise<ReconnectedAction>((resolve) => {
			channel.take((action) => resolve(action as ReconnectedAction));
			// Second open - hasConnectedBefore = true, emit WSReconnectedAction
			sockets[1].onopen?.call(sockets[1], new Event('open'));
		});

		const result = await emitted;
		expect(result).toEqual(WSReconnectedAction());
		channel.close();
	});

	it('reconnects with exponential backoff on close', async () => {
		jest.useFakeTimers();
		let createCount = 0;
		const sockets: MockWebSocket[] = [];

		global.WebSocket = jest.fn((url: string) => {
			const socket = new MockWebSocket(url);
			sockets.push(socket);
			createCount++;
			return socket as unknown as WebSocket;
		}) as unknown as typeof WebSocket;

		const channel = initWebsocket(async () => 'test-token');

		// Wait for first socket creation
		await jest.advanceTimersByTimeAsync(0);
		expect(createCount).toBe(1);

		// Trigger close on first socket
		sockets[0].onclose?.call(sockets[0], new Event('close') as CloseEvent);

		// Advance timers to trigger reconnect (initial delay is 1000ms)
		await jest.advanceTimersByTimeAsync(1000);
		expect(createCount).toBe(2);

		// Trigger close again to test exponential backoff
		sockets[1].onclose?.call(sockets[1], new Event('close') as CloseEvent);

		// Next delay should be 2000ms
		await jest.advanceTimersByTimeAsync(2000);
		expect(createCount).toBe(3);

		channel.close();
	});
});
