import type { NotificationType } from '@/types/notificationTypes';
import * as types from './index';
import {
	WSMaintenanceAction,
	WSReconnectedAction,
	WSUserAvatarAction,
	WSNotificationAction,
	initMaintenanceAction,
	startWSAction,
	stopWSAction,
} from './wsActions';

describe('Ws Actions', () => {
	describe('WSUserAvatarAction', () => {
		it('should create WS_USER_AVATAR action with pk and avatar', () => {
			const pk = 123;
			const avatar = 'avatar.png';

			const action = WSUserAvatarAction(pk, avatar);

			expect(action).toEqual({
				type: types.WS_USER_AVATAR,
				pk,
				avatar,
			});
		});
	});

	describe('WSMaintenanceAction', () => {
		it('should create WS_MAINTENANCE action with maintenance boolean', () => {
			const maintenance = true;

			const action = WSMaintenanceAction(maintenance);

			expect(action).toEqual({
				type: types.WS_MAINTENANCE,
				maintenance,
			});
		});
	});

	describe('WSReconnectedAction', () => {
		it('should create WS_RECONNECTED action', () => {
			const action = WSReconnectedAction();
			expect(action).toEqual({ type: types.WS_RECONNECTED });
		});
	});

	it.each([true, false])(
		'keeps maintenance %s at the original top level and omits an absent version',
		(maintenance) => {
			const action = WSMaintenanceAction(maintenance);
			expect(action).toEqual({ type: 'WS_MAINTENANCE', maintenance });
			expect(action).not.toHaveProperty('version');
		},
	);

	it('preserves a supplied server version without changing the maintenance flag', () => {
		expect(WSMaintenanceAction(false, '3.6.3')).toEqual({
			type: 'WS_MAINTENANCE',
			maintenance: false,
			version: '3.6.3',
		});
	});

	it.each([
		[initMaintenanceAction, 'INIT_MAINTENANCE'],
		[startWSAction, 'WS_START'],
		[stopWSAction, 'WS_STOP'],
		[WSReconnectedAction, 'WS_RECONNECTED'],
	] as const)('preserves the socket lifecycle wire name for %s', (createAction, type) => {
		expect(createAction()).toEqual({ type });
	});

	it('preserves the full notification under notification rather than a Redux payload field', () => {
		const notification: NotificationType = {
			id: 12,
			title: 'Stock minimum',
			message: 'Article disponible: 2',
			notification_type: 'low_stock',
			object_id: 4,
			target_url: '/dashboard/stock?company_id=2',
			is_read: false,
			date_created: '2026-10-15T10:00:00Z',
		};
		const action = WSNotificationAction(notification);
		expect(action).toEqual({ type: 'WS_NOTIFICATION', notification });
		expect(action.notification).toBe(notification);
	});
});
