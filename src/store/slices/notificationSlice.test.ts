import type { NotificationType } from '@/types/facturationTypes';
import { initToken } from '@/store/slices/_initSlice';
import reducer, { incrementUnreadCount, setLatestNotification, setUnreadCount } from './notificationSlice';

describe('notification slice', () => {
	const sampleNotification: NotificationType = {
		id: 1,
		title: 'Facture en retard',
		message: 'La facture FAC-001 est en retard.',
		notification_type: 'overdue_invoice',
		object_id: 10,
		is_read: false,
		date_created: '2026-04-01T10:00:00Z',
	};

	it('returns the initial state when given undefined state', () => {
		expect(reducer(undefined, { type: '@@INIT' })).toEqual({
			unreadCount: 0,
			latestNotification: null,
		});
	});

	it('setUnreadCount sets the unread count', () => {
		expect(reducer(undefined, setUnreadCount(5)).unreadCount).toBe(5);
	});

	it('incrementUnreadCount increments the count by one', () => {
		const state = { unreadCount: 2, latestNotification: null };
		expect(reducer(state, incrementUnreadCount()).unreadCount).toBe(3);
	});

	it('setLatestNotification stores the latest notification', () => {
		expect(reducer(undefined, setLatestNotification(sampleNotification)).latestNotification).toEqual(
			sampleNotification,
		);
	});

	it('setLatestNotification overwrites the previous notification', () => {
		const next = reducer(
			{ unreadCount: 1, latestNotification: sampleNotification },
			setLatestNotification({ ...sampleNotification, id: 2, notification_type: 'expiring_quote' }),
		);

		expect(next.latestNotification?.id).toBe(2);
		expect(next.latestNotification?.notification_type).toBe('expiring_quote');
	});
});
it('clears the previous account notification count and popup on logout', () => {
	let state = reducer(undefined, setUnreadCount(4));
	state = reducer(state, incrementUnreadCount());
	state = reducer(
		state,
		setLatestNotification({
			id: 3,
			title: 'Stock',
			message: '',
			notification_type: 'low_stock',
			object_id: null,
			is_read: false,
			date_created: '2026-10-14T12:00:00Z',
		}),
	);
	expect(state.unreadCount).toBe(5);
	expect(reducer(state, initToken())).toEqual({ unreadCount: 0, latestNotification: null });
});
